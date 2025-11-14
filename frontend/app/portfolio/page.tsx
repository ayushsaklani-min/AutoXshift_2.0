'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown,
  PieChart,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Target,
  ArrowLeft
} from 'lucide-react'
import { portfolioApi } from '@/lib/api'
import { authenticateWallet } from '@/lib/auth'
import { formatTokenAmount, formatUSD } from '@/lib/utils'

interface PortfolioToken {
  symbol: string
  network: string
  balance: string
  usdValue: number
  change24h: number
}

interface PortfolioAnalysis {
  totalValueUSD: number
  tokenCount: number
  diversificationScore: number
  riskScore: number
  recommendations: any[]
  tokens: PortfolioToken[]
}

export default function PortfolioPage() {
  const { address } = useAccount()
  const router = useRouter()
  const [tokens, setTokens] = useState<PortfolioToken[]>([])
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (address) {
      authenticateWallet(address).catch(console.error)
    }
  }, [address])

  const handleAnalyze = async () => {
    if (tokens.length === 0) {
      // For demo, use sample tokens
      const sampleTokens: PortfolioToken[] = [
        {
          symbol: 'BTC',
          network: 'BTC',
          balance: '0.5',
          usdValue: 20000,
          change24h: 2.5,
        },
        {
          symbol: 'ETH',
          network: 'ETH',
          balance: '5',
          usdValue: 15000,
          change24h: -1.2,
        },
        {
          symbol: 'USDC',
          network: 'ETH',
          balance: '10000',
          usdValue: 10000,
          change24h: 0.1,
        },
      ]
      setTokens(sampleTokens)
    }

    try {
      setIsAnalyzing(true)
      const data = await portfolioApi.analyze(tokens)
      if (data.success) {
        setAnalysis(data.data)
      }
      // Errors are caught in catch block below
    } catch (error: any) {
      console.error('Failed to analyze portfolio:', error)
      alert(`Failed to analyze portfolio: ${error.message || 'Unknown error'}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRebalance = async () => {
    if (tokens.length === 0) return

    try {
      setIsLoading(true)
      const data = await portfolioApi.getRebalancing(tokens)
      if (data.success) {
        // Show rebalancing suggestions
        console.log('Rebalancing suggestions:', data.data)
        alert('Rebalancing suggestions loaded! Check console for details.')
      }
    } catch (error) {
      console.error('Failed to get rebalancing:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-500' : 'text-red-500'
  }

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-500'
    if (score < 70) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold mb-2">Portfolio Assistant</h1>
            <p className="text-muted-foreground">
              AI-powered portfolio analysis and optimization
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAnalyze} disabled={isAnalyzing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Portfolio'}
          </Button>
          {analysis && (
            <Button onClick={handleRebalance} disabled={isLoading} variant="outline">
              <Target className="h-4 w-4 mr-2" />
              Rebalance
            </Button>
          )}
        </div>
      </div>

      {!analysis ? (
        <Card className="glass-effect">
          <CardContent className="py-12 text-center">
            <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Get AI-powered insights about your portfolio
            </p>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Portfolio Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-effect">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Total Value</p>
                <p className="text-2xl font-bold">{formatUSD(analysis.totalValueUSD)}</p>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Tokens</p>
                <p className="text-2xl font-bold">{analysis.tokenCount}</p>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Diversification</p>
                <p className={`text-2xl font-bold ${getRiskColor(100 - analysis.diversificationScore)}`}>
                  {analysis.diversificationScore}%
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Risk Score</p>
                <p className={`text-2xl font-bold ${getRiskColor(analysis.riskScore)}`}>
                  {analysis.riskScore}/100
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Token Holdings */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Token Holdings</CardTitle>
              <CardDescription>Your current portfolio composition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.tokens.map((token, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-xl">{token.symbol === 'BTC' ? '₿' : token.symbol === 'ETH' ? 'Ξ' : '💎'}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{token.symbol}</p>
                        <p className="text-sm text-muted-foreground">{token.network}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatUSD(token.usdValue)}</p>
                      <div className={`flex items-center gap-1 ${getChangeColor(token.change24h)}`}>
                        {token.change24h >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="text-sm">
                          {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTokenAmount(token.balance)} {token.symbol}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          {analysis.recommendations.length > 0 && (
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>Personalized suggestions for your portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rec.impact === 'high' ? 'bg-red-500/10 text-red-500' :
                              rec.impact === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-green-500/10 text-green-500'
                            }`}>
                              {rec.impact.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {rec.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Confidence: {rec.confidence}%</span>
                            {rec.type && <span>Type: {rec.type}</span>}
                          </div>
                        </div>
                        {rec.action && (
                          <Button size="sm" variant="outline">
                            {rec.action}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

