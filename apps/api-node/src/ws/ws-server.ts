import { Server, Socket } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import { auth } from '../lib/auth.js'
import pino from 'pino'

const logger = pino()
let io: Server | null = null

export function initWebSocketServer(server: HTTPServer): Server {
  io = new Server(server, {
    cors: {
      origin: (_origin, callback) => {
        // Match the same logic as Express CORS
        callback(null, true)
      },
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Middleware for session authentication
  io.use(async (socket: Socket, next) => {
    try {
      const headers = socket.handshake.headers
      const session = await auth.api.getSession({
        headers: headers as any,
      })

      if (session) {
        socket.data.session = session.session
        socket.data.user = session.user
        logger.info(`🔌 WebSocket Authenticated User connected: ${session.user.email} (Socket: ${socket.id})`)
      } else {
        socket.data.session = null
        socket.data.user = null
        logger.info(`🔌 WebSocket Anonymous/Guest connected (Socket: ${socket.id})`)
      }
      next()
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), '❌ WebSocket auth middleware error')
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket: Socket) => {
    // If authenticated, automatically join their personal user room for direct messages
    if (socket.data.user?.id) {
      socket.join(`user:${socket.data.user.id}`)
    }

    // 1. Join a specific show room
    socket.on('join_show', (showId: string) => {
      if (!showId) return
      const cleanShowId = String(showId).trim()
      socket.join(`show:${cleanShowId}`)
      logger.info(`Socket ${socket.id} joined room show:${cleanShowId}`)
    })

    // 2. Leave a specific show room
    socket.on('leave_show', (showId: string) => {
      if (!showId) return
      const cleanShowId = String(showId).trim()
      socket.leave(`show:${cleanShowId}`)
      logger.info(`Socket ${socket.id} left room show:${cleanShowId}`)
    })

    // 3. Direct Message (Host-to-Singer or Singer-to-Host)
    socket.on('direct_message', (data: { showId: string; targetUserId: string; message: string }) => {
      const { showId, targetUserId, message } = data
      if (!showId || !targetUserId || !message) return

      // Emit the message to the target user's personal room
      io?.to(`user:${targetUserId}`).emit('direct_message', {
        showId,
        senderId: socket.data.user?.id || 'guest',
        senderName: socket.data.user?.firstName || 'Guest',
        message: String(message).trim(),
        timestamp: new Date().toISOString(),
      })

      logger.info(`📨 DM from ${socket.data.user?.email || 'guest'} to user ${targetUserId}`)
    })

    socket.on('disconnect', () => {
      logger.info(`🔌 WebSocket Client disconnected: ${socket.id}`)
    })
  })

  return io
}

export function getIO(): Server | null {
  return io
}

/**
 * Emit a real-time event to everyone joined in a specific show room
 */
export function emitToShow(showId: string, event: string, data: any) {
  if (io) {
    const cleanShowId = String(showId).trim()
    io.to(`show:${cleanShowId}`).emit(event, data)
    logger.info(`📢 Broadcasted event "${event}" to show:${cleanShowId}`)
  } else {
    logger.warn('⚠️ Cannot emit: WebSocket server is not initialized.')
  }
}
