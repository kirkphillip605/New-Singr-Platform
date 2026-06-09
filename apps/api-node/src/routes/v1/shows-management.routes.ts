import { Router } from 'express'
import { prisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireRoles } from '../../middleware/rbac.middleware.js'
import { generateUniqueShowSlug } from '../../lib/slug.js'

const router: Router = Router()

// Helper to check authorization and retrieve owner Host ID
async function getOwnerHostIdAndVerify(userId: string, targetHostId: string | null): Promise<string | null> {
  if (!targetHostId) return null
  if (userId === targetHostId) return targetHostId

  const teamMember = await prisma.hostTeamMember.findFirst({
    where: {
      hostUsersId: targetHostId,
      userId,
      role: 'host_manager',
    },
  })
  return teamMember ? targetHostId : null
}

// Helper to get host ID for creation operations
async function getHostIdForUser(user: any): Promise<string> {
  if (user.roles.includes('host')) {
    return user.id
  }
  const membership = await prisma.hostTeamMember.findFirst({
    where: {
      userId: user.id,
      role: 'host_manager',
    },
  })
  if (!membership) {
    throw new Error('No active host team membership found.')
  }
  return membership.hostUsersId
}

// 0. GET /v1/shows — List all shows manageable by the host/manager
router.get('/', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const manageableHostIds = [req.user.id]
    const memberships = await prisma.hostTeamMember.findMany({
      where: {
        userId: req.user.id,
        role: 'host_manager',
      },
      select: {
        hostUsersId: true,
      },
    })
    memberships.forEach((m) => manageableHostIds.push(m.hostUsersId))

    const shows = await prisma.show.findMany({
      where: {
        hostUsersId: { in: manageableHostIds },
        deletedAt: null,
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            address1: true,
            city: true,
            state: true,
            zip: true,
            isPrivate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const formattedShows = shows.map((show) => ({
      id: show.id,
      legacyId: show.legacyId,
      showName: show.showName,
      slug: show.slug,
      pinCode: show.pinCode,
      isAccepting: show.isAccepting,
      activeSystemsId: show.activeSystemsId,
      createdAt: show.createdAt,
      venueName: show.venue?.name || 'Unknown Venue',
      venue: show.venue,
    }))

    return res.status(200).json({
      success: true,
      shows: formattedShows,
    })
  } catch (error: any) {
    console.error('Error fetching shows:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shows.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 1. POST /v1/shows — Create a show linked to a venue
router.post('/', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  const venueId = req.body.venueId as string
  const showName = req.body.showName as string
  const pinCode = req.body.pinCode as string | undefined

  if (!venueId || !showName) {
    return res.status(400).json({
      success: false,
      message: 'venueId and showName are required fields.',
    })
  }

  try {
    const venue = await prisma.venue.findFirst({
      where: {
        id: venueId,
        deletedAt: null,
      },
    })

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found.',
      })
    }

    // Determine the host owner for this new show
    const hostUsersId = await getHostIdForUser(req.user)
    
    // Verify the user is allowed to create shows for this venue
    const isAuthorized = await getOwnerHostIdAndVerify(req.user.id, venue.createdBy)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to create shows for this venue.',
      })
    }

    // Generate a globally unique slug from the show name + venue name.
    // Retry on the off-chance of a race that trips the DB unique index.
    let show
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = await generateUniqueShowSlug(showName, venue.name)
      try {
        show = await prisma.show.create({
          data: {
            venuesId: venue.id,
            hostUsersId,
            showName: showName.trim(),
            slug,
            pinCode: pinCode ? String(pinCode).trim() : null,
            isAccepting: false,
            serialCounter: 0,
            createdBy: req.user.id,
          },
        })
        break
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 4) {
          continue
        }
        throw err
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Show created successfully.',
      show,
    })
  } catch (error: any) {
    console.error('Error creating show:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create show.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 2. PATCH /v1/shows/:id — Update show settings
router.patch('/:id', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string
  const showName = req.body.showName as string | undefined
  const pinCode = req.body.pinCode as string | undefined
  const activeSystemsId = req.body.activeSystemsId as string | null | undefined

  try {
    const show = await prisma.show.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        venue: { select: { name: true } },
      },
    })

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found.',
      })
    }

    const isAuthorized = await getOwnerHostIdAndVerify(req.user.id, show.hostUsersId)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to update this show.',
      })
    }

    const updateData: any = {}

    if (showName !== undefined && showName.trim() !== show.showName) {
      updateData.showName = showName.trim()
      // Regenerate the slug from the new show name + venue name.
      updateData.slug = await generateUniqueShowSlug(showName, show.venue?.name, {
        excludeShowId: id,
      })
    }

    if (pinCode !== undefined) {
      updateData.pinCode = pinCode ? String(pinCode).trim() : null
    }

    if (activeSystemsId !== undefined) {
      if (activeSystemsId === null) {
        updateData.activeSystemsId = null
      } else {
        // Validate that this hardware system belongs to the host
        const system = await prisma.system.findFirst({
          where: {
            id: activeSystemsId,
            hostUsersId: show.hostUsersId,
            deletedAt: null,
          },
        })

        if (!system) {
          return res.status(400).json({
            success: false,
            message: 'Invalid system ID. The hardware system must belong to the same host.',
          })
        }

        updateData.activeSystemsId = activeSystemsId
      }
    }

    const updatedShow = await prisma.show.update({
      where: { id },
      data: {
        ...updateData,
        serialCounter: { increment: 1 },
        updatedBy: req.user.id,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Show settings updated successfully.',
      show: updatedShow,
    })
  } catch (error: any) {
    console.error('Error updating show:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update show.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 3. PATCH /v1/shows/:id/accepting — Toggle show isAccepting requests status
router.patch('/:id/accepting', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string
  const { isAccepting } = req.body

  if (isAccepting === undefined) {
    return res.status(400).json({
      success: false,
      message: 'isAccepting (boolean) is a required field in the request body.',
    })
  }

  try {
    const show = await prisma.show.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found.',
      })
    }

    const isAuthorized = await getOwnerHostIdAndVerify(req.user.id, show.hostUsersId)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to manage this show.',
      })
    }

    const updatedShow = await prisma.show.update({
      where: { id },
      data: {
        isAccepting: Boolean(isAccepting),
        serialCounter: { increment: 1 },
        updatedBy: req.user.id,
      },
    })

    return res.status(200).json({
      success: true,
      message: `Show ${updatedShow.isAccepting ? 'is now accepting' : 'has stopped accepting'} requests.`,
      show: {
        id: updatedShow.id,
        isAccepting: updatedShow.isAccepting,
        serialCounter: updatedShow.serialCounter,
      },
    })
  } catch (error: any) {
    console.error('Error toggling show accepting status:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update accepting status.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 4. DELETE /v1/shows/:id — Soft-delete a show
router.delete('/:id', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string

  try {
    const show = await prisma.show.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found.',
      })
    }

    const isAuthorized = await getOwnerHostIdAndVerify(req.user.id, show.hostUsersId)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to delete this show.',
      })
    }

    await prisma.show.update({
      where: { id },
      data: {
        isAccepting: false,
        serialCounter: { increment: 1 },
        deletedBy: req.user.id,
        deletedAt: new Date(),
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Show deleted successfully.',
    })
  } catch (error: any) {
    console.error('Error deleting show:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete show.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
