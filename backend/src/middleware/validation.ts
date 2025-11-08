import Joi from 'joi'
import { createError } from './errorHandler'

// Validation schemas
const swapRequestSchema = Joi.object({
  fromToken: Joi.string().required().min(1).max(50),
  fromNetwork: Joi.string().required().min(1).max(50),
  toToken: Joi.string().required().min(1).max(50),
  toNetwork: Joi.string().required().min(1).max(50),
  amount: Joi.string().required(), // SideShift uses string amounts
  settleAddress: Joi.string().required().min(1) // Can be any address format (BTC, ETH, etc.)
})

const aiAnalysisSchema = Joi.object({
  tokens: Joi.array().items(Joi.string()).required().min(1),
  timeframe: Joi.string().optional().valid('1h', '24h', '7d', '30d').default('24h')
})

const autoXConfigSchema = Joi.object({
  enabled: Joi.boolean().required(),
  targetRate: Joi.number().optional().positive(),
  gasThreshold: Joi.number().optional().positive(),
  checkInterval: Joi.number().optional().min(60000).max(3600000) // 1 min to 1 hour
})

/**
 * Validate swap request
 */
export const validateSwapRequest = (req: any, res: any, next: any): void => {
  const { error } = swapRequestSchema.validate(req.body)
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ')
    throw createError(`Validation Error: ${errorMessage}`, 400)
  }
  
  next()
}

/**
 * Validate AI analysis request
 */
export const validateAIAnalysis = (req: any, res: any, next: any): void => {
  const { error } = aiAnalysisSchema.validate(req.body)
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ')
    throw createError(`Validation Error: ${errorMessage}`, 400)
  }
  
  next()
}

/**
 * Validate AutoX configuration
 */
export const validateAutoXConfig = (req: any, res: any, next: any): void => {
  const { error } = autoXConfigSchema.validate(req.body)
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ')
    throw createError(`Validation Error: ${errorMessage}`, 400)
  }
  
  next()
}

/**
 * Validate network name (for SideShift)
 */
export const validateNetwork = (network: string): boolean => {
  const validNetworks = ['BTC', 'ETH', 'POLYGON', 'BSC', 'AVALANCHE', 'ARBITRUM', 'OPTIMISM']
  return validNetworks.includes(network.toUpperCase())
}
