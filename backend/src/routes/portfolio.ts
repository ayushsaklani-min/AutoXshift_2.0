import express from 'express'
import { portfolioService } from '../services/portfolioService'
import { logger } from '../utils/logger'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()

/**
 * @route POST /api/portfolio/snapshot
 * @desc Create portfolio snapshot
 */
router.post('/snapshot', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { tokens } = req.body

    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokens array',
      })
    }

    const snapshot = await portfolioService.createSnapshot(req.userId!, tokens)

    res.json({
      success: true,
      data: snapshot,
    })
  } catch (error: any) {
    logger.error('Create snapshot error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create snapshot',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/portfolio/history
 * @desc Get portfolio history
 */
router.get('/history', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { limit = 30 } = req.query

    const history = await portfolioService.getPortfolioHistory(
      req.userId!,
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: history,
    })
  } catch (error: any) {
    logger.error('Get history error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get history',
      message: error.message,
    })
  }
})

/**
 * @route POST /api/portfolio/analyze
 * @desc Analyze portfolio
 */
router.post('/analyze', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { tokens } = req.body

    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokens array',
      })
    }

    const analysis = await portfolioService.analyzePortfolio(req.userId!, tokens)

    res.json({
      success: true,
      data: analysis,
    })
  } catch (error: any) {
    logger.error('Analyze portfolio error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to analyze portfolio',
      message: error.message,
    })
  }
})

/**
 * @route POST /api/portfolio/rebalance
 * @desc Get rebalancing suggestions
 */
router.post('/rebalance', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { tokens } = req.body

    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokens array',
      })
    }

    const suggestions = await portfolioService.suggestRebalancing(req.userId!, tokens)

    res.json({
      success: true,
      data: suggestions,
    })
  } catch (error: any) {
    logger.error('Rebalance error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get rebalancing suggestions',
      message: error.message,
    })
  }
})

export { router as portfolioRoutes }

