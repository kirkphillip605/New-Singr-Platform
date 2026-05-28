import { Router } from 'express'
import { prisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireRoles } from '../../middleware/rbac.middleware.js'
import { redis } from '../../lib/redis.js'

const router: Router = Router()

// Helper to check if user can manage resource created by hostId
async function canManageHostResource(userId: string, creatorId: string | null): Promise<boolean> {
  if (!creatorId) return false
  if (userId === creatorId) return true

  const teamMember = await prisma.hostTeamMember.findFirst({
    where: {
      hostUsersId: creatorId,
      userId,
      role: 'host_manager',
    },
  })
  return !!teamMember
}

// Helper to get all host IDs the user can manage resources for
async function getManageableHostIds(userId: string): Promise<string[]> {
  const hostIds = [userId]
  const memberships = await prisma.hostTeamMember.findMany({
    where: {
      userId,
      role: 'host_manager',
    },
    select: {
      hostUsersId: true,
    },
  })
  memberships.forEach((m) => hostIds.push(m.hostUsersId))
  return hostIds
}

// 1. GET /v1/venues — List all venues manageable by the host/manager
router.get('/', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const manageableHostIds = await getManageableHostIds(req.user.id)

    const venues = await prisma.venue.findMany({
      where: {
        createdBy: { in: manageableHostIds },
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return res.status(200).json({
      success: true,
      venues,
    })
  } catch (error: any) {
    console.error('Error fetching venues:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve venues.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 2. POST /v1/venues — Create a venue (public via mock autocomplete, or private manual)
router.post('/', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  const {
    name,
    address1,
    address2,
    city,
    state,
    zip,
    lat,
    lon,
    isPrivate,
    externalId,
    externalProvider,
    placeType,
    hoursOfOperation,
  } = req.body

  if (!name || !address1 || !city || !state || !zip) {
    return res.status(400).json({
      success: false,
      message: 'name, address1, city, state, and zip are required fields.',
    })
  }

  const isVenuePrivate = Boolean(isPrivate)

  // Public venues must have an externalId (Google Places ID)
  if (!isVenuePrivate && !externalId) {
    return res.status(400).json({
      success: false,
      message: 'Public venues require an externalId from autocomplete.',
    })
  }

  try {
    const venue = await prisma.venue.create({
      data: {
        name,
        address1,
        address2: address2 || null,
        city,
        state,
        zip,
        lat: lat ? parseFloat(lat) : null,
        lon: lon ? parseFloat(lon) : null,
        isPrivate: isVenuePrivate,
        externalId: isVenuePrivate ? null : String(externalId),
        externalProvider: isVenuePrivate ? null : (externalProvider || 'google'),
        placeType: placeType || 'bar',
        hoursOfOperation: hoursOfOperation || null,
        createdBy: req.user.id,
      },
    })

    return res.status(201).json({
      success: true,
      message: `${isVenuePrivate ? 'Private' : 'Public'} venue created successfully.`,
      venue,
    })
  } catch (error: any) {
    console.error('Error creating venue:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A venue with this external ID already exists.',
      })
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to create venue.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 3. PATCH /v1/venues/:id — Update venue details (Private venues only; Public protected)
router.patch('/:id', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string
  const { name, address1, address2, city, state, zip, lat, lon, hoursOfOperation } = req.body

  try {
    const venue = await prisma.venue.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    })

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found.',
      })
    }

    const isAuthorized = await canManageHostResource(req.user.id, venue.createdBy)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to modify this venue.',
      })
    }

    // Constraint: Public venues created through Google autocomplete cannot be edited manually
    if (!venue.isPrivate) {
      return res.status(403).json({
        success: false,
        message: 'Public venues are linked to Google Places and cannot be edited manually. Use sync if details have changed.',
      })
    }

    const updatedVenue = await prisma.venue.update({
      where: { id: id },
      data: {
        name: name !== undefined ? name : venue.name,
        address1: address1 !== undefined ? address1 : venue.address1,
        address2: address2 !== undefined ? address2 : venue.address2,
        city: city !== undefined ? city : venue.city,
        state: state !== undefined ? state : venue.state,
        zip: zip !== undefined ? zip : venue.zip,
        lat: lat !== undefined ? (lat ? parseFloat(lat) : null) : venue.lat,
        lon: lon !== undefined ? (lon ? parseFloat(lon) : null) : venue.lon,
        hoursOfOperation: hoursOfOperation !== undefined ? hoursOfOperation : venue.hoursOfOperation,
        updatedBy: req.user.id,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Private venue updated successfully.',
      venue: updatedVenue,
    })
  } catch (error: any) {
    console.error('Error updating venue:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update venue.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 4. POST /v1/venues/:id/sync — Rate-limited Google Places sync (mock/stub)
router.post('/:id/sync', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string

  try {
    const venue = await prisma.venue.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    })

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found.',
      })
    }

    const isAuthorized = await canManageHostResource(req.user.id, venue.createdBy)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to sync this venue.',
      })
    }

    if (venue.isPrivate) {
      return res.status(400).json({
        success: false,
        message: 'Private venues cannot be synchronized with external providers.',
      })
    }

    // Rate limiting: 1 sync per 24 hours per venue (using Redis)
    const redisKey = `venue:sync:limit:${id}`
    const alreadySynced = await redis.get(redisKey)

    if (alreadySynced) {
      return res.status(429).json({
        success: false,
        message: 'This venue has already been synced within the last 24 hours.',
      })
    }

    // Perform mock sync from Google Places
    // In production, we would use axios/fetch to hit Google Places API with venue.externalId
    const mockSyncedDetails = {
      name: venue.name + ' (Synced)',
      address1: venue.address1,
      city: venue.city,
      state: venue.state,
      zip: venue.zip,
      lat: venue.lat || 30.2672, // Mock coordinates if null
      lon: venue.lon || -97.7431,
      hoursOfOperation: {
        open_now: true,
        periods: [{ close: { day: 0, time: '0200' }, open: { day: 6, time: '1100' } }],
        weekday_text: ['Monday: 11:00 AM – 2:00 AM', 'Tuesday: 11:00 AM – 2:00 AM'],
      },
    }

    const updatedVenue = await prisma.venue.update({
      where: { id: id },
      data: {
        name: mockSyncedDetails.name,
        address1: mockSyncedDetails.address1,
        city: mockSyncedDetails.city,
        state: mockSyncedDetails.state,
        zip: mockSyncedDetails.zip,
        lat: mockSyncedDetails.lat,
        lon: mockSyncedDetails.lon,
        hoursOfOperation: mockSyncedDetails.hoursOfOperation,
        updatedBy: req.user.id,
      },
    })

    // Set Redis flag with 24 hours TTL (86400 seconds)
    await redis.set(redisKey, 'true', 'EX', 86400)

    return res.status(200).json({
      success: true,
      message: 'Venue successfully synced with Google Places.',
      venue: updatedVenue,
    })
  } catch (error: any) {
    console.error('Error syncing venue:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to sync venue.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 5. DELETE /v1/venues/:id — Soft-delete a venue
router.delete('/:id', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string

  try {
    const venue = await prisma.venue.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    })

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found.',
      })
    }

    const isAuthorized = await canManageHostResource(req.user.id, venue.createdBy)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to delete this venue.',
      })
    }

    await prisma.venue.update({
      where: { id: id },
      data: {
        deletedBy: req.user.id,
        deletedAt: new Date(),
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Venue deleted successfully.',
    })
  } catch (error: any) {
    console.error('Error deleting venue:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete venue.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
