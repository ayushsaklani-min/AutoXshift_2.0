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
  rateImprovement?: string
  gasSavings?: string
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
  private async initialize() {
    if (this.initialized) return

    if (process.env.GOOGLE_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
      
      // Try different models in order of preference
      const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro-latest',
        'gemini-pro'
      ]

      // Start with gemini-pro (most widely available model)
      // If it fails during actual use, we'll handle it in the error handlers with fallback
      const defaultModel = 'gemini-pro'
      this.model = this.genAI.getGenerativeModel({ model: defaultModel })
      logger.info(`✅ Google Gemini API configured (default: ${defaultModel})`)
      logger.info('Note: If this model fails, the system will automatically try alternatives.')
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
    await this.initialize()
    if (!this.model) {
      throw new Error('Google API key not configured or no available models. Please set GOOGLE_API_KEY in your .env file to use AI features.')
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
    await this.initialize()
    if (!this.model) {
      throw new Error('Google API key not configured or no available models. Please set GOOGLE_API_KEY in your .env file to use AI features.')
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
    await this.initialize()
    if (!this.model) {
      throw new Error('Google API key not configured or no available models. Please set GOOGLE_API_KEY in your .env file to use AI features.')
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
      // Try with fallback to alternative models
      const text = await this.generateContentWithFallback(prompt)

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
   * List available models from Google AI
   */
  private async listAvailableModels(): Promise<string[]> {
    if (!this.genAI || !process.env.GOOGLE_API_KEY) {
      throw new Error('Google AI not initialized')
    }

    try {
      // Use the REST API to list models
      const apiKey = process.env.GOOGLE_API_KEY
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`Failed to list models: ${response.status} ${response.statusText} - ${errorText}`)
        return []
      }
      
      const data = await response.json()
      
      if (data.models && Array.isArray(data.models)) {
        const modelNames = data.models
          .filter((m: any) => {
            const methods = m.supportedGenerationMethods || []
            return methods.includes('generateContent') || methods.includes('generateText')
          })
          .map((m: any) => {
            // Remove 'models/' prefix if present
            const name = m.name.replace(/^models\//, '')
            return name
          })
        
        if (modelNames.length > 0) {
          logger.info(`✅ Found ${modelNames.length} available models: ${modelNames.join(', ')}`)
        } else {
          logger.warn('No models with generateContent method found')
        }
        
        return modelNames
      }
      
      logger.warn('Unexpected response format from models API')
      return []
    } catch (error: any) {
      logger.error(`Failed to list models: ${error.message}`)
      return []
    }
  }

  /**
   * Try to generate content with fallback to alternative models
   */
  private async generateContentWithFallback(prompt: string): Promise<string> {
    // First, try to get available models
    let modelsToTry: string[] = []
    
    try {
      modelsToTry = await this.listAvailableModels()
    } catch (error) {
      logger.warn('Could not list models, using default list')
    }

    // If no models found, use default list with common names (try gemini-pro first as it's most widely available)
    if (modelsToTry.length === 0) {
      modelsToTry = [
        'gemini-pro',  // Most commonly available
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.0-pro',
        'gemini-1.0-pro-latest'
      ]
      logger.info('Using default model list (could not fetch available models)')
    }

    let lastError: any = null

    for (const modelName of modelsToTry) {
      try {
        // Remove 'models/' prefix if present
        const cleanModelName = modelName.replace('models/', '')
        const model = this.genAI!.getGenerativeModel({ model: cleanModelName })
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        
        // If successful, update the default model for future use
        this.model = model
        logger.info(`✅ Successfully using model: ${cleanModelName}`)
        
        return text
      } catch (error: any) {
        lastError = error
        logger.warn(`Model ${modelName} failed: ${error.message}`)
        continue
      }
    }

    throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}. Please check your GOOGLE_API_KEY and ensure it has access to Gemini models.`)
  }

  /**
   * Get AI-powered market analysis
   */
  private async getAIMarketAnalysis(tokens: string[], timeframe: string): Promise<MarketAnalysis> {
    if (!this.model) throw new Error('Gemini model not initialized')

    const prompt = `Analyze the market conditions for these tokens: ${tokens.join(', ')} over ${timeframe}.
    Provide sentiment analysis, volatility assessment, and trading recommendations.
    Return as JSON with this exact structure:
    {
      "overallSentiment": "bullish" | "bearish" | "neutral",
      "volatility": "low" | "medium" | "high",
      "recommendations": [
        {
          "id": "string",
          "type": "timing" | "rate" | "gas" | "risk",
          "title": "string",
          "description": "string",
          "confidence": 0-100,
          "impact": "high" | "medium" | "low",
          "action": "optional string",
          "timestamp": number
        }
      ],
      "insights": ["string array"],
      "optimalTiming": {
        "bestTime": "string",
        "confidence": 0-100,
        "reason": "string"
      },
      "rateImprovement": "string like +23%",
      "gasSavings": "string like 0.3%"
    }
    Return ONLY valid JSON, no markdown, no code blocks.`

    let text = ''
    try {
      // Try with fallback to alternative models
      text = await this.generateContentWithFallback(prompt)

      if (!text) throw new Error('No response from Gemini')

      // Clean up the response - remove markdown code blocks if present
      text = text.trim()
      if (text.startsWith('```json')) {
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      } else if (text.startsWith('```')) {
        text = text.replace(/```\n?/g, '')
      }

      const analysis = JSON.parse(text)
      
      // Ensure recommendations have proper structure
      if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
        analysis.recommendations = analysis.recommendations.map((rec: any, index: number) => ({
          id: rec.id || `ai-rec-${index}`,
          type: rec.type || 'timing',
          title: rec.title || 'AI Recommendation',
          description: rec.description || '',
          confidence: rec.confidence || 75,
          impact: rec.impact || 'medium',
          action: rec.action,
          timestamp: rec.timestamp || Date.now()
        }))
      }

      return analysis
    } catch (parseError) {
      logger.error('Error parsing Gemini market analysis:', parseError)
      if (text) {
        logger.error('Raw response:', text.substring(0, 500))
      }
      
      // Return a fallback response if parsing fails
      return {
        overallSentiment: 'neutral',
        volatility: 'medium',
        recommendations: [],
        insights: ['Unable to parse AI response. Please try again.'],
        optimalTiming: {
          bestTime: '15min',
          confidence: 50,
          reason: 'Default timing recommendation'
        },
        rateImprovement: '+0%',
        gasSavings: '0%'
      }
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
      // Try with fallback to alternative models
      const text = await this.generateContentWithFallback(prompt)
      return text || 'Unable to generate explanation'
    } catch (error) {
      logger.error('Error generating AI explanation:', error)
      return 'Unable to generate explanation'
    }
  }

}

export const aiService = new AIService()
