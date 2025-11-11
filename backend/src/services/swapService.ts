import axios from 'axios'
import { logger } from '../utils/logger'

// SideShift API base URL
// Try multiple possible endpoints
const SIDESHIFT_API_BASE = process.env.SIDESHIFT_API_URL || 'https://api.sideshift.ai/v2'

// SideShift API interfaces
interface SideShiftQuote {
  quoteId: string
  depositCoin: string
  depositNetwork: string
  settleCoin: string
  settleNetwork: string
  depositAmount: string
  settleAmount: string
  rate: string
  fee: string
  depositMin: string
  depositMax: string
  settleMin: string
  settleMax: string
  expiresAt: string
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
  network: string
  name: string
  symbol: string
  status: 'available' | 'unavailable'
  min: string
  max: string
  decimals: number
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
    this.sideshiftSecret = process.env.SIDESHIFT_API_KEY || 
                          process.env.X_SIDESHIFT_SECRET || 
                          process.env.SIDESHIFT_SECRET || 
                          ''
    this.affiliateId = process.env.SIDESHIFT_AFFILIATE_ID || ''
    
    // Debug logging
    logger.info(`SideShift API Key found: ${this.sideshiftSecret ? 'Yes (length: ' + this.sideshiftSecret.length + ')' : 'No'}`)
    logger.info(`SideShift Affiliate ID: ${this.affiliateId || 'Not set'}`)
    
    // Create axios instance with SideShift API headers
    this.axiosInstance = axios.create({
      baseURL: SIDESHIFT_API_BASE,
      headers: {
        'Content-Type': 'application/json',
        ...(this.sideshiftSecret && { 'x-sideshift-secret': this.sideshiftSecret })
      },
      timeout: 30000
    })

    if (!this.sideshiftSecret) {
      logger.error('SideShift API secret not configured. Please set SIDESHIFT_API_KEY in your .env file.')
      logger.error('Get your API key from: https://sideshift.ai/settings/api')
      logger.error('Current env vars:', {
        SIDESHIFT_API_KEY: process.env.SIDESHIFT_API_KEY ? 'set' : 'not set',
        X_SIDESHIFT_SECRET: process.env.X_SIDESHIFT_SECRET ? 'set' : 'not set',
        SIDESHIFT_SECRET: process.env.SIDESHIFT_SECRET ? 'set' : 'not set'
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
        throw new Error('SideShift API secret not configured. Please set SIDESHIFT_API_KEY in your .env file.')
      }

      logger.info(`Getting quote: ${params.amount} ${params.fromToken} (${params.fromNetwork}) → ${params.toToken} (${params.toNetwork})`)

      // Call SideShift API to get quote
      const response = await this.axiosInstance.get('/quotes', {
        params: {
          depositCoin: params.fromToken,
          depositNetwork: params.fromNetwork,
          settleCoin: params.toToken,
          settleNetwork: params.toNetwork,
          depositAmount: params.amount,
          affiliateId: this.affiliateId || undefined
        }
      })

      const quote: SideShiftQuote = response.data

      // Create fixed shift to get deposit address
      const shiftResponse = await this.axiosInstance.post('/shifts/fixed', {
        quoteId: quote.quoteId,
        settleAddress: params.settleAddress,
        affiliateId: this.affiliateId || undefined
      })

      const shift: SideShiftShift = shiftResponse.data

      return {
        quoteId: quote.quoteId,
        fromToken: quote.depositCoin,
        fromNetwork: quote.depositNetwork,
        toToken: quote.settleCoin,
        toNetwork: quote.settleNetwork,
        amountIn: quote.depositAmount,
        amountOut: quote.settleAmount,
        rate: quote.rate,
        fee: quote.fee,
        depositAddress: shift.depositAddress,
        expiresAt: new Date(quote.expiresAt).getTime(),
        minAmount: quote.depositMin,
        maxAmount: quote.depositMax
      }
    } catch (error: any) {
      logger.error('Error getting SideShift quote:', error.response?.data || error.message)
      
      // Provide helpful error messages
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Cannot connect to SideShift API. Please check your internet connection and DNS settings.')
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid swap parameters')
      } else if (error.response?.status === 401) {
        throw new Error('Invalid SideShift API credentials')
      } else if (error.response?.status === 404) {
        throw new Error('Swap pair not available')
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again')
      }
      
      throw new Error(`Failed to get swap quote: ${error.response?.data?.message || error.message}`)
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
        throw new Error('SideShift API secret not configured. Please set SIDESHIFT_API_KEY in your .env file.')
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
        throw new Error('SideShift API secret not configured. Please set SIDESHIFT_API_KEY in your .env file.')
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
   * Get available coins/networks from SideShift
   * @returns List of supported tokens
   */
  async getSupportedTokens(): Promise<TokenInfo[]> {
    this.initialize()
    if (!this.sideshiftSecret) {
      throw new Error('SideShift API secret not configured. Please set SIDESHIFT_API_KEY in your .env file.')
    }

    try {
      const response = await this.axiosInstance.get('/coins')
      const coins: SideShiftCoin[] = response.data

      if (!Array.isArray(coins)) {
        throw new Error('Invalid response from SideShift API')
      }

      // Filter only available coins and map to our format
      const availableCoins = coins
        .filter(coin => coin.status === 'available')
        .map(coin => ({
          coin: coin.coin,
          network: coin.network,
          name: coin.name,
          symbol: coin.symbol,
          status: coin.status,
          min: coin.min,
          max: coin.max,
          decimals: coin.decimals
        }))

      if (availableCoins.length === 0) {
        throw new Error('No available tokens found from SideShift API')
      }

      return availableCoins
    } catch (error: any) {
      logger.error('Error getting supported tokens:', error.response?.data || error.message)
      
      // Provide helpful error messages
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Cannot connect to SideShift API. Please check your internet connection and DNS settings.')
      }
      
      throw new Error(`Failed to get supported tokens from SideShift: ${error.response?.data?.message || error.message}`)
    }
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
