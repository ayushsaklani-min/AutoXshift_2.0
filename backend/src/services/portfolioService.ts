import { db } from '../database/db'
import { aiService } from './aiService'
import { logger } from '../utils/logger'
import { cacheService, CacheService } from './cacheService'

interface PortfolioToken {
  symbol: string
  network: string
  balance: string
  usdValue: number
  change24h: number
}

interface PortfolioSnapshot {
  tokens: PortfolioToken[]
  totalValueUSD: number
  recommendations: any[]
}

class PortfolioService {
  async createSnapshot(userId: string, tokens: PortfolioToken[]): Promise<any> {
    try {
      const totalValue = tokens.reduce((sum, token) => sum + token.usdValue, 0)

      // Get AI recommendations
      const recommendations = await this.getAIRecommendations(tokens)

      const result = await db.query(
        `INSERT INTO portfolio_snapshots (user_id, tokens, total_value_usd, recommendations)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          userId,
          JSON.stringify(tokens),
          totalValue,
          JSON.stringify(recommendations),
        ]
      )

      return result.rows[0]
    } catch (error) {
      logger.error('Error creating portfolio snapshot:', error)
      throw error
    }
  }

  async getPortfolioHistory(userId: string, limit = 30): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM portfolio_snapshots
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      )

      return result.rows.map((row) => ({
        ...row,
        tokens: typeof row.tokens === 'string' ? JSON.parse(row.tokens) : row.tokens,
        recommendations: typeof row.recommendations === 'string' ? JSON.parse(row.recommendations) : row.recommendations,
      }))
    } catch (error) {
      logger.error('Error getting portfolio history:', error)
      throw error
    }
  }

  async getAIRecommendations(tokens: PortfolioToken[]): Promise<any[]> {
    try {
      const tokenSymbols = tokens.map((t) => t.symbol)
      const cacheKey = CacheService.keys.aiAnalysis(tokenSymbols)

      // Check cache
      const cached = await cacheService.get<any[]>(cacheKey)
      if (cached) {
        return cached
      }

      // Get AI analysis
      const analysis = await aiService.analyzeMarketConditions(tokenSymbols, '24h')

      // Generate recommendations
      const recommendations = [
        {
          type: 'rebalance',
          title: 'Portfolio Rebalancing Suggestion',
          description: analysis.optimalTiming?.reason || 'Consider rebalancing your portfolio',
          confidence: analysis.optimalTiming?.confidence || 75,
          impact: 'medium' as const,
          action: 'Rebalance Now',
        },
        {
          type: 'timing',
          title: 'Optimal Swap Timing',
          description: `Best time to swap: ${analysis.optimalTiming?.bestTime || 'Next 2-4 hours'}`,
          confidence: analysis.optimalTiming?.confidence || 75,
          impact: 'high' as const,
          action: 'View Details',
        },
      ]

      // Cache for 15 minutes
      await cacheService.set(cacheKey, recommendations, 900)

      return recommendations
    } catch (error) {
      logger.error('Error getting AI recommendations:', error)
      return []
    }
  }

  async analyzePortfolio(userId: string, tokens: PortfolioToken[]): Promise<any> {
    try {
      const totalValue = tokens.reduce((sum, token) => sum + token.usdValue, 0)
      const recommendations = await this.getAIRecommendations(tokens)

      // Calculate diversification score
      const diversificationScore = this.calculateDiversification(tokens)

      // Calculate risk score
      const riskScore = this.calculateRiskScore(tokens)

      return {
        totalValueUSD: totalValue,
        tokenCount: tokens.length,
        diversificationScore,
        riskScore,
        recommendations,
        tokens,
      }
    } catch (error) {
      logger.error('Error analyzing portfolio:', error)
      throw error
    }
  }

  private calculateDiversification(tokens: PortfolioToken[]): number {
    if (tokens.length === 0) return 0

    const totalValue = tokens.reduce((sum, token) => sum + token.usdValue, 0)
    if (totalValue === 0) return 0

    // Calculate Herfindahl index (lower is better for diversification)
    const herfindahl = tokens.reduce((sum, token) => {
      const share = token.usdValue / totalValue
      return sum + share * share
    }, 0)

    // Convert to diversification score (0-100, higher is better)
    return Math.round((1 - herfindahl) * 100)
  }

  private calculateRiskScore(tokens: PortfolioToken[]): number {
    if (tokens.length === 0) return 0

    // Simple risk calculation based on volatility
    const avgVolatility = tokens.reduce((sum, token) => {
      return sum + Math.abs(token.change24h || 0)
    }, 0) / tokens.length

    // Risk score 0-100 (higher is riskier)
    return Math.min(100, Math.round(avgVolatility * 10))
  }

  async suggestRebalancing(userId: string, currentTokens: PortfolioToken[]): Promise<any> {
    try {
      const analysis = await this.analyzePortfolio(userId, currentTokens)

      // Get AI suggestions
      const prompt = `Analyze this portfolio and suggest rebalancing:
      ${JSON.stringify(currentTokens.map(t => ({ symbol: t.symbol, value: t.usdValue })))}
      
      Provide 3-5 specific rebalancing recommendations.`

      // This would use AI service to generate suggestions
      const suggestions = [
        {
          action: 'reduce',
          token: 'BTC',
          current: 60,
          target: 40,
          reason: 'Over-concentrated in BTC',
        },
        {
          action: 'increase',
          token: 'ETH',
          current: 20,
          target: 30,
          reason: 'Underweight in ETH',
        },
      ]

      return {
        current: analysis,
        suggestions,
        diversificationScore: analysis.diversificationScore,
      }
    } catch (error) {
      logger.error('Error suggesting rebalancing:', error)
      throw error
    }
  }
}

export const portfolioService = new PortfolioService()

