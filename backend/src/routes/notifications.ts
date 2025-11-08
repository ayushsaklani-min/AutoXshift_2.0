import express from 'express'
import { notificationService } from '../services/notificationService'
import { logger } from '../utils/logger'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()

/**
 * @route GET /api/notifications
 * @desc Get user notifications
 */
router.get('/', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const { limit = 50, offset = 0 } = req.query

    const notifications = await notificationService.getUserNotifications(
      req.userId!,
      parseInt(limit as string),
      parseInt(offset as string)
    )

    res.json({
      success: true,
      data: notifications,
    })
  } catch (error: any) {
    logger.error('Get notifications error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      message: error.message,
    })
  }
})

/**
 * @route GET /api/notifications/unread
 * @desc Get unread notification count
 */
router.get('/unread', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const count = await notificationService.getUnreadCount(req.userId!)

    res.json({
      success: true,
      data: { count },
    })
  } catch (error: any) {
    logger.error('Get unread count error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      message: error.message,
    })
  }
})

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark notification as read
 */
router.put('/:id/read', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const success = await notificationService.markAsRead(
      req.params.id,
      req.userId!
    )

    res.json({
      success,
      message: success ? 'Notification marked as read' : 'Failed to mark as read',
    })
  } catch (error: any) {
    logger.error('Mark as read error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message,
    })
  }
})

/**
 * @route PUT /api/notifications/read-all
 * @desc Mark all notifications as read
 */
router.put('/read-all', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const success = await notificationService.markAllAsRead(req.userId!)

    res.json({
      success,
      message: success ? 'All notifications marked as read' : 'Failed to mark as read',
    })
  } catch (error: any) {
    logger.error('Mark all as read error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message,
    })
  }
})

export { router as notificationRoutes }

