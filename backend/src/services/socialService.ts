import { db } from '../database/db'
import { logger } from '../utils/logger'
import { websocketService } from './websocketService'

interface CreatePostParams {
  userId: string
  content: string
  postType?: string
  relatedSwapId?: string
  relatedCampaignId?: string
  isPublic?: boolean
}

interface LikePostParams {
  postId: string
  userId: string
}

class SocialService {
  async createPost(params: CreatePostParams): Promise<any> {
    try {
      const result = await db.query(
        `INSERT INTO social_posts (user_id, content, post_type, related_swap_id, related_campaign_id, is_public)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          params.userId,
          params.content,
          params.postType || 'insight',
          params.relatedSwapId || null,
          params.relatedCampaignId || null,
          params.isPublic !== false,
        ]
      )

      const post = result.rows[0]

      // Broadcast to public feed
      if (post.is_public) {
        websocketService.broadcast('social_feed', {
          type: 'post_created',
          post,
        })
      }

      return post
    } catch (error) {
      logger.error('Error creating post:', error)
      throw error
    }
  }

  async getFeed(limit = 50, offset = 0, userId?: string): Promise<any[]> {
    try {
      let query = `SELECT 
                     sp.*,
                     u.wallet_address as user_address,
                     u.username as user_username,
                     u.avatar_url as user_avatar
                   FROM social_posts sp
                   JOIN users u ON sp.user_id = u.id
                   WHERE sp.is_public = true`
      const params: any[] = []
      let paramCount = 1

      if (userId) {
        // Also include user's own posts
        query += ` OR sp.user_id = $${paramCount}`
        params.push(userId)
        paramCount++
      }

      query += ` ORDER BY sp.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`
      params.push(limit, offset)

      const result = await db.query(query, params)
      return result.rows
    } catch (error) {
      logger.error('Error getting feed:', error)
      throw error
    }
  }

  async getUserPosts(userId: string, limit = 50, offset = 0): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT 
           sp.*,
           u.wallet_address as user_address,
           u.username as user_username,
           u.avatar_url as user_avatar
         FROM social_posts sp
         JOIN users u ON sp.user_id = u.id
         WHERE sp.user_id = $1
         ORDER BY sp.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      )

      return result.rows
    } catch (error) {
      logger.error('Error getting user posts:', error)
      throw error
    }
  }

  async likePost(postId: string, userId: string): Promise<boolean> {
    try {
      // Check if already liked (would need a likes table in real implementation)
      // For now, just increment likes count
      await db.query(
        `UPDATE social_posts SET likes = likes + 1 WHERE id = $1`,
        [postId]
      )

      // Broadcast like event
      websocketService.broadcast(`post:${postId}`, {
        type: 'post_liked',
        postId,
        userId,
      })

      return true
    } catch (error) {
      logger.error('Error liking post:', error)
      return false
    }
  }

  async sharePost(postId: string, userId: string): Promise<boolean> {
    try {
      await db.query(
        `UPDATE social_posts SET shares = shares + 1 WHERE id = $1`,
        [postId]
      )

      return true
    } catch (error) {
      logger.error('Error sharing post:', error)
      return false
    }
  }

  async getLeaderboard(type: 'swaps' | 'campaigns' | 'donations' = 'swaps', limit = 10): Promise<any[]> {
    try {
      let query = ''
      
      switch (type) {
        case 'swaps':
          query = `SELECT 
                     u.id,
                     u.wallet_address,
                     u.username,
                     COUNT(s.id) as swap_count,
                     SUM(s.amount_in::numeric) as total_volume
                   FROM users u
                   LEFT JOIN swaps s ON u.id = s.user_id
                   GROUP BY u.id, u.wallet_address, u.username
                   ORDER BY total_volume DESC NULLS LAST
                   LIMIT $1`
          break
        case 'campaigns':
          query = `SELECT 
                     u.id,
                     u.wallet_address,
                     u.username,
                     COUNT(c.id) as campaign_count,
                     SUM(c.current_amount::numeric) as total_raised
                   FROM users u
                   LEFT JOIN campaigns c ON u.id = c.creator_id
                   GROUP BY u.id, u.wallet_address, u.username
                   ORDER BY total_raised DESC NULLS LAST
                   LIMIT $1`
          break
        case 'donations':
          query = `SELECT 
                     u.id,
                     u.wallet_address,
                     u.username,
                     COUNT(d.id) as donation_count,
                     SUM(d.amount::numeric) as total_donated
                   FROM users u
                   LEFT JOIN donations d ON u.id = d.donor_id
                   GROUP BY u.id, u.wallet_address, u.username
                   ORDER BY total_donated DESC NULLS LAST
                   LIMIT $1`
          break
      }

      const result = await db.query(query, [limit])
      return result.rows
    } catch (error) {
      logger.error('Error getting leaderboard:', error)
      throw error
    }
  }

  async createInsightPost(userId: string, insightId: string, content: string): Promise<any> {
    try {
      // Get insight data
      const insightResult = await db.query(
        'SELECT * FROM ai_insights WHERE id = $1',
        [insightId]
      )

      if (insightResult.rows.length === 0) {
        throw new Error('Insight not found')
      }

      const insight = insightResult.rows[0]

      // Create post from insight
      return await this.createPost({
        userId,
        content: content || insight.content,
        postType: 'insight',
        isPublic: true,
      })
    } catch (error) {
      logger.error('Error creating insight post:', error)
      throw error
    }
  }
}

export const socialService = new SocialService()

