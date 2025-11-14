// CRITICAL: Load environment variables FIRST before any other imports
// In production (Render), env vars are set directly, no .env file needed
// Only load .env file in development
import dotenv from 'dotenv'
import path from 'path'

if (process.env.NODE_ENV !== 'production') {
  // Try to load .env file in development
  const envPath1 = path.resolve(process.cwd(), '.env')
  const envPath2 = path.resolve(process.cwd(), '../.env')
  const envPath3 = path.resolve(__dirname, '../.env')
  
  console.log('Looking for .env file at:', { envPath1, envPath2, envPath3, cwd: process.cwd(), __dirname })
  
  let result = dotenv.config({ path: envPath1 })
  if (result.error) {
    console.log('Failed to load from envPath1, trying envPath2...')
    result = dotenv.config({ path: envPath2 })
  }
  if (result.error) {
    console.log('Failed to load from envPath2, trying envPath3...')
    result = dotenv.config({ path: envPath3 })
  }
  if (result.error) {
    console.log('Trying default .env location...')
    result = dotenv.config() // Fallback to default
  }
  
  if (!result.error) {
    console.log('✅ .env file loaded successfully from:', result.parsed ? Object.keys(result.parsed).length + ' variables' : 'unknown')
    // Debug: Show if SIDESHIFT_SECRET is loaded (official name per docs: https://docs.sideshift.ai/api-intro/getting-started/)
    const sideshiftSecret = process.env.SIDESHIFT_SECRET || process.env.SIDESHIFT_API_KEY
    if (sideshiftSecret) {
      console.log('✅ SIDESHIFT_SECRET is loaded (length:', sideshiftSecret.length + ')')
    } else {
      console.log('❌ SIDESHIFT_SECRET is NOT loaded (check SIDESHIFT_SECRET or SIDESHIFT_API_KEY)')
    }
  } else {
    console.log('❌ Failed to load .env file:', result.error)
  }
} else {
  // In production, env vars come from Render/Vercel
  console.log('✅ Using environment variables from platform')
}

// NOW import everything else (after .env is loaded)
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { createServer } from 'http'
import { swapRoutes } from './routes/swap'
import { aiRoutes } from './routes/ai'
import { healthRoutes } from './routes/health'
import { authRoutes } from './routes/auth'
import { campaignRoutes } from './routes/campaigns'
import { portfolioRoutes } from './routes/portfolio'
import { analyticsRoutes } from './routes/analytics'
import { notificationRoutes } from './routes/notifications'
import { socialRoutes } from './routes/social'
import { errorHandler } from './middleware/errorHandler'
import { logger } from './utils/logger'
import { websocketService } from './services/websocketService'
import { db } from './database/db'
import { securityHeaders, requestId, apiLimiter, authLimiter } from './middleware/security'
import { monitoringService } from './utils/monitoring'

// Initialize database AFTER .env is loaded
db.initialize() // Explicitly initialize after .env is loaded

const app = express()
const PORT = process.env.PORT || 3001

// Trust proxy (required for Render and other hosting platforms)
// Set to 1 to trust first proxy (Render's load balancer)
app.set('trust proxy', 1)

// Create HTTP server for WebSocket support
const server = createServer(app)

// Security middleware
app.use(helmet())
app.use(securityHeaders)
app.use(requestId)
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Rate limiting
app.use(apiLimiter)

// Body parsing and compression
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging and monitoring
app.use((req: any, res: any, next: any) => {
  const startTime = Date.now()
  const ip = (req && (req.ip || (req.headers && (req.headers['x-forwarded-for'] as string)) || req.connection?.remoteAddress)) || 'unknown'
  const requestId = req.headers['x-request-id'] || 'unknown'
  
  monitoringService.incrementRequests()
  
  logger.info(`${req.method} ${req.path} - ${ip} [${requestId}]`)
  
  // Record response time
  res.on('finish', () => {
    const responseTime = Date.now() - startTime
    monitoringService.recordResponseTime(responseTime)
    
    if (res.statusCode >= 400) {
      monitoringService.incrementErrors()
    }
  })
  
  next()
})

// Routes
app.use('/api/health', healthRoutes)
app.use('/health', healthRoutes) // Alias for Render health checks
app.use('/api/auth', authLimiter, authRoutes) // Stricter rate limiting for auth
app.use('/api/swap', swapRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/portfolio', portfolioRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/social', socialRoutes)

// Root endpoint
app.get('/', (req: any, res: any) => {
  res.json({
    name: 'AutoXShift API v2.0',
    version: '2.0.0',
    description: 'AI-Powered Cross-Chain Financial Ecosystem',
    status: 'running',
    features: [
      'Cross-chain swaps',
      'AI portfolio assistant',
      'Campaign fundraising',
      'Real-time analytics',
      'WebSocket support',
      'Notifications',
      'Social feed',
    ],
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use('*', (req: any, res: any) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  })
})

// Error handling
app.use(errorHandler)

// Initialize WebSocket server
websocketService.initialize(server)

// Initialize database connection (with retry for production)
const initDatabase = async () => {
  try {
    const connected = await db.testConnection()
    if (connected) {
      logger.info('✅ Database connection successful')
    } else {
      logger.warn('⚠️  Database connection failed - some features may be unavailable')
      // Retry after 5 seconds in production if failed
      if (process.env.NODE_ENV === 'production') {
        setTimeout(initDatabase, 5000)
      }
    }
  } catch (error) {
    logger.error('Database connection error:', error)
    // Retry after 5 seconds in production
    if (process.env.NODE_ENV === 'production') {
      setTimeout(initDatabase, 5000)
    }
  }
}

// Start database initialization (non-blocking)
initDatabase()

// Start server (Render uses PORT env var, default to 3001 for local)
const serverPort = parseInt(process.env.PORT || '3001', 10)
server.listen(serverPort, '0.0.0.0', () => {
  logger.info(`🚀 AutoXShift API v2.0 server running on port ${serverPort}`)
  logger.info(`📊 Health check: http://localhost:${serverPort}/api/health`)
  logger.info(`🔄 Swap API: http://localhost:${serverPort}/api/swap`)
  logger.info(`🤖 AI API: http://localhost:${serverPort}/api/ai`)
  logger.info(`🎯 Campaigns API: http://localhost:${serverPort}/api/campaigns`)
  logger.info(`📈 Analytics API: http://localhost:${serverPort}/api/analytics`)
  logger.info(`🔔 Notifications API: http://localhost:${serverPort}/api/notifications`)
  logger.info(`👥 Social API: http://localhost:${serverPort}/api/social`)
  logger.info(`🔌 WebSocket: ws://localhost:${serverPort}/ws`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  await db.close()
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

export default app
