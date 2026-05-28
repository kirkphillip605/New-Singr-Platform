import { Router } from 'express'
import { prisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { emitToShow } from '../../ws/ws-server.js'

const router: Router = Router()

// Helper function to check if the user is a host or manager for a show
async function checkShowHostOrManager(userId: string, hostUsersId: string | null): Promise<boolean> {
  if (!hostUsersId) return false
  if (userId === hostUsersId) return true

  const teamMember = await prisma.hostTeamMember.findFirst({
    where: {
      hostUsersId,
      userId,
      role: 'host_manager',
    },
  })
  return !!teamMember
}

// 1. POST /v1/requests — Submit a song request (singer endpoint)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const showId = req.body.showId as string
  const songId = req.body.songId as string
  const singerName = req.body.singerName as string
  const keyChange = req.body.keyChange

  if (!showId || !songId || !singerName) {
    return res.status(400).json({
      success: false,
      message: 'showId, songId, and singerName are required fields.',
    })
  }

  const pitchShift = typeof keyChange === 'number' ? keyChange : 0
  if (pitchShift < -6 || pitchShift > 6) {
    return res.status(400).json({
      success: false,
      message: 'keyChange must be an integer between -6 and 6.',
    })
  }

  try {
    // 1. Fetch active show
    const show = await prisma.show.findFirst({
      where: {
        id: showId,
        deletedAt: null,
      },
    })

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found.',
      })
    }

    if (!show.isAccepting) {
      return res.status(403).json({
        success: false,
        message: 'This show is not currently accepting requests.',
      })
    }

    if (!show.activeSystemsId) {
      return res.status(400).json({
        success: false,
        message: 'No hardware system is currently active for this show.',
      })
    }

    // 2. Fetch the song in the active system
    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        systemsId: show.activeSystemsId,
      },
    })

    if (!song) {
      return res.status(404).json({
        success: false,
        message: 'Song not found in the active system library.',
      })
    }

    // 3. Create the request and increment show serial counter
    const request = await prisma.$transaction(async (tx) => {
      const createdRequest = await tx.request.create({
        data: {
          showsId: show.id,
          songsId: song.id,
          systemsId: show.activeSystemsId,
          usersId: req.user.id,
          singerName: singerName.trim(),
          keyChange: pitchShift,
          status: 'pending',
        },
        include: {
          song: {
            select: {
              id: true,
              artist: true,
              title: true,
              brand: true,
            },
          },
        },
      })

      await tx.show.update({
        where: { id: show.id },
        data: {
          serialCounter: { increment: 1 },
        },
      })

      return createdRequest
    })

    // Emit WebSocket notification to clients in the show room
    emitToShow(show.id, 'new_request', request)

    return res.status(201).json({
      success: true,
      message: 'Request submitted successfully.',
      request,
    })
  } catch (error: any) {
    console.error('Error submitting request:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to submit request.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 2. GET /v1/requests — View requests for a show (host/singer endpoint)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const showId = req.query.showId as string

  if (!showId) {
    return res.status(400).json({
      success: false,
      message: 'showId query parameter is required.',
    })
  }

  try {
    const show = await prisma.show.findFirst({
      where: {
        id: showId,
        deletedAt: null,
      },
    })

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found.',
      })
    }

    // Check if the authenticated user is host/manager of this show
    const isHostOrManager = await checkShowHostOrManager(req.user.id, show.hostUsersId)

    const whereClause: any = {
      showsId: show.id,
      deletedAt: null,
    }

    if (!isHostOrManager) {
      // Singer view: only return pending, accepted, or playing request statuses
      whereClause.status = { in: ['pending', 'accepted', 'playing'] }
    }

    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
        song: {
          select: {
            id: true,
            artist: true,
            title: true,
            brand: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc',
      },
    })

    return res.status(200).json({
      success: true,
      requests,
    })
  } catch (error: any) {
    console.error('Error fetching requests:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve requests.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 3. PATCH /v1/requests/:id — Update status/details or reorder request
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string
  const { status, keyChange, singerName, submittedAt } = req.body

  try {
    const request = await prisma.request.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        show: true,
      },
    })

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found.',
      })
    }

    const show = request.show
    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Request is not associated with an active show.',
      })
    }

    // Verify host/manager authorization
    const isAuthorized = await checkShowHostOrManager(req.user.id, show.hostUsersId)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to manage this show\'s queue.',
      })
    }

    const updateData: any = {}

    if (status !== undefined) {
      updateData.status = status
    }

    if (keyChange !== undefined) {
      const pitchShift = Number(keyChange)
      if (isNaN(pitchShift) || pitchShift < -6 || pitchShift > 6) {
        return res.status(400).json({
          success: false,
          message: 'keyChange must be an integer between -6 and 6.',
        })
      }
      updateData.keyChange = pitchShift
    }

    if (singerName !== undefined) {
      updateData.singerName = String(singerName).trim()
    }

    if (submittedAt !== undefined) {
      const parsedDate = new Date(submittedAt)
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid submittedAt date string.',
        })
      }
      updateData.submittedAt = parsedDate
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const result = await tx.request.update({
        where: { id: id },
        data: updateData,
        include: {
          song: {
            select: {
              id: true,
              artist: true,
              title: true,
              brand: true,
            },
          },
        },
      })

      await tx.show.update({
        where: { id: show.id },
        data: {
          serialCounter: { increment: 1 },
        },
      })

      return result
    })

    // Emit WebSocket notification to clients in the show room
    emitToShow(show.id, 'queue_reordered', updatedRequest)

    return res.status(200).json({
      success: true,
      message: 'Request updated successfully.',
      request: updatedRequest,
    })
  } catch (error: any) {
    console.error('Error updating request:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update request.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 4. DELETE /v1/requests/:id — Soft-delete a request
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string

  try {
    const request = await prisma.request.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      include: {
        show: true,
      },
    })

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found.',
      })
    }

    const show = request.show
    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Request is not associated with an active show.',
      })
    }

    // A request can be deleted (cancelled) by:
    // 1. The host or team manager
    // 2. The singer who submitted it (if it is still in "pending" status)
    const isHostOrManager = await checkShowHostOrManager(req.user.id, show.hostUsersId)
    const isOwner = request.usersId === req.user.id && request.status === 'pending'

    if (!isHostOrManager && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to cancel this request.',
      })
    }

    await prisma.$transaction(async (tx) => {
      // Soft delete: status = 'processed', deletedAt = now, deletedBy = req.user.id
      await tx.request.update({
        where: { id: id },
        data: {
          status: 'processed',
          deletedAt: new Date(),
          deletedBy: req.user.id,
        },
      })

      await tx.show.update({
        where: { id: show.id },
        data: {
          serialCounter: { increment: 1 },
        },
      })
    })

    // Emit WebSocket notification to clients in the show room
    emitToShow(show.id, 'request_cancelled', { requestId: id })

    return res.status(200).json({
      success: true,
      message: 'Request cancelled successfully.',
    })
  } catch (error: any) {
    console.error('Error soft-deleting request:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel request.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
