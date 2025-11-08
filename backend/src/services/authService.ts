import jwt from 'jsonwebtoken'
import { db } from '../database/db'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

interface JWTPayload {
  userId: string
  walletAddress: string
  iat?: number
  exp?: number
}

class AuthService {
  private jwtSecret: string
  private jwtExpiry: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    this.jwtExpiry = process.env.JWT_EXPIRY || '7d'

    if (this.jwtSecret === 'your-secret-key-change-in-production') {
      logger.warn('Using default JWT secret. Change JWT_SECRET in production!')
    }
  }

  async findOrCreateUser(walletAddress: string): Promise<any> {
    try {
      // Check if user exists
      const existingUser = await db.query(
        'SELECT * FROM users WHERE wallet_address = $1',
        [walletAddress.toLowerCase()]
      )

      if (existingUser.rows.length > 0) {
        return existingUser.rows[0]
      }

      // Create new user
      const referralCode = this.generateReferralCode()
      const newUser = await db.query(
        `INSERT INTO users (wallet_address, referral_code, points, reputation_score)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [walletAddress.toLowerCase(), referralCode, 100, 0] // Welcome bonus: 100 points
      )

      logger.info(`New user created: ${walletAddress}`)
      return newUser.rows[0]
    } catch (error) {
      logger.error('Error finding/creating user:', error)
      throw error
    }
  }

  generateToken(userId: string, walletAddress: string): string {
    const payload: JWTPayload = {
      userId,
      walletAddress: walletAddress.toLowerCase(),
    }

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
    } as jwt.SignOptions)
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload
    } catch (error) {
      logger.error('Token verification failed:', error)
      return null
    }
  }

  async getUserById(userId: string): Promise<any | null> {
    try {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [userId])
      return result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      logger.error('Error getting user:', error)
      return null
    }
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<boolean> {
    try {
      await db.query(
        'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(preferences), userId]
      )
      return true
    } catch (error) {
      logger.error('Error updating user preferences:', error)
      return false
    }
  }

  private generateReferralCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  async processReferral(referrerCode: string, newUserId: string): Promise<void> {
    try {
      const referrer = await db.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referrerCode]
      )

      if (referrer.rows.length > 0) {
        const referrerId = referrer.rows[0].id

        // Update referred_by
        await db.query(
          'UPDATE users SET referred_by = $1 WHERE id = $2',
          [referrerId, newUserId]
        )

        // Create referral record
        await db.query(
          `INSERT INTO referrals (referrer_id, referred_id, reward_points, status)
           VALUES ($1, $2, $3, $4)`,
          [referrerId, newUserId, 50, 'completed'] // 50 points for referrer
        )

        // Award points to referrer
        await this.awardPoints(referrerId, 50, 'referral_bonus')
      }
    } catch (error) {
      logger.error('Error processing referral:', error)
    }
  }

  async awardPoints(userId: string, points: number, reason: string): Promise<void> {
    try {
      await db.query(
        'UPDATE users SET points = points + $1 WHERE id = $2',
        [points, userId]
      )

      await db.query(
        `INSERT INTO rewards (user_id, reward_type, points, description)
         VALUES ($1, $2, $3, $4)`,
        [userId, reason, points, `Awarded ${points} points for ${reason}`]
      )
    } catch (error) {
      logger.error('Error awarding points:', error)
    }
  }
}

export const authService = new AuthService()

