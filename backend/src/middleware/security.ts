import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger'

// Enhanced rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Stricter limit for sensitive endpoints
  message: 'Too many requests. Please try again later.',
})

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 login attempts per hour
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true,
})

// Request ID middleware for tracing
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  req.headers['x-request-id'] = id
  res.setHeader('X-Request-ID', id)
  next()
}

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By')
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    )
  }
  
  next()
}

// Input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Basic XSS prevention
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize)
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key])
      }
      return sanitized
    }
    return obj
  }

  if (req.body) {
    req.body = sanitize(req.body)
  }
  if (req.query) {
    req.query = sanitize(req.query)
  }
  if (req.params) {
    req.params = sanitize(req.params)
  }

  next()
}

// IP whitelist (optional, for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn(`IP ${clientIP} attempted to access restricted endpoint: ${req.path}`)
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied',
      })
      return
    }
    
    next()
  }
}

