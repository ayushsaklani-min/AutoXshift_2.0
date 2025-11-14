import express from 'express'
import { swapService } from '../services/swapService'
import { logger } from '../utils/logger'
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth'
import { analyticsService } from '../services/analyticsService'
import { websocketService } from '../services/websocketService'

const router = express.Router()

/**
 * @route POST /api/swap/quote
 * @desc Get swap quote from SideShift API
 * @body { fromToken, fromNetwork, toToken, toNetwork, amount, settleAddress }
 */
router.post('/quote', async (req: any, res: any) => {
  const { fromToken, fromNetwork, toToken, toNetwork, amount, settleAddress } = req.body
  
  // Validation
  if (!fromToken || !fromNetwork || !toToken || !toNetwork || !amount || !settleAddress) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'fromToken, fromNetwork, toToken, toNetwork, amount, and settleAddress are required'
    })
  }

  try {
    logger.info(`Quote request: ${amount} ${fromToken} (${fromNetwork}) → ${toToken} (${toNetwork})`)
    
    // Extract user IP for SideShift API (required for server-side requests)
    // Get real client IP, handling proxies
    const getClientIp = (req: any): string => {
      const forwarded = req.headers['x-forwarded-for']
      if (forwarded) {
        // x-forwarded-for can contain multiple IPs, take the first one
        const ips = (forwarded as string).split(',')
        return ips[0].trim()
      }
      return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown'
    }
    
    const userIp = getClientIp(req)
    
    const quote = await swapService.getSwapQuote({
      fromToken,
      fromNetwork,
      toToken,
      toNetwork,
      amount: amount.toString(),
      settleAddress
    }, userIp)
    
    res.json({
      success: true,
      data: quote,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    logger.error('Quote error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get swap quote',
      message: error.message || 'Unknown error'
    })
  }
})

/**
 * @route POST /api/swap/shift
 * @desc Create a new fixed shift
 * @body { quoteId, settleAddress }
 */
router.post('/shift', optionalAuth, async (req: AuthRequest, res: any) => {
  try {
    const { quoteId, settleAddress } = req.body
    
    if (!quoteId || !settleAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'quoteId and settleAddress are required'
      })
    }

    logger.info(`Creating shift with quote: ${quoteId}`)
    
    // Extract user IP for SideShift API (required for server-side requests)
    const getClientIp = (req: any): string => {
      const forwarded = req.headers['x-forwarded-for']
      if (forwarded) {
        const ips = (forwarded as string).split(',')
        return ips[0].trim()
      }
      return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown'
    }
    
    const userIp = getClientIp(req)
    
    const shift = await swapService.createShift({
      quoteId,
      settleAddress
    }, userIp)

    // Save to database if user is authenticated
    if (req.userId) {
      await swapService.saveSwap(req.userId, shift)
      
      // Track event
      await analyticsService.trackEvent({
        userId: req.userId,
        eventType: 'swap_created',
        eventData: { shiftId: shift.shiftId },
      })

      // Send WebSocket notification
      websocketService.sendToUser(req.userId, {
        type: 'swap_created',
        shift,
      })
    }
    
    res.json({
      success: true,
      data: shift,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    logger.error('Shift creation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create shift',
      message: error.message || 'Unknown error'
    })
  }
})

/**
 * @route GET /api/swap/status/:shiftId
 * @desc Get shift status
 */
router.get('/status/:shiftId', async (req: any, res: any) => {
  try {
    const { shiftId } = req.params
    
    if (!shiftId) {
      return res.status(400).json({
        success: false,
        error: 'Missing shiftId'
      })
    }

    const status = await swapService.getShiftStatus(shiftId)
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    logger.error('Get status error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get shift status',
      message: error.message || 'Unknown error'
    })
  }
})

/**
 * @route GET /api/swap/tokens
 * @desc Get supported tokens from SideShift
 */
router.get('/tokens', async (req: any, res: any) => {
  try {
    const tokens = await swapService.getSupportedTokens()
    
    res.json({
      success: true,
      data: tokens,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    logger.error('Get tokens error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get supported tokens',
      message: error.message || 'Unknown error'
    })
  }
})

/**
 * @route GET /api/swap/history
 * @desc Get swap history for authenticated user
 */
router.get('/history', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    
    const history = await swapService.getSwapHistory(
      req.userId!,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    )
    
    res.json({
      success: true,
      data: history,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    logger.error('Get history error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get swap history',
      message: error.message || 'Unknown error'
    })
  }
})

export { router as swapRoutes }
