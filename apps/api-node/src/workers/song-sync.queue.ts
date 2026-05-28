import { Queue } from 'bullmq'
import pino from 'pino'

const logger = pino()
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380'
const parsed = new URL(redisUrl)
const connection = {
  host: parsed.hostname || 'localhost',
  port: parsed.port ? parseInt(parsed.port, 10) : 6379,
  username: parsed.username || undefined,
  password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
  maxRetriesPerRequest: null,
}

export const songSyncQueue = new Queue('song-sync', {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

/**
 * Triggers a debounced songbook sync job for a specific hardware system.
 * If a sync job is already queued (waiting in the delay window), it is removed and
 * rescheduled with a fresh 5-second delay.
 */
export async function triggerSongSyncDebounce(systemId: string) {
  try {
    const jobId = `sync-${systemId}`
    const existingJob = await songSyncQueue.getJob(jobId)

    if (existingJob) {
      // Remove existing job to reset the debounce timer
      await existingJob.remove()
      logger.info(`🔄 Debounce reset: Removed existing job ${jobId}`)
    }

    // Queue new job with 5-second delay
    await songSyncQueue.add(
      'sync',
      { systemId },
      {
        jobId,
        delay: 5000,
      }
    )
    logger.info(`✅ Songbook sync job queued for system ${systemId} (5s delay)`)
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), `❌ Failed to queue song sync job for ${systemId}`)
  }
}
