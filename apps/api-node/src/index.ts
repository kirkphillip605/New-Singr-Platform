import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pino from 'pino'
import { prisma } from '@singr/db'
import { redis } from './lib/redis.js'
import { createServer } from 'http'
import { initWebSocketServer } from './ws/ws-server.js'
import './workers/song-sync.worker.js'
import legacyRouter from './routes/legacy/okj-adapter.routes.js'
import { errorHandler } from './middleware/error-handler.middleware.js'
import { rateLimiter } from './middleware/rate-limit.middleware.js'

// Modern API v1 Routers (Phase 5)
import showsRouter from './routes/v1/shows.routes.js'
import requestsRouter from './routes/v1/requests.routes.js'
import usersRouter from './routes/v1/users.routes.js'
import venuesRouter from './routes/v1/venues.routes.js'
import systemsRouter from './routes/v1/systems.routes.js'
import adminRouter from './routes/v1/admin.routes.js'
import showsManagementRouter from './routes/v1/shows-management.routes.js'
import teamsRouter from './routes/v1/teams.routes.js'
import billingRouter from './routes/v1/billing.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
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

// Body parsers with raw body preservation for Stripe webhook signature verification
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js'

// Auth-specific rate limiting
app.use('/api/auth/sign-in', rateLimiter({ limit: 10, windowSeconds: 60, keyPrefix: 'auth-signin' }))
app.use('/api/auth/forget-password', rateLimiter({ limit: 3, windowSeconds: 60, keyPrefix: 'auth-forget' }))
app.use('/api/auth/send-verification-email', rateLimiter({ limit: 3, windowSeconds: 60, keyPrefix: 'auth-verify' }))
app.use('/api/auth/sign-up', rateLimiter({ limit: 5, windowSeconds: 60, keyPrefix: 'auth-signup' }))

// Mount Better Auth handler BEFORE body parsers to avoid request hanging or 404s
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf
    },
  })
)
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

// Legacy OpenKJ Adapter Routes (Phase 4)
app.use('/api/v1/legacy', legacyRouter)

// Modern API v1 Routes (Phase 5)
app.use('/api/v1/shows', showsRouter)
app.use('/api/v1/shows', showsManagementRouter)
app.use('/api/v1/requests', requestsRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/venues', venuesRouter)
app.use('/api/v1/systems', systemsRouter)
app.use('/api/v1/admin', adminRouter)
app.use('/api/v1/teams', teamsRouter)
app.use('/api/v1/billing', billingRouter)

// Global Error Handler
app.use(errorHandler)

// Create HTTP server and attach WebSocket server
const server = createServer(app)
initWebSocketServer(server)

// Start Server
server.listen(port, () => {
  logger.info(`🎤 Singr API server running on port ${port}`)
})
