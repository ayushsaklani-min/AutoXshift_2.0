import { logger } from '../utils/logger'
import { db } from '../database/db'
import { cacheService } from './cacheService'
import { websocketService } from './websocketService'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: number
  uptime: number
  version: string
  services: {
    database: 'up' | 'down'
    redis: 'up' | 'down'
    websocket: 'up' | 'down'
    sideshift: 'up' | 'down'
    googleai: 'up' | 'down'
    polygon: 'up' | 'down'
  }
  metrics: {
    memoryUsage: number
    cpuUsage: number
    activeConnections: number
  }
}

class HealthService {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Get overall health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const services = await this.checkServices()
      const metrics = await this.getMetrics()
      
      const overallStatus = this.determineOverallStatus(services)
      
      return {
        status: overallStatus,
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        services,
        metrics
      }
    } catch (error) {
      logger.error('Error getting health status:', error)
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: 'down',
          redis: 'down',
          websocket: 'down',
          sideshift: 'down',
          googleai: 'down',
          polygon: 'down'
        },
        metrics: {
          memoryUsage: 0,
          cpuUsage: 0,
          activeConnections: 0
        }
      }
    }
  }

  /**
   * Check if service is ready to accept requests
   */
  async isReady(): Promise<boolean> {
    try {
      const services = await this.checkServices()
      
      // Service is ready if critical services are up
      const criticalServices = ['database', 'sideshift']
      const criticalUp = criticalServices.every(service => services[service as keyof typeof services] === 'up')
      
      return criticalUp
    } catch (error) {
      logger.error('Error checking readiness:', error)
      return false
    }
  }

  /**
   * Check status of all services
   */
  private async checkServices(): Promise<HealthStatus['services']> {
    const [database, redis, websocket, sideshift, googleAI, polygon] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkWebSocket(),
      this.checkSideShiftAPI(),
      this.checkGoogleAI(),
      this.checkPolygonRPC()
    ])

    return {
      database: database.status === 'fulfilled' && database.value ? 'up' : 'down',
      redis: redis.status === 'fulfilled' && redis.value ? 'up' : 'down',
      websocket: websocket.status === 'fulfilled' && websocket.value ? 'up' : 'down',
      sideshift: sideshift.status === 'fulfilled' && sideshift.value ? 'up' : 'down',
      googleai: googleAI.status === 'fulfilled' && googleAI.value ? 'up' : 'down',
      polygon: polygon.status === 'fulfilled' && polygon.value ? 'up' : 'down'
    }
  }

  /**
   * Check database connection
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      return await db.testConnection()
    } catch (error) {
      logger.error('Database check failed:', error)
      return false
    }
  }

  /**
   * Check Redis connection
   */
  private async checkRedis(): Promise<boolean> {
    try {
      const testKey = 'health_check_' + Date.now()
      await cacheService.set(testKey, 'test', 10)
      const value = await cacheService.get(testKey)
      await cacheService.del(testKey)
      return value === 'test'
    } catch (error) {
      logger.error('Redis check failed:', error)
      return false
    }
  }

  /**
   * Check WebSocket server
   */
  private async checkWebSocket(): Promise<boolean> {
    try {
      return websocketService.getConnectedCount() >= 0 // Server is running if we can get count
    } catch (error) {
      logger.error('WebSocket check failed:', error)
      return false
    }
  }

  /**
   * Get system metrics
   */
  private async getMetrics(): Promise<HealthStatus['metrics']> {
    const memUsage = process.memoryUsage()
    
    return {
      memoryUsage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      cpuUsage: 0, // Mock - in real app, use actual CPU monitoring
      activeConnections: 0 // Mock - in real app, track actual connections
    }
  }

  /**
   * Check SideShift API status
   */
  private async checkSideShiftAPI(): Promise<boolean> {
    try {
      // In a real implementation, this would ping the actual SideShift API
      // For demo purposes, we'll simulate a check
      return true
    } catch (error) {
      logger.error('SideShift API check failed:', error)
      return false
    }
  }

  /**
   * Check Google AI API status
   */
  private async checkGoogleAI(): Promise<boolean> {
    try {
      // In a real implementation, this would ping the Google AI API
      // For demo purposes, we'll check if the API key is configured
      return !!process.env.GOOGLE_API_KEY
    } catch (error) {
      logger.error('Google AI API check failed:', error)
      return false
    }
  }

  /**
   * Check Polygon RPC status
   */
  private async checkPolygonRPC(): Promise<boolean> {
    try {
      // In a real implementation, this would ping the Polygon RPC
      // For demo purposes, we'll simulate a check
      return true
    } catch (error) {
      logger.error('Polygon RPC check failed:', error)
      return false
    }
  }

  /**
   * Determine overall health status based on service status
   */
  private determineOverallStatus(services: HealthStatus['services']): 'healthy' | 'degraded' | 'unhealthy' {
    const serviceStatuses = Object.values(services)
    const upCount = serviceStatuses.filter(status => status === 'up').length
    const totalCount = serviceStatuses.length

    if (upCount === totalCount) {
      return 'healthy'
    } else if (upCount >= totalCount * 0.5) {
      return 'degraded'
    } else {
      return 'unhealthy'
    }
  }
}

export const healthService = new HealthService()
