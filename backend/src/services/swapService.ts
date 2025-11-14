import axios from 'axios'
import http from 'http'
import https from 'https'
import dns from 'dns'
import { logger } from '../utils/logger'

// SideShift API base URL
// According to SideShift.ai documentation: https://docs.sideshift.ai/api-intro/getting-started/
// The correct base URL is https://sideshift.ai/api/v2 (no trailing slash)
const SIDESHIFT_API_BASE = process.env.SIDESHIFT_API_URL || 'https://sideshift.ai/api/v2'

// SideShift API interfaces
interface SideShiftQuote {
  id?: string  // v2 API uses 'id'
  quoteId?: string  // v1 API uses 'quoteId'
  depositCoin: string
  depositNetwork: string
  settleCoin: string
  settleNetwork: string
  depositAmount?: string
  settleAmount?: string
  rate?: string
  fee?: string
  depositMin?: string
  depositMax?: string
  settleMin?: string
  settleMax?: string
  expiresAt: string
  createdAt?: string
}

interface SideShiftShift {
  id: string
  type: 'fixed' | 'variable'
  status: 'awaiting_deposit' | 'deposit_received' | 'processing' | 'complete' | 'refunded' | 'failed'
  depositCoin: string
  depositNetwork: string
  settleCoin: string
  settleNetwork: string
  depositAmount: string
  settleAmount: string
  depositAddress: string
  settleAddress: string
  rate: string
  fee: string
  createdAt: string
  updatedAt: string
  expiresAt?: string
  depositTxHash?: string
  settleTxHash?: string
}

interface SideShiftCoin {
  coin: string
  networks: string[]
  name: string
  mainnet?: string
  tokenDetails?: {
    [network: string]: {
      contractAddress: string
      decimals: number
    }
  }
  depositOffline?: boolean
  settleOffline?: boolean
  fixedOnly?: boolean
  variableOnly?: boolean | string[]
}

interface SideShiftCoinsResponse {
  data: SideShiftCoin[]
  Count: number
}

// Our application interfaces
export interface SwapQuote {
  quoteId: string
  fromToken: string
  fromNetwork: string
  toToken: string
  toNetwork: string
  amountIn: string
  amountOut: string
  rate: string
  fee: string
  depositAddress?: string
  expiresAt: number
  minAmount: string
  maxAmount: string
}

export interface ShiftStatus {
  shiftId: string
  status: 'awaiting_deposit' | 'deposit_received' | 'processing' | 'complete' | 'refunded' | 'failed'
  depositCoin: string
  depositNetwork: string
  settleCoin: string
  settleNetwork: string
  depositAmount: string
  settleAmount: string
  depositAddress: string
  settleAddress: string
  depositTxHash?: string
  settleTxHash?: string
  createdAt: number
  updatedAt: number
  expiresAt?: number
}

export interface TokenInfo {
  coin: string
  network: string
  name: string
  symbol: string
  status: 'available' | 'unavailable'
  min: string
  max: string
  decimals: number
}

class SwapService {
  private sideshiftSecret: string | null = null
  private affiliateId: string | null = null
  private axiosInstance: any = null
  private initialized: boolean = false

  /**
   * Initialize or get the API configuration (lazy loading)
   */
  private initialize() {
    if (this.initialized) return

    // Check for API key in multiple possible env variable names
    // According to docs: https://docs.sideshift.ai/api-intro/getting-started/
    // The official env var name is SIDESHIFT_SECRET, but we support alternatives for flexibility
    this.sideshiftSecret = process.env.SIDESHIFT_SECRET || 
                          process.env.SIDESHIFT_API_KEY || 
                          process.env.X_SIDESHIFT_SECRET || 
                          ''
    this.affiliateId = process.env.SIDESHIFT_AFFILIATE_ID || ''
    
    // Debug logging
    logger.info(`SideShift API Key found: ${this.sideshiftSecret ? 'Yes (length: ' + this.sideshiftSecret.length + ')' : 'No'}`)
    logger.info(`SideShift Affiliate ID: ${this.affiliateId || 'Not set'}`)
    
    // Create axios instance with SideShift API headers
    // Note: Increased timeout and added DNS resolution settings for production hosting platforms
    // Use IPv4 family to avoid DNS resolution issues on some hosting platforms (Render, Vercel, etc.)
    const lookup = (
      hostname: string,
      options: dns.LookupOptions,
      callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void
    ) => {
      // Try IPv4 first (more reliable on hosting platforms)
      // Ensure all is false to get single address as string
      dns.lookup(hostname, { family: 4, all: false, ...options }, (err, address, family) => {
        if (err) {
          logger.warn(`DNS lookup (IPv4) failed for ${hostname}, trying fallback:`, err.message)
          // Fallback: try without family restriction
          dns.lookup(hostname, { all: false, ...options }, callback)
        } else {
          // address will be string when all: false
          callback(null, address as string, family || 4)
        }
      })
    }

    this.axiosInstance = axios.create({
      baseURL: SIDESHIFT_API_BASE,
      headers: {
        'Content-Type': 'application/json',
        ...(this.sideshiftSecret && { 'x-sideshift-secret': this.sideshiftSecret })
      },
      timeout: 30000,
      // Add keep-alive for better connection reuse and custom DNS lookup
      httpAgent: new http.Agent({ 
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 10,
        maxFreeSockets: 5,
        lookup: lookup as any
      }),
      httpsAgent: new https.Agent({ 
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 10,
        maxFreeSockets: 5,
        lookup: lookup as any
      })
    })

    if (!this.sideshiftSecret) {
      logger.error('SideShift API secret not configured. Please set SIDESHIFT_SECRET in your .env file.')
      logger.error('Get your Private Key from: https://sideshift.ai/settings/api')
      logger.error('According to docs: https://docs.sideshift.ai/api-intro/getting-started/')
      logger.error('Current env vars:', {
        SIDESHIFT_SECRET: process.env.SIDESHIFT_SECRET ? 'set' : 'not set',
        SIDESHIFT_API_KEY: process.env.SIDESHIFT_API_KEY ? 'set' : 'not set',
        X_SIDESHIFT_SECRET: process.env.X_SIDESHIFT_SECRET ? 'set' : 'not set'
      })
    } else {
      logger.info('✅ SideShift API configured successfully')
      if (this.affiliateId) {
        logger.info(`✅ SideShift Affiliate ID: ${this.affiliateId}`)
      }
    }

    this.initialized = true
  }

  /**
   * Get swap quote from SideShift API
   * @param params Swap parameters
   * @returns SideShift quote with deposit address
   */
  async getSwapQuote(params: {
    fromToken: string
    fromNetwork: string
    toToken: string
    toNetwork: string
    amount: string
    settleAddress: string
  }): Promise<SwapQuote> {
    this.initialize()
    try {
      if (!this.sideshiftSecret) {
        throw new Error('SideShift API secret not configured. Please set SIDESHIFT_SECRET in your .env file. See: https://docs.sideshift.ai/api-intro/getting-started/')
      }

      logger.info(`Getting quote: ${params.amount} ${params.fromToken} (${params.fromNetwork}) → ${params.toToken} (${params.toNetwork})`)

      // Call SideShift API to get quote (POST request according to docs)
      const response = await this.axiosInstance.post('/quotes', {
        depositCoin: params.fromToken,
        depositNetwork: params.fromNetwork,
        settleCoin: params.toToken,
        settleNetwork: params.toNetwork,
        depositAmount: params.amount,
        affiliateId: this.affiliateId || undefined
      })

      // Handle response - could be direct or wrapped
      let quoteData: any
      if (response.data && (response.data.id || response.data.quoteId || response.data.depositCoin)) {
        quoteData = response.data
      } else if (response.data && response.data.data && (response.data.data.id || response.data.data.quoteId)) {
        quoteData = response.data.data
      } else {
        logger.error('Unexpected quote response structure:', JSON.stringify(response.data).substring(0, 500))
        throw new Error('Invalid response format from SideShift API')
      }

      // Extract quote ID (v2 uses 'id', v1 uses 'quoteId')
      const quoteId = quoteData.id || quoteData.quoteId
      if (!quoteId) {
        logger.error('Quote response missing ID:', JSON.stringify(quoteData).substring(0, 500))
        throw new Error('Quote response missing ID field')
      }

      // SideShift v2 quote response may not include all fields immediately
      // We need to use the quoteId to get full quote details or use what's available
      const quote: SideShiftQuote = {
        id: quoteData.id,
        quoteId: quoteId,
        depositCoin: quoteData.depositCoin,
        depositNetwork: quoteData.depositNetwork,
        settleCoin: quoteData.settleCoin,
        settleNetwork: quoteData.settleNetwork,
        depositAmount: quoteData.depositAmount || params.amount, // Use requested amount if not in response
        settleAmount: quoteData.settleAmount || '0', // Will be updated when shift is created
        rate: quoteData.rate || '0',
        fee: quoteData.fee || '0',
        depositMin: quoteData.depositMin || quoteData.depositRangeMin || '0',
        depositMax: quoteData.depositMax || quoteData.depositRangeMax || '0',
        settleMin: quoteData.settleMin || '0',
        settleMax: quoteData.settleMax || '0',
        expiresAt: quoteData.expiresAt,
        createdAt: quoteData.createdAt
      }

      // Return quote without creating shift - shift creation is separate
      return {
        quoteId: quoteId,
        fromToken: quote.depositCoin,
        fromNetwork: quote.depositNetwork,
        toToken: quote.settleCoin,
        toNetwork: quote.settleNetwork,
        amountIn: quote.depositAmount || params.amount,
        amountOut: quote.settleAmount || '0', // Will be calculated when shift is created
        rate: quote.rate || '0',
        fee: quote.fee || '0',
        depositAddress: undefined, // Will be provided when shift is created
        expiresAt: new Date(quote.expiresAt).getTime(),
        minAmount: quote.depositMin || '0',
        maxAmount: quote.depositMax || '0'
      }
    } catch (error: any) {
      logger.error('Error getting SideShift quote:', error.response?.data || error.message)
      
      // Provide helpful error messages
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Cannot connect to SideShift API. Please check your internet connection and DNS settings.')
      } else if (error.response?.status === 400) {
        const errorData = error.response.data
        if (errorData?.error?.message) {
          // Handle SideShift API error format
          const errorMsg = errorData.error.message
          if (errorMsg.includes('Amount too low') || errorMsg.includes('Minimum')) {
            const minAmount = errorData.error.depositRangeMin || errorData.error.min
            const maxAmount = errorData.error.depositRangeMax || errorData.error.max
            throw new Error(`Amount too low. Minimum: ${minAmount} ${params.fromToken}. Maximum: ${maxAmount} ${params.fromToken}`)
          }
          if (errorMsg.includes('Amount too high') || errorMsg.includes('Maximum')) {
            const minAmount = errorData.error.depositRangeMin || errorData.error.min
            const maxAmount = errorData.error.depositRangeMax || errorData.error.max
            throw new Error(`Amount too high. Minimum: ${minAmount} ${params.fromToken}. Maximum: ${maxAmount} ${params.fromToken}`)
          }
          throw new Error(errorMsg)
        }
        throw new Error(errorData?.message || 'Invalid swap parameters')
      } else if (error.response?.status === 401) {
        throw new Error('Invalid SideShift API credentials')
      } else if (error.response?.status === 404) {
        throw new Error('Swap pair not available')
      } else if (error.response?.status === 500) {
        // Handle 500 errors that might contain useful error info
        const errorData = error.response.data
        if (errorData?.error?.message) {
          const errorMsg = errorData.error.message
          if (errorMsg.includes('Amount too low') || errorMsg.includes('Minimum')) {
            const minAmount = errorData.error.depositRangeMin || errorData.error.min
            const maxAmount = errorData.error.depositRangeMax || errorData.error.max
            throw new Error(`Amount too low. Minimum: ${minAmount} ${params.fromToken}. Maximum: ${maxAmount} ${params.fromToken}`)
          }
          if (errorMsg.includes('Amount too high') || errorMsg.includes('Maximum')) {
            const minAmount = errorData.error.depositRangeMin || errorData.error.min
            const maxAmount = errorData.error.depositRangeMax || errorData.error.max
            throw new Error(`Amount too high. Minimum: ${minAmount} ${params.fromToken}. Maximum: ${maxAmount} ${params.fromToken}`)
          }
          throw new Error(errorMsg)
        }
        throw new Error('SideShift API error. Please try again or check the swap parameters.')
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again')
      }
      
      throw new Error(`Failed to get swap quote: ${error.response?.data?.message || error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Create a new fixed shift
   * @param params Shift parameters
   * @returns Created shift with deposit address
   */
  async createShift(params: {
    quoteId: string
    settleAddress: string
  }): Promise<ShiftStatus> {
    this.initialize()
    try {
      if (!this.sideshiftSecret) {
        throw new Error('SideShift API secret not configured. Please set SIDESHIFT_SECRET in your .env file. See: https://docs.sideshift.ai/api-intro/getting-started/')
      }

      logger.info(`Creating shift with quote: ${params.quoteId}`)

      const response = await this.axiosInstance.post('/shifts/fixed', {
        quoteId: params.quoteId,
        settleAddress: params.settleAddress,
        affiliateId: this.affiliateId || undefined
      })

      const shift: SideShiftShift = response.data

      return this.mapShiftToStatus(shift)
    } catch (error: any) {
      logger.error('Error creating shift:', error.response?.data || error.message)
      
      // Provide helpful error messages
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Cannot connect to SideShift API. Please check your internet connection and DNS settings.')
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid shift parameters')
      } else if (error.response?.status === 401) {
        throw new Error('Invalid SideShift API credentials')
      } else if (error.response?.status === 404) {
        throw new Error('Quote not found or expired')
      }
      
      throw new Error(`Failed to create shift: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get shift status
   * @param shiftId Shift ID
   * @returns Current shift status
   */
  async getShiftStatus(shiftId: string): Promise<ShiftStatus> {
    this.initialize()
    try {
      if (!this.sideshiftSecret) {
        throw new Error('SideShift API secret not configured. Please set SIDESHIFT_SECRET in your .env file. See: https://docs.sideshift.ai/api-intro/getting-started/')
      }

      const response = await this.axiosInstance.get(`/shifts/${shiftId}`)
      const shift: SideShiftShift = response.data

      return this.mapShiftToStatus(shift)
    } catch (error: any) {
      logger.error('Error getting shift status:', error.response?.data || error.message)
      throw new Error(`Failed to get shift status: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get available coins/networks from SideShift with retry logic
   * @returns List of supported tokens
   */
  async getSupportedTokens(): Promise<TokenInfo[]> {
    this.initialize()
    if (!this.sideshiftSecret) {
      throw new Error('SideShift API secret not configured. Please set SIDESHIFT_SECRET in your .env file. See: https://docs.sideshift.ai/api-intro/getting-started/')
    }

    // Retry logic for DNS/network issues (common on hosting platforms)
    const maxRetries = 3
    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting to fetch tokens from SideShift (attempt ${attempt}/${maxRetries})...`)
        const response = await this.axiosInstance.get('/coins')
      
      // SideShift API returns: { data: [...coins], Count: number }
      let coins: SideShiftCoin[]
      if (response.data && Array.isArray(response.data)) {
        // Direct array response
        coins = response.data
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Wrapped response: { data: [...], Count: ... }
        coins = response.data.data
      } else {
        logger.error('Unexpected response structure:', JSON.stringify(response.data).substring(0, 200))
        throw new Error('Invalid response format from SideShift API')
      }

      if (!Array.isArray(coins) || coins.length === 0) {
        throw new Error('No coins returned from SideShift API')
      }

      // Flatten coins: create one entry per coin-network combination
      const availableCoins: TokenInfo[] = []
      
      for (const coin of coins) {
        // Skip coins that are offline or restricted
        if (coin.depositOffline && coin.settleOffline) {
          continue
        }
        
        // Process each network for this coin
        for (const network of coin.networks || []) {
          // Skip if this network is variable-only and coin is fixed-only (or vice versa)
          if (coin.fixedOnly && Array.isArray(coin.variableOnly) && coin.variableOnly.includes(network)) {
            continue
          }
          if (coin.variableOnly === true && !coin.fixedOnly) {
            // Variable only coins might need special handling, but include them for now
          }
          
          // Get decimals from tokenDetails or use defaults
          const tokenDetail = coin.tokenDetails?.[network]
          const decimals = tokenDetail?.decimals || 18 // Default to 18 for most tokens
          
          // Use coin symbol as symbol (or coin name if no symbol)
          const symbol = coin.coin
          
          availableCoins.push({
            coin: coin.coin,
            network: network,
            name: coin.name,
            symbol: symbol,
            status: 'available', // All coins in the response are available
            min: '0.0001', // Default min - actual min/max will be validated by quote endpoint
            max: '1000000', // Default max - actual min/max will be validated by quote endpoint
            decimals: decimals
          })
        }
      }

      if (availableCoins.length === 0) {
        throw new Error('No available tokens found from SideShift API')
      }

        return availableCoins
      } catch (error: any) {
        lastError = error
        logger.warn(`Attempt ${attempt} failed:`, error.code || error.message)
        
        // If it's a DNS/network error and we have retries left, wait and retry
        if ((error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'EAI_AGAIN') && attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff, max 5s
          logger.info(`Retrying in ${waitTime}ms...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
        
        // If it's the last attempt or not a retryable error, throw
        if (attempt === maxRetries) {
          logger.error('All retry attempts failed. Error details:', {
            code: error.code,
            message: error.message,
            response: error.response?.data,
            hostname: error.hostname || 'sideshift.ai'
          })
          
          // Provide helpful error messages
          if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
            throw new Error('Cannot resolve SideShift API domain. This may be a DNS or network configuration issue on your hosting platform. Please check Render/Vercel network settings or contact support.')
          } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            throw new Error('Cannot connect to SideShift API. Please check your internet connection and DNS settings.')
          }
          
          throw new Error(`Failed to get supported tokens from SideShift after ${maxRetries} attempts: ${error.response?.data?.message || error.message}`)
        }
      }
    }
    
    // This should never be reached, but TypeScript needs it
    throw new Error(`Failed to get supported tokens: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Save swap to database
   */
  async saveSwap(userId: string, shift: ShiftStatus): Promise<void> {
    try {
      const { db } = await import('../database/db')
      await db.query(
        `INSERT INTO swaps (
          user_id, shift_id, from_token, from_network, to_token, to_network,
          amount_in, amount_out, rate, fee, deposit_address, settle_address,
          status, deposit_tx_hash, settle_tx_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (shift_id) DO UPDATE SET
          status = EXCLUDED.status,
          deposit_tx_hash = EXCLUDED.deposit_tx_hash,
          settle_tx_hash = EXCLUDED.settle_tx_hash,
          updated_at = CURRENT_TIMESTAMP,
          completed_at = CASE WHEN EXCLUDED.status = 'complete' THEN CURRENT_TIMESTAMP ELSE swaps.completed_at END`,
        [
          userId,
          shift.shiftId,
          shift.depositCoin,
          shift.depositNetwork,
          shift.settleCoin,
          shift.settleNetwork,
          shift.depositAmount,
          shift.settleAmount,
          parseFloat(shift.depositAmount) / parseFloat(shift.settleAmount),
          '0', // Fee calculated separately
          shift.depositAddress,
          shift.settleAddress,
          shift.status,
          shift.depositTxHash || null,
          shift.settleTxHash || null,
        ]
      )
    } catch (error: any) {
      logger.error('Error saving swap:', error)
      // Don't throw - swap should still work even if DB save fails
    }
  }

  /**
   * Get swap history (stored shifts)
   */
  async getSwapHistory(userId: string, limit: number, offset: number): Promise<ShiftStatus[]> {
    try {
      const { db } = await import('../database/db')
      const result = await db.query(
        `SELECT * FROM swaps
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      )

      return result.rows.map((row) => ({
        shiftId: row.shift_id,
        status: row.status,
        depositCoin: row.from_token,
        depositNetwork: row.from_network,
        settleCoin: row.to_token,
        settleNetwork: row.to_network,
        depositAmount: row.amount_in.toString(),
        settleAmount: row.amount_out.toString(),
        depositAddress: row.deposit_address,
        settleAddress: row.settle_address,
        depositTxHash: row.deposit_tx_hash,
        settleTxHash: row.settle_tx_hash,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
        completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
      }))
    } catch (error: any) {
      logger.error('Error getting swap history:', error)
      throw new Error('Failed to get swap history')
    }
  }

  /**
   * Map SideShift shift to our ShiftStatus format
   */
  private mapShiftToStatus(shift: SideShiftShift): ShiftStatus {
    return {
      shiftId: shift.id,
      status: shift.status,
      depositCoin: shift.depositCoin,
      depositNetwork: shift.depositNetwork,
      settleCoin: shift.settleCoin,
      settleNetwork: shift.settleNetwork,
      depositAmount: shift.depositAmount,
      settleAmount: shift.settleAmount,
      depositAddress: shift.depositAddress,
      settleAddress: shift.settleAddress,
      depositTxHash: shift.depositTxHash,
      settleTxHash: shift.settleTxHash,
      createdAt: new Date(shift.createdAt).getTime(),
      updatedAt: new Date(shift.updatedAt).getTime(),
      expiresAt: shift.expiresAt ? new Date(shift.expiresAt).getTime() : undefined
    }
  }

}

export const swapService = new SwapService()
