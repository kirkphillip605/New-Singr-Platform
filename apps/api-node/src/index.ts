import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import { prisma } from '@singr/db'
import { redis } from './lib/redis.js'
import authRouter from './routes/auth.routes.js'
import legacyRouter from './routes/legacy/okj-adapter.routes.js'
import { errorHandler } from './middleware/error-handler.middleware.js'
import { rateLimiter } from './middleware/rate-limit.middleware.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const port = process.env.PORT || 3001
const logger = pino()

// Setup trust proxy so Express rate limiters read client IP addresses correctly behind reverse proxies
app.set('trust proxy', 1)

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3010',
  'http://localhost:3011',
  'http://localhost:3012',
  'http://localhost:3013',
  'https://singrkaraoke.com',
  'https://host.singrkaraoke.com',
  'https://admin.singrkaraoke.com',
  'https://app.singrkaraoke.com',
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or desktop agents)
      if (!origin) return callback(null, true)
      
      const isAllowed = allowedOrigins.includes(origin) || 
        origin.endsWith('.singrkaraoke.com') ||
        /^http:\/\/localhost:\d+$/.test(origin)

      if (isAllowed) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ip: req.ip,
      duration: `${Date.now() - start}ms`,
    })
  })
  next()
})

// Apply global rate limiting to all requests (e.g. max 100 requests per 10 seconds)
app.use(rateLimiter({ limit: 100, windowSeconds: 10, keyPrefix: 'global' }))

// Health check endpoint (checks database and redis status)
app.get('/health', async (_req, res) => {
  try {
    // Ping DB
    await prisma.$queryRaw`SELECT 1`
    
    // Ping Redis
    const redisStatus = await redis.ping()
    
    res.status(200).json({
      success: true,
      status: 'healthy',
      database: 'connected',
      redis: redisStatus === 'PONG' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    logger.error('Health check failed:', error)
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  }
})

// Better Auth endpoints
app.use('/api/auth', authRouter)

// Legacy OpenKJ Adapter Routes (Phase 4)
app.use('/api/v1/legacy', legacyRouter)

// Placeholder for Modern API endpoints (Phase 5)
app.use('/api/v1', (req, res, next) => {
  if (req.path !== '/health') {
    return res.status(503).json({
      success: false,
      message: 'Modern API routes are currently being deployed (Phase 5).',
    })
  }
  next()
})

// Global Error Handler
app.use(errorHandler)

// Start Server
app.listen(port, () => {
  logger.info(`🎤 Singr API server running on port ${port}`)
})
