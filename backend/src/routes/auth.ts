import express from 'express'
import { authService } from '../services/authService'
import { logger } from '../utils/logger'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()

/**
 * @route POST /api/auth/wallet
 * @desc Authenticate with wallet address (creates user if doesn't exist)
 */
router.post('/wallet', async (req: any, res: any) => {
  try {
    const { walletAddress, referralCode } = req.body

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing wallet address',
      })
    }

    // Find or create user
    const user = await authService.findOrCreateUser(walletAddress)

    // Process referral if provided
    if (referralCode && !user.referred_by) {
      await authService.processReferral(referralCode, user.id)
    }

    // Generate token
    const token = authService.generateToken(user.id, user.wallet_address)

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          walletAddress: user.wallet_address,
          username: user.username,
          points: user.points,
          reputationScore: user.reputation_score,
        },
        token,
      },
    })
  } catch (error: any) {
    logger.error('Auth error:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/auth/me
 * @desc Get current user
 */
router.get('/me', authenticate, async (req: AuthRequest, res: any) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user?.id,
          walletAddress: req.user?.wallet_address,
          username: req.user?.username,
          points: req.user?.points,
          reputationScore: req.user?.reputation_score,
          preferences: req.user?.preferences,
        },
      },
    })
  } catch (error: any) {
    logger.error('Get user error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message,
    })
  }
})

/**
 * @route PUT /api/auth/preferences
 * @desc Update user preferences
 */
router.put('/preferences', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { preferences } = req.body

    if (!preferences) {
      return res.status(400).json({
        success: false,
        error: 'Missing preferences',
      })
    }

    await authService.updateUserPreferences(req.userId!, preferences)

    res.json({
      success: true,
      message: 'Preferences updated',
    })
  } catch (error: any) {
    logger.error('Update preferences error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error.message,
    })
  }
})

export { router as authRoutes }

