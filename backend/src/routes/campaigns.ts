import express from 'express'
import { campaignService } from '../services/campaignService'
import { logger } from '../utils/logger'
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth'
import { analyticsService } from '../services/analyticsService'

const router = express.Router()

/**
 * @route POST /api/campaigns
 * @desc Create a new campaign
 */
router.post('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const {
      title,
      description,
      goalAmount,
      goalToken,
      goalNetwork,
      imageUrl,
      category,
      expiresAt,
    } = req.body

    if (!title || !description || !goalAmount || !goalToken || !goalNetwork) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
    }

    const campaign = await campaignService.createCampaign({
      creatorId: req.userId!,
      title,
      description,
      goalAmount,
      goalToken,
      goalNetwork,
      imageUrl,
      category,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })

    // Track event
    await analyticsService.trackEvent({
      userId: req.userId,
      eventType: 'campaign_created',
      eventData: { campaignId: campaign.id },
    })

    res.json({
      success: true,
      data: campaign,
    })
  } catch (error: any) {
    logger.error('Create campaign error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/campaigns/:id
 * @desc Get campaign details
 */
router.get('/:id', optionalAuth, async (req: any, res: any) => {
  try {
    const campaign = await campaignService.getCampaign(req.params.id)

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      })
    }

    res.json({
      success: true,
      data: campaign,
    })
  } catch (error: any) {
    logger.error('Get campaign error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/campaigns
 * @desc List campaigns
 */
router.get('/', optionalAuth, async (req: any, res: any) => {
  try {
    const {
      status,
      category,
      creatorId,
      limit = 20,
      offset = 0,
    } = req.query

    const campaigns = await campaignService.listCampaigns({
      status,
      category,
      creatorId,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    })

    res.json({
      success: true,
      data: campaigns,
    })
  } catch (error: any) {
    logger.error('List campaigns error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list campaigns',
      message: error.message,
    })
  }
})

/**
 * @route POST /api/campaigns/:id/donate
 * @desc Donate to a campaign
 */
router.post('/:id/donate', optionalAuth, async (req: any, res: any) => {
  try {
    const {
      donorAddress,
      fromToken,
      fromNetwork,
      amount,
      message,
      anonymous,
    } = req.body

    if (!donorAddress || !fromToken || !fromNetwork || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
    }

    const result = await campaignService.donate({
      campaignId: req.params.id,
      donorId: req.userId,
      donorAddress,
      fromToken,
      fromNetwork,
      amount,
      message,
      anonymous,
    })

    // Track event
    await analyticsService.trackEvent({
      userId: req.userId,
      eventType: 'donation_created',
      eventData: {
        campaignId: req.params.id,
        amount,
      },
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    logger.error('Donate error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process donation',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/campaigns/:id/donations
 * @desc Get campaign donations
 */
router.get('/:id/donations', async (req: any, res: any) => {
  try {
    const { limit = 50, offset = 0 } = req.query

    const donations = await campaignService.getCampaignDonations(
      req.params.id,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json({
      success: true,
      data: donations,
    })
  } catch (error: any) {
    logger.error('Get donations error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get donations',
      message: error.message,
    })
  }
})

export { router as campaignRoutes }

