import { db } from '../database/db'
import { swapService } from './swapService'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { websocketService } from './websocketService'

interface CreateCampaignParams {
  creatorId: string
  title: string
  description: string
  goalAmount: string
  goalToken: string
  goalNetwork: string
  imageUrl?: string
  category?: string
  expiresAt?: Date
}

interface DonateParams {
  campaignId: string
  donorId?: string
  donorAddress: string
  fromToken: string
  fromNetwork: string
  amount: string
  message?: string
  anonymous?: boolean
  userIp?: string
}

class CampaignService {
  async createCampaign(params: CreateCampaignParams): Promise<any> {
    try {
      const result = await db.query(
        `INSERT INTO campaigns (
          creator_id, title, description, goal_amount, current_amount,
          goal_token, goal_network, image_url, category, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          params.creatorId,
          params.title,
          params.description,
          params.goalAmount,
          '0',
          params.goalToken,
          params.goalNetwork,
          params.imageUrl || null,
          params.category || 'general',
          params.expiresAt || null,
        ]
      )

      const campaign = result.rows[0]

      // Broadcast campaign creation
      websocketService.broadcast('campaigns', {
        type: 'campaign_created',
        campaign,
      })

      return campaign
    } catch (error) {
      logger.error('Error creating campaign:', error)
      throw error
    }
  }

  async getCampaign(campaignId: string): Promise<any | null> {
    try {
      const result = await db.query(
        `SELECT c.*, 
         u.wallet_address as creator_address,
         u.username as creator_username
         FROM campaigns c
         JOIN users u ON c.creator_id = u.id
         WHERE c.id = $1`,
        [campaignId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const campaign = result.rows[0]

      // Get donation count
      const donationCount = await db.query(
        'SELECT COUNT(*) as count FROM donations WHERE campaign_id = $1',
        [campaignId]
      )
      campaign.donation_count = parseInt(donationCount.rows[0].count)

      return campaign
    } catch (error) {
      logger.error('Error getting campaign:', error)
      throw error
    }
  }

  async listCampaigns(filters?: {
    status?: string
    category?: string
    creatorId?: string
    limit?: number
    offset?: number
  }): Promise<any[]> {
    try {
      let query = `SELECT c.*, 
                   u.wallet_address as creator_address,
                   u.username as creator_username
                   FROM campaigns c
                   JOIN users u ON c.creator_id = u.id
                   WHERE 1=1`
      const params: any[] = []
      let paramCount = 1

      if (filters?.status) {
        query += ` AND c.status = $${paramCount}`
        params.push(filters.status)
        paramCount++
      }

      if (filters?.category) {
        query += ` AND c.category = $${paramCount}`
        params.push(filters.category)
        paramCount++
      }

      if (filters?.creatorId) {
        query += ` AND c.creator_id = $${paramCount}`
        params.push(filters.creatorId)
        paramCount++
      }

      query += ' ORDER BY c.created_at DESC'

      if (filters?.limit) {
        query += ` LIMIT $${paramCount}`
        params.push(filters.limit)
        paramCount++
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramCount}`
        params.push(filters.offset)
        paramCount++
      }

      const result = await db.query(query, params)
      return result.rows
    } catch (error) {
      logger.error('Error listing campaigns:', error)
      throw error
    }
  }

  async donate(params: DonateParams): Promise<any> {
    try {
      // Get campaign
      const campaign = await this.getCampaign(params.campaignId)
      if (!campaign) {
        throw new Error('Campaign not found')
      }

      if (campaign.status !== 'active') {
        throw new Error('Campaign is not active')
      }

      // Get quote from SideShift
      const quote = await swapService.getSwapQuote({
        fromToken: params.fromToken,
        fromNetwork: params.fromNetwork,
        toToken: campaign.goal_token,
        toNetwork: campaign.goal_network,
        amount: params.amount,
        settleAddress: campaign.creator_id, // Will need campaign wallet address
      }, params.userIp)

      // Create shift
      const shift = await swapService.createShift({
        quoteId: quote.quoteId,
        settleAddress: campaign.creator_id,
      }, params.userIp)

      // Create donation record
      const donationResult = await db.query(
        `INSERT INTO donations (
          campaign_id, donor_id, donor_address, from_token, from_network,
          amount, shift_id, deposit_address, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          params.campaignId,
          params.donorId || null,
          params.donorAddress,
          params.fromToken,
          params.fromNetwork,
          params.amount,
          shift.shiftId,
          shift.depositAddress,
          'awaiting_deposit',
        ]
      )

      const donation = donationResult.rows[0]

      // Broadcast donation
      websocketService.broadcast(`campaign:${params.campaignId}`, {
        type: 'donation_created',
        donation,
      })

      // Send notifications
      const { notificationService } = await import('./notificationService')
      if (campaign.creator_id) {
        await notificationService.notifyCampaignDonation(
          campaign.creator_id,
          params.campaignId,
          params.amount
        )
      }

      // Update campaign progress
      await this.updateCampaignProgress(params.campaignId)

      return {
        donation,
        shift,
        quote,
      }
    } catch (error) {
      logger.error('Error processing donation:', error)
      throw error
    }
  }

  async updateCampaignProgress(campaignId: string): Promise<void> {
    try {
      // Calculate total donations
      const result = await db.query(
        `SELECT SUM(amount) as total FROM donations 
         WHERE campaign_id = $1 AND status = 'complete'`,
        [campaignId]
      )

      const total = result.rows[0].total || '0'

      // Update campaign
      await db.query(
        'UPDATE campaigns SET current_amount = $1 WHERE id = $2',
        [total, campaignId]
      )

      // Check if goal reached
      const campaign = await this.getCampaign(campaignId)
      if (campaign && parseFloat(campaign.current_amount) >= parseFloat(campaign.goal_amount)) {
        await db.query(
          "UPDATE campaigns SET status = 'completed' WHERE id = $1",
          [campaignId]
        )

        websocketService.broadcast(`campaign:${campaignId}`, {
          type: 'goal_reached',
          campaign,
        })

        // Send notification to campaign creator
        const { notificationService } = await import('./notificationService')
        if (campaign.creator_id) {
          await notificationService.notifyCampaignGoalReached(
            campaign.creator_id,
            campaignId
          )
        }
      }
    } catch (error) {
      logger.error('Error updating campaign progress:', error)
    }
  }

  async getCampaignDonations(campaignId: string, limit = 50, offset = 0): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT d.*, u.username as donor_username
         FROM donations d
         LEFT JOIN users u ON d.donor_id = u.id
         WHERE d.campaign_id = $1
         ORDER BY d.created_at DESC
         LIMIT $2 OFFSET $3`,
        [campaignId, limit, offset]
      )

      return result.rows
    } catch (error) {
      logger.error('Error getting campaign donations:', error)
      throw error
    }
  }
}

export const campaignService = new CampaignService()

