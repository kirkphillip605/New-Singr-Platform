import { Router } from 'express'
import { prisma } from '@singr/db'
import pino from 'pino'
import { handleCommand } from './okj-commands.js'

const logger = pino()
const router: Router = Router()

// Single POST endpoint at /okj/api.php for OpenKJ desktop client compatibility
router.post('/okj/api.php', async (req, res) => {
  const data = req.body
  const command = data?.command

  if (!command) {
    logger.warn('Legacy API received request with empty command')
    return res.status(200).json({ error: true, errorString: 'Empty command' })
  }

  const apiKey = data?.api_key
  if (!apiKey) {
    logger.warn(`Legacy API received command ${command} without API key`)
    return res.status(200).json({ command, error: true, errorString: 'Missing API key' })
  }

  try {
    // 1. Verify API Key and find active system
    const system = await prisma.system.findFirst({
      where: {
        apiKey: apiKey,
        deletedAt: null,
      },
    })

    if (!system) {
      logger.warn(`Legacy API received invalid API key for command ${command}`)
      return res.status(200).json({ command, error: true, errorString: 'Invalid API key' })
    }

    // 2. Verify system_id matches systemNumber if provided in request
    if (data.system_id !== undefined && data.system_id !== null) {
      const systemIdNum = Number(data.system_id)
      if (system.systemNumber !== systemIdNum) {
        logger.warn(`Legacy API system ID mismatch: expected ${system.systemNumber}, got ${systemIdNum}`)
        return res.status(200).json({
          command,
          error: true,
          errorString: `API Key mismatch: This key is assigned to System ${system.systemNumber}. Please update your system ID.`,
        })
      }
    }

    // 3. Handle command
    const response = await handleCommand(command, data, system)
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json(response)
  } catch (err: any) {
    logger.error(`Error handling legacy command ${command}:`, err)
    return res.status(200).json({
      command,
      error: true,
      errorString: err instanceof Error ? err.message : String(err),
    })
  }
})

export default router
