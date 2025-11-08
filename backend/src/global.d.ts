// Global type definitions for Express
import { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        walletAddress: string
        [key: string]: any
      }
      userId?: string
      walletAddress?: string
      requestId?: string
    }
  }
}

declare module 'express';
declare module 'cors';
declare module 'compression';

