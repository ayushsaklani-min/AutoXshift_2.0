import { db } from '../database/db'
import { logger } from '../utils/logger'

interface AnalyticsEvent {
  userId?: string
  eventType: string
  eventData: any
  ipAddress?: string
  userAgent?: string
}

class AnalyticsService {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await db.query(
        `INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          event.userId || null,
          event.eventType,
          JSON.stringify(event.eventData),
          event.ipAddress || null,
          event.userAgent || null,
        ]
      )
    } catch (error) {
      logger.error('Error tracking event:', error)
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  async getDashboardStats(userId?: string): Promise<any> {
    try {
      const stats: any = {}

      // Total swaps
      const swapsQuery = userId
        ? 'SELECT COUNT(*) as count FROM swaps WHERE user_id = $1'
        : 'SELECT COUNT(*) as count FROM swaps'
      const swapsResult = await db.query(swapsQuery, userId ? [userId] : [])
      stats.totalSwaps = parseInt(swapsResult.rows[0].count)

      // Total volume
      const volumeQuery = userId
        ? 'SELECT SUM(amount_in) as total FROM swaps WHERE user_id = $1'
        : 'SELECT SUM(amount_in) as total FROM swaps'
      const volumeResult = await db.query(volumeQuery, userId ? [userId] : [])
      stats.totalVolume = volumeResult.rows[0].total || '0'

      // Active campaigns
      const campaignsQuery = userId
        ? 'SELECT COUNT(*) as count FROM campaigns WHERE creator_id = $1 AND status = $2'
        : "SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'"
      const campaignsResult = await db.query(
        campaignsQuery,
        userId ? [userId, 'active'] : []
      )
      stats.activeCampaigns = parseInt(campaignsResult.rows[0].count)

      // Total donations
      const donationsQuery = userId
        ? 'SELECT COUNT(*) as count FROM donations WHERE donor_id = $1'
        : 'SELECT COUNT(*) as count FROM donations'
      const donationsResult = await db.query(
        donationsQuery,
        userId ? [userId] : []
      )
      stats.totalDonations = parseInt(donationsResult.rows[0].count)

      // AI interactions
      const aiQuery = userId
        ? `SELECT COUNT(*) as count FROM analytics_events 
           WHERE user_id = $1 AND event_type LIKE 'ai_%'`
        : `SELECT COUNT(*) as count FROM analytics_events 
           WHERE event_type LIKE 'ai_%'`
      const aiResult = await db.query(aiQuery, userId ? [userId] : [])
      stats.aiInteractions = parseInt(aiResult.rows[0].count)

      // Recent activity (last 24 hours)
      const recentQuery = userId
        ? `SELECT COUNT(*) as count FROM analytics_events 
           WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`
        : `SELECT COUNT(*) as count FROM analytics_events 
           WHERE created_at > NOW() - INTERVAL '24 hours'`
      const recentResult = await db.query(recentQuery, userId ? [userId] : [])
      stats.recentActivity = parseInt(recentResult.rows[0].count)

      return stats
    } catch (error) {
      logger.error('Error getting dashboard stats:', error)
      throw error
    }
  }

  async getSwapStats(userId?: string, timeframe = '30d'): Promise<any> {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90

      const query = userId
        ? `SELECT 
             DATE(created_at) as date,
             COUNT(*) as count,
             SUM(amount_in::numeric) as volume
           FROM swaps
           WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
           GROUP BY DATE(created_at)
           ORDER BY date ASC`
        : `SELECT 
             DATE(created_at) as date,
             COUNT(*) as count,
             SUM(amount_in::numeric) as volume
           FROM swaps
           WHERE created_at > NOW() - INTERVAL '${days} days'
           GROUP BY DATE(created_at)
           ORDER BY date ASC`

      const result = await db.query(query, userId ? [userId] : [])

      return result.rows
    } catch (error) {
      logger.error('Error getting swap stats:', error)
      throw error
    }
  }

  async getTopTokens(limit = 10): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT 
           from_token as token,
           COUNT(*) as swap_count,
           SUM(amount_in::numeric) as total_volume
         FROM swaps
         WHERE created_at > NOW() - INTERVAL '30 days'
         GROUP BY from_token
         ORDER BY total_volume DESC
         LIMIT $1`,
        [limit]
      )

      return result.rows
    } catch (error) {
      logger.error('Error getting top tokens:', error)
      throw error
    }
  }

  async getUserActivity(userId: string, limit = 50): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT event_type, event_data, created_at
         FROM analytics_events
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      )

      return result.rows.map((row) => ({
        ...row,
        eventData: typeof row.event_data === 'string' ? JSON.parse(row.event_data) : row.event_data,
      }))
    } catch (error) {
      logger.error('Error getting user activity:', error)
      throw error
    }
  }
}

export const analyticsService = new AnalyticsService()

