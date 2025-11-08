import express from 'express'
import { socialService } from '../services/socialService'
import { logger } from '../utils/logger'
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth'

const router = express.Router()

/**
 * @route POST /api/social/posts
 * @desc Create a new post
 */
router.post('/posts', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { content, postType, relatedSwapId, relatedCampaignId, isPublic } = req.body

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      })
    }

    const post = await socialService.createPost({
      userId: req.userId!,
      content,
      postType,
      relatedSwapId,
      relatedCampaignId,
      isPublic,
    })

    res.json({
      success: true,
      data: post,
    })
  } catch (error: any) {
    logger.error('Create post error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/social/feed
 * @desc Get social feed
 */
router.get('/feed', optionalAuth, async (req: AuthRequest, res: any) => {
  try {
    const { limit = 50, offset = 0 } = req.query

    const feed = await socialService.getFeed(
      parseInt(limit as string),
      parseInt(offset as string),
      req.userId
    )

    res.json({
      success: true,
      data: feed,
    })
  } catch (error: any) {
    logger.error('Get feed error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get feed',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/social/posts/user/:userId
 * @desc Get user's posts
 */
router.get('/posts/user/:userId', async (req: any, res: any) => {
  try {
    const { limit = 50, offset = 0 } = req.query

    const posts = await socialService.getUserPosts(
      req.params.userId,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json({
      success: true,
      data: posts,
    })
  } catch (error: any) {
    logger.error('Get user posts error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get user posts',
      message: error.message,
    })
  }
})

/**
 * @route POST /api/social/posts/:id/like
 * @desc Like a post
 */
router.post('/posts/:id/like', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const success = await socialService.likePost(req.params.id, req.userId!)

    res.json({
      success,
      message: success ? 'Post liked' : 'Failed to like post',
    })
  } catch (error: any) {
    logger.error('Like post error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to like post',
      message: error.message,
    })
  }
})

/**
 * @route POST /api/social/posts/:id/share
 * @desc Share a post
 */
router.post('/posts/:id/share', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const success = await socialService.sharePost(req.params.id, req.userId!)

    res.json({
      success,
      message: success ? 'Post shared' : 'Failed to share post',
    })
  } catch (error: any) {
    logger.error('Share post error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to share post',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/social/leaderboard
 * @desc Get leaderboard
 */
router.get('/leaderboard', async (req: any, res: any) => {
  try {
    const { type = 'swaps', limit = 10 } = req.query

    const leaderboard = await socialService.getLeaderboard(
      type as 'swaps' | 'campaigns' | 'donations',
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: leaderboard,
    })
  } catch (error: any) {
    logger.error('Get leaderboard error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      message: error.message,
    })
  }
})

export { router as socialRoutes }

