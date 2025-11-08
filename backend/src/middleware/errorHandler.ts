import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export function createError(message: string, statusCode: number = 500): AppError {
  const error: AppError = new Error(message)
  error.statusCode = statusCode
  error.isOperational = true
  return error
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = (err as AppError).statusCode || 500
  const isOperational = (err as AppError).isOperational || false

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    })
  } else {
    logger.warn('Client error:', {
      message: err.message,
      path: req.path,
      method: req.method,
      statusCode,
    })
  }

  // Don't leak error details in production for non-operational errors
  const message = 
    process.env.NODE_ENV === 'production' && !isOperational
      ? 'An error occurred'
      : err.message

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: getErrorName(statusCode),
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      path: req.path,
    }),
    timestamp: new Date().toISOString(),
  })
}

function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Validation Error',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
  }

  return errorNames[statusCode] || 'Error'
}

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
