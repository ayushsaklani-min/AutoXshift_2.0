import { db } from '../database/db'
import { logger } from '../utils/logger'
import { websocketService } from './websocketService'
import { v4 as uuidv4 } from 'uuid'

interface CreateNotificationParams {
  userId: string
  type: string
  title: string
  message: string
  data?: any
}

class NotificationService {
  async createNotification(params: CreateNotificationParams): Promise<any> {
    try {
      const result = await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          params.userId,
          params.type,
          params.title,
          params.message,
          JSON.stringify(params.data || {}),
        ]
      )

      const notification = result.rows[0]

      // Send via WebSocket if user is connected
      websocketService.sendToUser(params.userId, {
        type: 'notification',
        notification,
      })

      return notification
    } catch (error) {
      logger.error('Error creating notification:', error)
      throw error
    }
  }

  async getUserNotifications(userId: string, limit = 50, offset = 0): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT * FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      )

      return result.rows.map((row) => ({
        ...row,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      }))
    } catch (error) {
      logger.error('Error getting notifications:', error)
      throw error
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await db.query(
        `UPDATE notifications SET read = true
         WHERE id = $1 AND user_id = $2`,
        [notificationId, userId]
      )
      return true
    } catch (error) {
      logger.error('Error marking notification as read:', error)
      return false
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await db.query(
        `UPDATE notifications SET read = true
         WHERE user_id = $1 AND read = false`,
        [userId]
      )
      return true
    } catch (error) {
      logger.error('Error marking all notifications as read:', error)
      return false
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count FROM notifications
         WHERE user_id = $1 AND read = false`,
        [userId]
      )
      return parseInt(result.rows[0].count)
    } catch (error) {
      logger.error('Error getting unread count:', error)
      return 0
    }
  }

  // Helper methods for common notification types
  async notifySwapCreated(userId: string, shiftId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'swap_created',
      title: 'Swap Created',
      message: `Your swap has been created. Shift ID: ${shiftId}`,
      data: { shiftId },
    })
  }

  async notifySwapComplete(userId: string, shiftId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'swap_complete',
      title: 'Swap Completed',
      message: `Your swap has been completed successfully!`,
      data: { shiftId },
    })
  }

  async notifyCampaignDonation(userId: string, campaignId: string, amount: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'campaign_donation',
      title: 'New Donation',
      message: `You received a donation of ${amount} to your campaign!`,
      data: { campaignId, amount },
    })
  }

  async notifyCampaignGoalReached(userId: string, campaignId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'campaign_goal_reached',
      title: 'Goal Reached!',
      message: `Congratulations! Your campaign has reached its goal!`,
      data: { campaignId },
    })
  }
}

export const notificationService = new NotificationService()

