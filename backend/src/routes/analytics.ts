import express from 'express'
import { analyticsService } from '../services/analyticsService'
import { logger } from '../utils/logger'
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth'

const router = express.Router()

/**
 * @route GET /api/analytics/dashboard
 * @desc Get dashboard statistics
 */
router.get('/dashboard', optionalAuth, async (req: AuthRequest, res: any) => {
  try {
    const stats = await analyticsService.getDashboardStats(req.userId)

    res.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    logger.error('Get dashboard stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard stats',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/analytics/swaps
 * @desc Get swap statistics
 */
router.get('/swaps', optionalAuth, async (req: AuthRequest, res: any) => {
  try {
    const { timeframe = '30d' } = req.query

    const stats = await analyticsService.getSwapStats(req.userId, timeframe as string)

    res.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    logger.error('Get swap stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get swap stats',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/analytics/tokens
 * @desc Get top tokens
 */
router.get('/tokens', async (req: any, res: any) => {
  try {
    const { limit = 10 } = req.query

    const tokens = await analyticsService.getTopTokens(parseInt(limit as string))

    res.json({
      success: true,
      data: tokens,
    })
  } catch (error: any) {
    logger.error('Get top tokens error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get top tokens',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/analytics/activity
 * @desc Get user activity
 */
router.get('/activity', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { limit = 50 } = req.query

    const activity = await analyticsService.getUserActivity(
      req.userId!,
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: activity,
    })
  } catch (error: any) {
    logger.error('Get activity error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get activity',
      message: error.message,
    })
  }
})

export { router as analyticsRoutes }

