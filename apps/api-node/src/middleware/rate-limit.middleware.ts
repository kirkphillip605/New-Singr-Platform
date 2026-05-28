import type { Request, Response, NextFunction } from 'express'
import { redis } from '../lib/redis.js'

interface RateLimiterOptions {
  limit: number
  windowSeconds: number
  keyPrefix?: string
}

/**
 * Express middleware that enforces a fixed-window rate limit using Redis.
 */
export const rateLimiter = (options: RateLimiterOptions) => {
  const { limit, windowSeconds, keyPrefix = 'api' } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Determine client IP address
      const ip: string | string[] = 
        req.headers['x-forwarded-for'] || 
        req.socket.remoteAddress || 
        'unknown-ip'
      
      const clientIp = (Array.isArray(ip) ? (ip[0] || 'unknown-ip') : (ip.split(',')[0] || 'unknown-ip')).trim()
      const redisKey = `rate-limit:${keyPrefix}:${clientIp}:${req.method}:${req.path}`

      // Increment request count in Redis
      const currentRequests = await redis.incr(redisKey)

      if (currentRequests === 1) {
        // Set TTL on the first request in the window
        await redis.expire(redisKey, windowSeconds)
      }

      // Set standard RateLimit headers
      res.setHeader('X-RateLimit-Limit', limit)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentRequests))

      if (currentRequests > limit) {
        const ttl = await redis.ttl(redisKey)
        res.setHeader('Retry-After', ttl > 0 ? ttl : windowSeconds)
        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: `Too many requests to this endpoint. Please retry after ${ttl > 0 ? ttl : windowSeconds} seconds.`,
        })
      }

      next()
    } catch (error) {
      console.error('Rate Limiter Error (fail-open):', error)
      // Fail-open: if Redis connection is temporarily down, allow request to complete
      next()
    }
  }
}
