import { Pool, QueryResult } from 'pg'
import { logger } from '../utils/logger'

class Database {
  private pool: Pool | null = null
  private initialized = false

  constructor() {
    // Don't initialize in constructor - wait for explicit init call
  }

  // Public method to initialize after .env is loaded
  initialize() {
    if (this.initialized && this.pool) {
      return // Already initialized
    }
    
    try {
      // Support both connection string (Supabase) and individual variables
      let poolConfig: any
      
      // Check DATABASE_URL first (with debug logging)
      const dbUrl = process.env.DATABASE_URL?.trim()
      console.log('🔍 Database init - DATABASE_URL check:', {
        exists: !!dbUrl,
        length: dbUrl?.length || 0,
        preview: dbUrl ? dbUrl.substring(0, 50) + '...' : 'N/A',
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB_'))
      })
      
      if (dbUrl) {
        // Use connection string (Supabase format)
        console.log('🔗 Using DATABASE_URL connection string', { 
          hasUrl: !!dbUrl,
          urlLength: dbUrl.length,
          startsWith: dbUrl.substring(0, 30) + '...',
          containsSupabase: dbUrl.includes('supabase')
        })
        poolConfig = {
          connectionString: dbUrl,
          ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000, // Increased timeout for Supabase
        }
        logger.info('Using DATABASE_URL connection string')
      } else {
        console.warn('⚠️ DATABASE_URL not found in process.env, using individual DB variables')
        logger.warn('DATABASE_URL not found, using individual DB variables')
        // Use individual variables (local development)
        poolConfig = {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || 'autoxshift',
          user: process.env.DB_USER || 'autoxshift',
          password: process.env.DB_PASSWORD || 'autoxshift123',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        }
      }
      
      this.pool = new Pool(poolConfig)

      this.pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err)
      })

      this.initialized = true
      logger.info('Database connection pool initialized')
    } catch (error) {
      logger.error('Failed to initialize database:', error)
      this.pool = null
    }
  }

  async query<T extends Record<string, any> = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not initialized')
    }
    const start = Date.now()
    try {
      const res = await this.pool.query<T>(text, params)
      const duration = Date.now() - start
      logger.debug('Executed query', { text, duration, rows: res.rowCount })
      return res
    } catch (error) {
      logger.error('Database query error', { text, error })
      throw error
    }
  }

  async getClient() {
    if (!this.pool) {
      throw new Error('Database not initialized')
    }
    return this.pool.connect()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT NOW()')
      return true
    } catch (error: any) {
      // Enhanced error logging for debugging
      const dbUrl = process.env.DATABASE_URL || 'N/A'
      const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
      
      logger.error('Database connection test failed:', {
        error: error?.message || error,
        code: error?.code,
        severity: error?.severity,
        // Show connection details (masked password)
        connectionInfo: urlParts ? {
          user: urlParts[1],
          passwordLength: urlParts[2]?.length || 0,
          host: urlParts[3],
          port: urlParts[4],
          database: urlParts[5],
          urlPreview: dbUrl.substring(0, 30) + '...' + dbUrl.substring(dbUrl.length - 20)
        } : 'Could not parse connection string',
        suggestion: error?.code === 'XX000' || error?.message?.includes('Tenant or user not found')
          ? 'Check: 1) Username format (use "postgres" for direct, "postgres.{project-ref}" for pooler), 2) Password encoding, 3) Project reference in host/username'
          : 'Verify DATABASE_URL format and credentials'
      })
      return false
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      logger.info('Database connection pool closed')
    }
  }
}

// Export class instead of instance so we can initialize after .env loads
export { Database }
export const db = new Database() // Keep for backward compatibility, but will be reinitialized

