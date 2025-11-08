import { logger } from './logger'
import { db } from '../database/db'

interface Metrics {
  requests: number
  errors: number
  responseTime: number
  activeConnections: number
  databaseQueries: number
  cacheHits: number
  cacheMisses: number
}

class MonitoringService {
  private metrics: Metrics = {
    requests: 0,
    errors: 0,
    responseTime: 0,
    activeConnections: 0,
    databaseQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }

  private requestTimes: number[] = []

  incrementRequests(): void {
    this.metrics.requests++
  }

  incrementErrors(): void {
    this.metrics.errors++
  }

  recordResponseTime(time: number): void {
    this.requestTimes.push(time)
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift() // Keep only last 1000
    }
    this.metrics.responseTime = this.calculateAverageResponseTime()
  }

  incrementDatabaseQueries(): void {
    this.metrics.databaseQueries++
  }

  incrementCacheHits(): void {
    this.metrics.cacheHits++
  }

  incrementCacheMisses(): void {
    this.metrics.cacheMisses++
  }

  private calculateAverageResponseTime(): number {
    if (this.requestTimes.length === 0) return 0
    const sum = this.requestTimes.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.requestTimes.length)
  }

  getMetrics(): Metrics {
    return {
      ...this.metrics,
      responseTime: this.calculateAverageResponseTime(),
    }
  }

  async getSystemMetrics(): Promise<any> {
    const memUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Get database connection count (if available)
    let dbConnections = 0
    try {
      const result = await db.query(
        "SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()"
      )
      dbConnections = parseInt(result.rows[0]?.count || '0')
    } catch (error) {
      // Ignore if query fails
    }

    return {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      uptime: Math.round(uptime),
      databaseConnections: dbConnections,
      nodeVersion: process.version,
      platform: process.platform,
    }
  }

  resetMetrics(): void {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: 0,
      activeConnections: 0,
      databaseQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
    }
    this.requestTimes = []
  }

  // Log metrics periodically
  startMetricsLogging(intervalMs: number = 60000): void {
    setInterval(() => {
      const metrics = this.getMetrics()
      logger.info('Metrics:', {
        ...metrics,
        errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests * 100).toFixed(2) + '%' : '0%',
        cacheHitRate: (metrics.cacheHits + metrics.cacheMisses) > 0
          ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(2) + '%'
          : '0%',
      })
    }, intervalMs)
  }
}

export const monitoringService = new MonitoringService()

