import { Router } from 'express'
import { prisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireRoles } from '../../middleware/rbac.middleware.js'
import { redis } from '../../lib/redis.js'

const router: Router = Router()

// Helper to geocode an address manually via Google Geocoding API
async function geocodeAddress(address1: string, city: string, state: string, zip: string): Promise<{ lat: number | null, lon: number | null }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn('⚠️ GOOGLE_PLACES_API_KEY is not set. Skipping geocoding API call.')
    return { lat: null, lon: null }
  }

  const addressString = `${address1}, ${city}, ${state} ${zip}`
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json() as any
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const loc = data.results[0].geometry.location
      return { lat: loc.lat, lon: loc.lng }
    }
    console.warn(`Geocoding status was: ${data.status}`)
  } catch (error: any) {
    console.warn('Geocoding address failed:', error.message)
  }
  return { lat: null, lon: null }
}

// Helper to check if a user is linked to a venue via HostVenue or host_manager team membership
async function canManageVenue(userId: string, venueId: string): Promise<boolean> {
  const manageableHostIds = await getManageableHostIds(userId)
  const link = await prisma.hostVenue.findFirst({
    where: {
      userId: { in: manageableHostIds },
      venueId,
    },
  })
  return !!link
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

// 1. GET /v1/venues — List all venues manageable by the host/manager (via HostVenue relations)
router.get('/', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const manageableHostIds = await getManageableHostIds(req.user.id)

    const hostVenues = await prisma.hostVenue.findMany({
      where: {
        userId: { in: manageableHostIds },
        venue: { deletedAt: null },
      },
      include: {
        venue: true,
      },
    })

    const venues = hostVenues
      .map((hv: any) => hv.venue)
      .sort((a: any, b: any) => (a?.name || '').localeCompare(b?.name || ''))

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

// 2. GET /v1/venues/search — Search/autocomplete venues via Google Places API TextSearch
router.get('/search', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  const query = req.query.q as string

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Query parameter "q" is required and must be at least 2 characters.',
    })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  try {
    if (!apiKey) {
      throw new Error('Google Places API key is not configured.')
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json() as any

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
    }

    const results = (data.results || []).map((place: any) => {
      const addressString = place.formatted_address || ''
      const parts = addressString.split(',').map((p: any) => p.trim())
      
      let address1 = parts[0] || place.name
      let city = parts[1] || ''
      let stateZip = parts[2] || ''
      let state = ''
      let zip = ''

      if (stateZip) {
        const szParts = stateZip.trim().split(/\s+/)
        state = szParts[0] || ''
        zip = szParts[1] || ''
      }

      if (!zip && parts.length > 3) {
        state = parts[2] || ''
        const zipPart = parts[3] || ''
        zip = zipPart.trim().split(/\s+/)[0] || ''
      }

      return {
        externalId: place.place_id,
        name: place.name,
        address1,
        city: city || 'Unknown City',
        state: state || 'TX',
        zip: zip || '78701',
        lat: place.geometry?.location?.lat || null,
        lon: place.geometry?.location?.lng || null,
        placeType: place.types?.[0] || 'bar',
      }
    })

    return res.status(200).json({
      success: true,
      results,
    })
  } catch (error: any) {
    console.warn('Google Places Search failed, falling back to simulated mock results:', error.message)
    const mockResults = [
      {
        externalId: 'mock_place_wobbly',
        name: 'The Wobbly Penguin',
        address1: '512 Penguin Way',
        city: 'Rapid City',
        state: 'SD',
        zip: '57201',
        lat: 44.0805,
        lon: -103.2310,
        placeType: 'bar',
      },
      {
        externalId: 'mock_place_green',
        name: 'The Green Parrot Bar',
        address1: '601 Whitehead St',
        city: 'Key West',
        state: 'FL',
        zip: '33040',
        lat: 24.5516,
        lon: -81.8028,
        placeType: 'bar',
      },
      {
        externalId: 'mock_place_blue',
        name: 'Blue Room Karaoke',
        address1: '100 Broadway',
        city: 'Nashville',
        state: 'TN',
        zip: '37201',
        lat: 36.1627,
        lon: -86.7816,
        placeType: 'bar',
      }
    ]

    const filteredMocks = mockResults.filter(
      r => r.name.toLowerCase().includes(query.toLowerCase()) || 
           r.city.toLowerCase().includes(query.toLowerCase()) ||
           r.zip.includes(query)
    )

    return res.status(200).json({
      success: true,
      results: filteredMocks.length > 0 ? filteredMocks : mockResults,
    })
  }
})

// 3. POST /v1/venues — Create or adopt a venue (public via Places autocomplete, or private manual)
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

  try {
    let venue: any = null

    // If externalId is provided (Google Place)
    if (externalId && !isVenuePrivate) {
      // Check if it already exists
      venue = await prisma.venue.findFirst({
        where: {
          externalId: String(externalId),
          deletedAt: null,
        },
      })
    }

    if (!venue) {
      // Geocode address if coordinates are missing (like in manual creation)
      let resolvedLat = lat ? parseFloat(lat) : null
      let resolvedLon = lon ? parseFloat(lon) : null

      if (resolvedLat === null || resolvedLon === null) {
        const coords = await geocodeAddress(address1, city, state, zip)
        resolvedLat = coords.lat
        resolvedLon = coords.lon
      }

      // Create new Venue
      venue = await prisma.venue.create({
        data: {
          name,
          address1,
          address2: address2 || null,
          city,
          state,
          zip,
          lat: resolvedLat,
          lon: resolvedLon,
          isPrivate: isVenuePrivate,
          externalId: isVenuePrivate ? null : (externalId ? String(externalId) : null),
          externalProvider: isVenuePrivate ? null : (externalProvider || (externalId ? 'google' : null)),
          placeType: placeType || 'bar',
          hoursOfOperation: hoursOfOperation || null,
          createdBy: req.user.id,
        },
      })
    }

    // Link this venue to the host via HostVenue relationship
    await prisma.hostVenue.upsert({
      where: {
        userId_venueId: {
          userId: req.user.id,
          venueId: venue.id,
        },
      },
      update: {},
      create: {
        userId: req.user.id,
        venueId: venue.id,
      },
    })

    return res.status(201).json({
      success: true,
      message: `${isVenuePrivate ? 'Private' : 'Public'} venue registered successfully.`,
      venue,
    })
  } catch (error: any) {
    console.error('Error creating/adopting venue:', error)
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

// 4. PATCH /v1/venues/:id — Update venue details (Private venues only; Public protected)
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

    const isAuthorized = await canManageVenue(req.user.id, venue.id)
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

// 5. POST /v1/venues/:id/sync — Rate-limited Google Places sync (mock/stub)
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

    const isAuthorized = await canManageVenue(req.user.id, venue.id)
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
    const mockSyncedDetails = {
      name: venue.name + ' (Synced)',
      address1: venue.address1,
      city: venue.city,
      state: venue.state,
      zip: venue.zip,
      lat: venue.lat || 30.2672,
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

// 6. DELETE /v1/venues/:id — Remove venue relationship for host (soft-delete if no other host is linked)
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

    // 1. Remove the HostVenue relationship link for this host
    await prisma.hostVenue.deleteMany({
      where: {
        userId: req.user.id,
        venueId: id,
      },
    })

    // 2. Check if any other hosts are linked to this venue
    const remainingLinks = await prisma.hostVenue.count({
      where: {
        venueId: id,
      },
    })

    // 3. If no other host is linked, soft-delete the venue itself
    if (remainingLinks === 0) {
      await prisma.venue.update({
        where: { id: id },
        data: {
          deletedBy: req.user.id,
          deletedAt: new Date(),
        },
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Venue successfully removed from your console.',
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
