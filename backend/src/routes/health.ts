import express from 'express'
import { healthService } from '../services/healthService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * @route GET /api/health
 * @desc Health check endpoint
 */
router.get('/', async (req: any, res: any) => {
  try {
    const health = await healthService.getHealthStatus()
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Health check error:', error)
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * @route GET /api/health/ready
 * @desc Readiness check endpoint
 */
router.get('/ready', async (req: any, res: any) => {
  try {
    const ready = await healthService.isReady()
    
    if (ready) {
      res.json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString()
      })
    } else {
      res.status(503).json({
        success: false,
        status: 'not ready',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    logger.error('Readiness check error:', error)
    res.status(503).json({
      success: false,
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * @route GET /api/health/live
 * @desc Liveness check endpoint
 */
router.get('/live', (req: any, res: any) => {
  res.json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString()
  })
})

/**
 * @route GET /api/health/dns
 * @desc Test DNS resolution for SideShift API
 */
router.get('/dns', async (req: any, res: any) => {
  const dns = require('dns')
  const util = require('util')
  const lookup = util.promisify(dns.lookup)
  
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  }
  
  // Test DNS resolution for sideshift.ai
  try {
    const startTime = Date.now()
    const address = await lookup('sideshift.ai', { family: 4 })
    const duration = Date.now() - startTime
    
    results.tests.push({
      hostname: 'sideshift.ai',
      success: true,
      address: address,
      duration: `${duration}ms`,
      family: 4
    })
  } catch (error: any) {
    results.tests.push({
      hostname: 'sideshift.ai',
      success: false,
      error: error.code || error.message,
      message: error.message
    })
  }
  
  // Test HTTPS connection to SideShift API
  try {
    const axios = require('axios')
    const startTime = Date.now()
    const response = await axios.get('https://sideshift.ai/api/v2/coins', {
      timeout: 5000,
      validateStatus: () => true // Don't throw on any status
    })
    const duration = Date.now() - startTime
    
    results.tests.push({
      test: 'HTTPS connection to SideShift API',
      success: response.status < 500, // Success if not server error
      status: response.status,
      duration: `${duration}ms`,
      note: response.status === 401 ? 'Connection works but needs API key' : 'Connection successful'
    })
  } catch (error: any) {
    results.tests.push({
      test: 'HTTPS connection to SideShift API',
      success: false,
      error: error.code || error.message,
      message: error.message,
      hostname: error.hostname,
      syscall: error.syscall
    })
  }
  
  const allSuccess = results.tests.every((t: any) => t.success)
  
  res.status(allSuccess ? 200 : 503).json({
    success: allSuccess,
    data: results,
    summary: {
      total: results.tests.length,
      passed: results.tests.filter((t: any) => t.success).length,
      failed: results.tests.filter((t: any) => !t.success).length
    }
  })
})

export { router as healthRoutes }
