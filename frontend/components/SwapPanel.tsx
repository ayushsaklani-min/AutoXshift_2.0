'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowUpDown, 
  Zap, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  ExternalLink,
  QrCode
} from 'lucide-react'
import { formatTokenAmount, formatUSD } from '@/lib/utils'
import { swapApi } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import { authenticateWallet, getToken } from '@/lib/auth'

interface Token {
  coin: string
  network: string
  name: string
  symbol: string
  status: 'available' | 'unavailable'
  min: string
  max: string
  decimals: number
}

interface SwapQuote {
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

interface ShiftStatus {
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

export function SwapPanel() {
  const { address } = useAccount()
  const [tokens, setTokens] = useState<Token[]>([])
  const [fromToken, setFromToken] = useState<Token | null>(null)
  const [toToken, setToToken] = useState<Token | null>(null)
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null)
  const [activeShift, setActiveShift] = useState<ShiftStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Authenticate and setup WebSocket on mount
  useEffect(() => {
    if (!address) return

    const setupAuthAndWebSocket = async () => {
      try {
        // Authenticate with wallet
        const token = getToken()
        if (!token && address) {
          await authenticateWallet(address)
        }

        // Connect WebSocket
        const currentToken = getToken()
        if (currentToken) {
          await wsClient.connect(currentToken)
          
          // Listen for swap updates
          wsClient.onMessage((message) => {
            if (message.type === 'broadcast' && message.channel.startsWith('swap:')) {
              const shiftId = message.channel.replace('swap:', '')
              if (activeShift?.shiftId === shiftId) {
                setActiveShift(message.data.shift)
              }
            } else if (message.type === 'message' && message.data.type === 'swap_created') {
              setActiveShift(message.data.shift)
            }
          })
        }
      } catch (err) {
        console.error('Error setting up auth/websocket:', err)
      }
    }

    setupAuthAndWebSocket()

    return () => {
      // Cleanup on unmount
    }
  }, [address])

  // Fetch supported tokens from SideShift API only
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log('[SwapPanel] Fetching tokens...')
        const data = await swapApi.getTokens()
        console.log('[SwapPanel] Tokens received:', data?.success ? `${data.data?.length || 0} tokens` : 'Failed', data)
        
        // If we get tokens, use them
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setTokens(data.data)
          setError(null)
          
          // Set default tokens
          const btc = data.data.find((t: Token) => t.coin === 'BTC' && t.network === 'BTC')
          const eth = data.data.find((t: Token) => t.coin === 'ETH' && t.network === 'ETH')
          if (btc) setFromToken(btc)
          if (eth) setToToken(eth)
        } else {
          setError('No tokens available from SideShift API. Please check your API configuration.')
        }
      } catch (err: any) {
        console.error('[SwapPanel] Failed to fetch tokens:', err)
        console.error('[SwapPanel] Error details:', {
          message: err.message,
          status: err.status,
          data: err.data,
          stack: err.stack
        })
        // Extract error message from API response
        let errorMessage = 'Failed to load tokens from SideShift API'
        if (err.message) {
          errorMessage = err.message
        } else if (err.data?.message) {
          errorMessage = err.data.message
        } else if (err.data?.error) {
          errorMessage = err.data.error
        }
        
        // Provide more specific error messages based on error type
        if (errorMessage.includes('DNS') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('resolve')) {
          errorMessage = 'DNS resolution failed. The backend cannot reach SideShift API. This may be a hosting platform network configuration issue.'
        } else if (errorMessage.includes('Network error') || errorMessage.includes('fetch')) {
          errorMessage = 'Cannot connect to backend API. Please check if the backend is running and accessible.'
        }
        
        setError(`Cannot load tokens: ${errorMessage}`)
        setTokens([]) // Clear tokens on error
      } finally {
        setIsLoading(false)
      }
    }
    fetchTokens()
  }, [])

  // Countdown timer for quote expiration
  useEffect(() => {
    if (!swapQuote || !swapQuote.expiresAt) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, swapQuote.expiresAt - Date.now())
      setTimeRemaining(remaining)
      if (remaining === 0) {
        setSwapQuote(null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [swapQuote])

  // Subscribe to WebSocket updates for active shift
  useEffect(() => {
    if (!activeShift || activeShift.status === 'complete' || activeShift.status === 'failed' || activeShift.status === 'refunded') {
      return
    }

    // Subscribe to shift updates via WebSocket
    const channel = `swap:${activeShift.shiftId}`
    wsClient.subscribe(channel)

    // Fallback polling if WebSocket not connected
    if (!wsClient.isConnected()) {
      const pollStatus = async () => {
        try {
          const data = await swapApi.getStatus(activeShift.shiftId)
          if (data.success) {
            setActiveShift(data.data)
          }
        } catch (err) {
          console.error('Failed to poll shift status:', err)
        }
      }

      const interval = setInterval(pollStatus, 5000) // Poll every 5 seconds
      return () => {
        clearInterval(interval)
        wsClient.unsubscribe(channel)
      }
    }

    return () => {
      wsClient.unsubscribe(channel)
    }
  }, [activeShift])

  // Get quote from SideShift API
  const getQuote = useCallback(async () => {
    if (!fromToken || !toToken || !amount || !address) {
      setError('Please select tokens and enter amount')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (amountNum < parseFloat(fromToken.min)) {
      setError(`Minimum amount is ${fromToken.min} ${fromToken.symbol}`)
      return
    }

    if (amountNum > parseFloat(fromToken.max)) {
      setError(`Maximum amount is ${fromToken.max} ${fromToken.symbol}`)
      return
    }

    setIsLoadingQuote(true)
    setError(null)

    try {
      const data = await swapApi.getQuote({
        fromToken: fromToken.coin,
        fromNetwork: fromToken.network,
        toToken: toToken.coin,
        toNetwork: toToken.network,
        amount: amount,
        settleAddress: address
      })

      if (data.success) {
        setSwapQuote(data.data)
        setActiveShift(null) // Reset active shift when new quote
        
        // Save swap quote to localStorage for AI explanation
        localStorage.setItem('currentSwapQuote', JSON.stringify({
          ...data.data,
          fromTokenName: fromToken?.name,
          toTokenName: toToken?.name,
          fromTokenSymbol: fromToken?.symbol,
          toTokenSymbol: toToken?.symbol
        }))
      } else {
        setError('Failed to get quote')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get quote')
    } finally {
      setIsLoadingQuote(false)
    }
  }, [fromToken, toToken, amount, address])

  // Create shift when user confirms
  const createShift = async () => {
    if (!swapQuote || !address) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await swapApi.createShift({
        quoteId: swapQuote.quoteId,
        settleAddress: address
      })

      if (data.success) {
        setActiveShift(data.data)
        setSwapQuote(null) // Clear quote as shift is created
        
        // Subscribe to WebSocket updates for this shift
        if (wsClient.isConnected()) {
          wsClient.subscribe(`swap:${data.data.shiftId}`)
        }
      } else {
        setError('Failed to create shift')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create shift')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenSwitch = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setAmount('')
    setSwapQuote(null)
    setActiveShift(null)
    setError(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-500'
      case 'processing': return 'text-blue-500'
      case 'awaiting_deposit': return 'text-yellow-500'
      case 'failed': case 'refunded': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'awaiting_deposit': return 'Awaiting your deposit'
      case 'deposit_received': return 'Deposit received, processing...'
      case 'processing': return 'Processing swap...'
      case 'complete': return 'Swap completed!'
      case 'failed': return 'Swap failed'
      case 'refunded': return 'Swap refunded'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Cross-Chain Swap</h2>
        <p className="text-muted-foreground">
          Powered by SideShift.ai with AI-optimized timing
        </p>
      </div>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Swap Tokens
          </CardTitle>
          <CardDescription>
            Select tokens and amount to get a quote from SideShift
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* From Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium">From</label>
            <div className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-2xl">
                  {fromToken?.symbol === 'BTC' ? '₿' : fromToken?.symbol === 'ETH' ? 'Ξ' : '💎'}
                </div>
                <div className="flex-1">
                  <select
                    value={fromToken ? `${fromToken.coin}-${fromToken.network}` : ''}
                    onChange={(e) => {
                      const [coin, network] = e.target.value.split('-')
                      const token = tokens.find(t => t.coin === coin && t.network === network)
                      if (token) setFromToken(token)
                    }}
                    className="w-full bg-background text-foreground border-none outline-none font-semibold cursor-pointer appearance-none text-xl py-3"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'inherit',
                      fontSize: '1.5rem',
                      paddingTop: '0.75rem',
                      paddingBottom: '0.75rem',
                      lineHeight: '1.75rem'
                    }}
                  >
                    <option value="" className="bg-background text-foreground text-xl py-4" style={{ fontSize: '1.5rem', padding: '1rem' }}>Select token</option>
                    {tokens.map(token => (
                      <option 
                        key={`${token.coin}-${token.network}`} 
                        value={`${token.coin}-${token.network}`}
                        className="bg-background text-foreground text-xl py-4"
                        style={{
                          paddingTop: '1rem',
                          paddingBottom: '1rem',
                          paddingLeft: '1rem',
                          paddingRight: '1rem',
                          fontSize: '1.5rem',
                          lineHeight: '2rem',
                          minHeight: '3rem'
                        }}
                      >
                        {token.symbol} ({token.network})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-muted-foreground">{fromToken?.name}</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setSwapQuote(null)
                  setError(null)
                }}
                className="flex-1"
                step="any"
              />
              {fromToken && (
                <Button variant="outline" onClick={() => setAmount(fromToken.max)}>
                  MAX
                </Button>
              )}
            </div>
            {fromToken && (
              <p className="text-xs text-muted-foreground">
                Min: {fromToken.min} {fromToken.symbol} | Max: {fromToken.max} {fromToken.symbol}
              </p>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handleTokenSwitch}
              className="h-12 w-12 rounded-full hover:bg-primary/10"
            >
              <ArrowUpDown className="h-5 w-5" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium">To</label>
            <div className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-2xl">
                  {toToken?.symbol === 'BTC' ? '₿' : toToken?.symbol === 'ETH' ? 'Ξ' : '💎'}
                </div>
                <div className="flex-1">
                  <select
                    value={toToken ? `${toToken.coin}-${toToken.network}` : ''}
                    onChange={(e) => {
                      const [coin, network] = e.target.value.split('-')
                      const token = tokens.find(t => t.coin === coin && t.network === network)
                      if (token) setToToken(token)
                    }}
                    className="w-full bg-background text-foreground border-none outline-none font-semibold cursor-pointer appearance-none text-xl py-3"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'inherit',
                      fontSize: '1.5rem',
                      paddingTop: '0.75rem',
                      paddingBottom: '0.75rem',
                      lineHeight: '1.75rem'
                    }}
                  >
                    <option value="" className="bg-background text-foreground text-xl py-4" style={{ fontSize: '1.5rem', padding: '1rem' }}>Select token</option>
                    {tokens.map(token => (
                      <option 
                        key={`${token.coin}-${token.network}`} 
                        value={`${token.coin}-${token.network}`}
                        className="bg-background text-foreground text-xl py-4"
                        style={{
                          paddingTop: '1rem',
                          paddingBottom: '1rem',
                          paddingLeft: '1rem',
                          paddingRight: '1rem',
                          fontSize: '1.5rem',
                          lineHeight: '2rem',
                          minHeight: '3rem'
                        }}
                      >
                        {token.symbol} ({token.network})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-muted-foreground">{toToken?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {swapQuote ? formatTokenAmount(parseFloat(swapQuote.amountOut)) : '0.0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {swapQuote ? `Rate: 1 ${fromToken?.symbol} = ${parseFloat(swapQuote.rate).toFixed(6)} ${toToken?.symbol}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}

          {/* Get Quote Button */}
          {!swapQuote && !activeShift && (
            <div className="space-y-2">
              <Button
                onClick={getQuote}
                disabled={!fromToken || !toToken || !amount || parseFloat(amount || '0') <= 0 || isLoadingQuote || !address}
                className="w-full h-12 text-lg font-semibold neon-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingQuote ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Getting Quote...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Get Quote
                  </>
                )}
              </Button>
              {(!fromToken || !toToken || !amount || parseFloat(amount || '0') <= 0 || !address) && (
                <p className="text-xs text-muted-foreground text-center">
                  {!fromToken && 'Please select a "From" token. '}
                  {!toToken && 'Please select a "To" token. '}
                  {!amount || parseFloat(amount || '0') <= 0 ? 'Please enter an amount greater than 0. ' : ''}
                  {!address && 'Please connect your wallet.'}
                </p>
              )}
            </div>
          )}

          {/* Swap Quote Display */}
          {swapQuote && !activeShift && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Swap Quote
                </h4>
                {timeRemaining > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatTime(timeRemaining)}
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You send</span>
                  <span>{formatTokenAmount(parseFloat(swapQuote.amountIn))} {swapQuote.fromToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You receive</span>
                  <span className="font-semibold">{formatTokenAmount(parseFloat(swapQuote.amountOut))} {swapQuote.toToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span>{formatTokenAmount(parseFloat(swapQuote.fee))} {swapQuote.fromToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span>1 {swapQuote.fromToken} = {parseFloat(swapQuote.rate).toFixed(6)} {swapQuote.toToken}</span>
                </div>
              </div>
              <Button
                onClick={createShift}
                disabled={isLoading || timeRemaining === 0}
                className="w-full h-12 text-lg font-semibold neon-glow"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Shift...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Create Shift
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Active Shift Display */}
          {activeShift && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Shift Status</h4>
                <span className={`text-sm font-semibold ${getStatusColor(activeShift.status)}`}>
                  {getStatusMessage(activeShift.status)}
                </span>
              </div>

              {activeShift.status === 'awaiting_deposit' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-yellow-600 mb-2 font-medium">
                      Send exactly {formatTokenAmount(parseFloat(activeShift.depositAmount))} {activeShift.depositCoin} to:
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-background rounded border">
                      <code className="flex-1 text-xs break-all">{activeShift.depositAddress}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(activeShift.depositAddress)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {activeShift.expiresAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Expires in: {formatTime(activeShift.expiresAt - Date.now())}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeShift.status === 'complete' && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-600 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Swap completed successfully!
                  </p>
                  {activeShift.settleTxHash && (
                    <a
                      href={`https://explorer.sideshift.ai/tx/${activeShift.settleTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View transaction <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit</span>
                  <span>{formatTokenAmount(parseFloat(activeShift.depositAmount))} {activeShift.depositCoin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receive</span>
                  <span className="font-semibold">{formatTokenAmount(parseFloat(activeShift.settleAmount))} {activeShift.settleCoin}</span>
                </div>
                {activeShift.depositTxHash && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit TX</span>
                    <a
                      href={`https://explorer.sideshift.ai/tx/${activeShift.depositTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
