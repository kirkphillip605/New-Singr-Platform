import { Redis } from 'ioredis'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure env variables are loaded
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

console.log(`🔌 Initializing Redis client with URL: ${redisUrl}`)

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  reconnectOnError: (err) => {
    const targetError = 'READONLY'
    if (err.message.slice(0, targetError.length) === targetError) {
      return true
    }
    return false
  },
})

redis.on('connect', () => {
  console.log('✅ Redis connected successfully')
})

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err)
})
