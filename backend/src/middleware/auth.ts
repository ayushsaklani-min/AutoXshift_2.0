import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/authService'

export interface AuthRequest extends Request {
  userId?: string
  walletAddress?: string
  user?: any
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided',
      })
      return
    }

    const token = authHeader.substring(7)
    const payload = authService.verifyToken(token)

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token',
      })
      return
    }

    req.userId = payload.userId
    req.walletAddress = payload.walletAddress

    // Load full user object
    const user = await authService.getUserById(payload.userId)
    req.user = user

    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication failed',
    })
  }
}

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = authService.verifyToken(token)

      if (payload) {
        req.userId = payload.userId
        req.walletAddress = payload.walletAddress
        const user = await authService.getUserById(payload.userId)
        req.user = user
      }
    }

    next()
  } catch (error) {
    // Continue without auth
    next()
  }
}

