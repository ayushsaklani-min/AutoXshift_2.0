import { createClient, RedisClientType } from 'redis'
import { logger } from '../utils/logger'

class CacheService {
  private client: RedisClientType | null = null
  private isConnected: boolean = false

  constructor() {
    this.initialize()
  }

  private async initialize() {
    // Only initialize Redis if REDIS_URL is explicitly configured
    if (!process.env.REDIS_URL) {
      logger.info('Redis not configured (REDIS_URL not set). Caching disabled. App will work without Redis.')
      return
    }

    try {
      this.client = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              logger.warn('Redis: Max reconnection attempts reached, caching disabled')
              return false // Stop trying to reconnect
            }
            return Math.min(retries * 100, 3000) // Exponential backoff, max 3s
          },
          connectTimeout: 2000,
        },
      })

      this.client.on('error', (err) => {
        // Only log once to avoid spam
        if (!this.isConnected) {
          logger.warn('Redis connection failed, caching disabled. App will work without Redis.')
          this.isConnected = false
        }
      })

      this.client.on('connect', () => {
        logger.info('✅ Redis client connected')
        this.isConnected = true
      })

      // Try to connect with timeout
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
        )
      ])
    } catch (error) {
      // Silently fail - app works without Redis
      logger.warn('Redis connection failed, caching disabled. App will work without Redis.')
      this.client = null
      this.isConnected = false
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      return null
    }

    try {
      const value = await this.client.get(key)
      if (value) {
        return JSON.parse(value) as T
      }
      return null
    } catch (error) {
      logger.error('Redis get error:', error)
      return null
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false
    }

    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized)
      } else {
        await this.client.set(key, serialized)
      }
      return true
    } catch (error) {
      logger.error('Redis set error:', error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false
    }

    try {
      await this.client.del(key)
      return true
    } catch (error) {
      logger.error('Redis delete error:', error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false
    }

    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      logger.error('Redis exists error:', error)
      return false
    }
  }

  // Cache key generators
  static keys = {
    swapQuote: (fromToken: string, fromNetwork: string, toToken: string, toNetwork: string, amount: string) =>
      `quote:${fromToken}:${fromNetwork}:${toToken}:${toNetwork}:${amount}`,
    tokens: () => 'tokens:all',
    aiRecommendation: (fromToken: string, toToken: string, amount: string) =>
      `ai:recommend:${fromToken}:${toToken}:${amount}`,
    aiAnalysis: (tokens: string[]) => `ai:analysis:${tokens.sort().join(',')}`,
    user: (userId: string) => `user:${userId}`,
    campaign: (campaignId: string) => `campaign:${campaignId}`,
  }
}

export const cacheService = new CacheService()
export { CacheService }

