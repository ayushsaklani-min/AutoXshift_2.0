import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger'

interface SwapRecommendation {
  id: string
  type: 'timing' | 'rate' | 'gas' | 'risk'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  action?: string
  timestamp: number
}

interface MarketAnalysis {
  overallSentiment: 'bullish' | 'bearish' | 'neutral'
  volatility: 'low' | 'medium' | 'high'
  recommendations: SwapRecommendation[]
  insights: string[]
  optimalTiming: {
    bestTime: string
    confidence: number
    reason: string
  }
}

interface GasOptimization {
  currentGasPrice: string
  recommendedGasPrice: string
  savings: string
  estimatedConfirmationTime: string
  recommendations: string[]
}

class AIService {
  private genAI: GoogleGenerativeAI | null = null
  private model: any = null
  private initialized: boolean = false

  /**
   * Initialize AI service (lazy loading)
   */
  private initialize() {
    if (this.initialized) return

    if (process.env.GOOGLE_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      logger.info('✅ Google Gemini API configured successfully')
    } else {
      logger.warn('Google API key not found. AI features will not be available.')
      logger.warn('Get your API key from: https://ai.google.dev/')
    }

    this.initialized = true
  }

  /**
   * Get AI recommendations for swap timing and optimization
   */
  async getSwapRecommendations(params: {
    fromToken: string
    toToken: string
    amount: number
  }): Promise<SwapRecommendation[]> {
    this.initialize()
    if (!this.model) {
      throw new Error('Google API key not configured. Please set GOOGLE_API_KEY in your .env file to use AI features.')
    }

    try {
      return await this.getAIRecommendations(params)
    } catch (error) {
      logger.error('Error getting AI recommendations:', error)
      throw new Error(`Failed to get AI recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Analyze market conditions using AI
   */
  async analyzeMarketConditions(tokens: string[], timeframe: string): Promise<MarketAnalysis> {
    this.initialize()
    if (!this.model) {
      throw new Error('Google API key not configured. Please set GOOGLE_API_KEY in your .env file to use AI features.')
    }

    try {
      return await this.getAIMarketAnalysis(tokens, timeframe)
    } catch (error) {
      logger.error('Error analyzing market conditions:', error)
      throw new Error(`Failed to analyze market conditions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get AI explanation of swap transaction
   */
  async explainSwap(transaction: any): Promise<string> {
    this.initialize()
    if (!this.model) {
      throw new Error('Google API key not configured. Please set GOOGLE_API_KEY in your .env file to use AI features.')
    }

    try {
      return await this.getAIExplanation(transaction)
    } catch (error) {
      logger.error('Error explaining swap:', error)
      throw new Error(`Failed to explain swap: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get gas optimization recommendations
   */
  async getGasOptimization(network: string): Promise<GasOptimization> {
    try {
      // In a real implementation, this would analyze current gas prices
      // and provide optimization recommendations
      return {
        currentGasPrice: '30',
        recommendedGasPrice: '25',
        savings: '16.7%',
        estimatedConfirmationTime: '2-3 minutes',
        recommendations: [
          'Gas prices are currently 16% below average',
          'Consider executing within the next 15 minutes',
          'Use EIP-1559 transactions for better gas estimation'
        ]
      }
    } catch (error) {
      logger.error('Error getting gas optimization:', error)
      throw new Error('Failed to get gas optimization')
    }
  }

  /**
   * Configure AutoX mode settings
   */
  async configureAutoXMode(userAddress: string, settings: any): Promise<any> {
    try {
      // In a real implementation, this would save user preferences
      // and configure automated swap triggers
      logger.info(`AutoX mode configured for user ${userAddress}`)
      
      return {
        enabled: true,
        settings,
        triggers: [
          'Rate improvement > 5%',
          'Gas price < 20 gwei',
          'Market volatility < 2%'
        ],
        nextCheck: Date.now() + 300000 // 5 minutes
      }
    } catch (error) {
      logger.error('Error configuring AutoX mode:', error)
      throw new Error('Failed to configure AutoX mode')
    }
  }

  /**
   * Get AI-powered recommendations using Gemini
   */
  private async getAIRecommendations(params: {
    fromToken: string
    toToken: string
    amount: number
  }): Promise<SwapRecommendation[]> {
    if (!this.model) throw new Error('Gemini model not initialized')

    const prompt = `Analyze the following token swap and provide recommendations:
    - From: ${params.fromToken}
    - To: ${params.toToken}
    - Amount: ${params.amount}
    
    Provide 3-5 recommendations for optimal swap timing, rate optimization, gas efficiency, and risk management.
    Return as JSON array with type, title, description, confidence (0-100), impact (high/medium/low), and action.`

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      if (!text) throw new Error('No response from Gemini')

      const recommendations = JSON.parse(text)
      return recommendations.map((rec: any, index: number) => ({
        id: `gemini-${index}`,
        type: rec.type || 'timing',
        title: rec.title || 'AI Recommendation',
        description: rec.description || '',
        confidence: rec.confidence || 75,
        impact: rec.impact || 'medium',
        action: rec.action,
        timestamp: Date.now()
      }))
    } catch (parseError) {
      logger.error('Error parsing Gemini response:', parseError)
      throw new Error('Failed to parse AI recommendations from Gemini API')
    }
  }

  /**
   * Get AI-powered market analysis
   */
  private async getAIMarketAnalysis(tokens: string[], timeframe: string): Promise<MarketAnalysis> {
    if (!this.model) throw new Error('Gemini model not initialized')

    const prompt = `Analyze the market conditions for these tokens: ${tokens.join(', ')} over ${timeframe}.
    Provide sentiment analysis, volatility assessment, and trading recommendations.
    Return as JSON with overallSentiment, volatility, recommendations array, insights array, and optimalTiming object.`

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      if (!text) throw new Error('No response from Gemini')

      return JSON.parse(text)
    } catch (parseError) {
      logger.error('Error parsing Gemini market analysis:', parseError)
      throw new Error('Failed to parse market analysis from Gemini API')
    }
  }

  /**
   * Get AI explanation of swap transaction
   */
  private async getAIExplanation(transaction: any): Promise<string> {
    if (!this.model) throw new Error('Gemini model not initialized')

    const prompt = `Explain this swap transaction in simple terms for a non-technical user:
    ${JSON.stringify(transaction, null, 2)}
    
    Focus on what the transaction does, why it might be beneficial, and any risks involved.`

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      return text || 'Unable to generate explanation'
    } catch (error) {
      logger.error('Error generating AI explanation:', error)
      return 'Unable to generate explanation'
    }
  }

}

export const aiService = new AIService()
