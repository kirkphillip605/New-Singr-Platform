import { Router } from 'express'
import { prisma, rawPrisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { optionalAuth } from '../../middleware/auth.middleware.js'

const router: Router = Router()

// 1. GET /shows/nearby — Get nearby active public shows sorted by distance
router.get('/nearby', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const lat = parseFloat(req.query.lat as string)
  const lon = parseFloat(req.query.lon as string)
  const radiusMiles = parseFloat(req.query.radius as string) || 50

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({
      success: false,
      message: 'Query parameters lat and lon are required and must be valid numbers.',
    })
  }

  try {
    // We run a raw query to calculate Harvesine distance
    // Using 3959 for miles. If kilometer is preferred: 6371
    const nearbyShows = await prisma.$queryRaw<any[]>`
      SELECT 
        s.shows_id as id,
        s.legacy_id as "legacyId",
        s.show_name as "showName",
        s.slug,
        s.is_accepting as "isAccepting",
        s.serial_counter as "serialCounter",
        v.name as "venueName",
        v.address1,
        v.city,
        v.state,
        v.lat,
        v.lon,
        (3959 * acos(
          cos(radians(${lat})) * cos(radians(v.lat)) * 
          cos(radians(v.lon) - radians(${lon})) + 
          sin(radians(${lat})) * sin(radians(v.lat))
        )) AS distance
      FROM shows s
      INNER JOIN venues v ON s.venues_id = v.venues_id
      WHERE s.deleted_at IS NULL 
        AND s.is_accepting = true 
        AND v.is_private = false
        AND v.deleted_at IS NULL
      ORDER BY distance ASC
      LIMIT 100
    `

    // Filter by radius client-side or directly in raw query (we can filter in raw query, but to avoid acos null issues we filter in JS or use HAVING)
    const filteredShows = nearbyShows.filter((s) => s.distance <= radiusMiles)

    return res.status(200).json({
      success: true,
      shows: filteredShows,
    })
  } catch (error: any) {
    console.error('Error fetching nearby shows:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve nearby shows.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 2. POST /shows/:slug/join — Join a show (requires PIN check if private)
router.post('/:slug/join', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const slug = req.params.slug as string
  const { pin_code } = req.body

  try {
    const show = await rawPrisma.show.findFirst({
      where: {
        slug: slug,
        deletedAt: null,
      },
      include: {
        venue: true,
      },
    })

    if (!show) {
      return res.status(404).json({
        success: false,
        message: `Show with slug '${slug}' not found.`,
      })
    }

    // Verify PIN code for private shows
    if (show.pinCode) {
      if (!pin_code) {
        return res.status(401).json({
          success: false,
          pinRequired: true,
          message: 'PIN code is required to join this private show.',
        })
      }

      if (show.pinCode !== String(pin_code)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid PIN code. Access denied.',
        })
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully joined show.',
      show: {
        id: show.id,
        legacyId: show.legacyId,
        showName: show.showName,
        slug: show.slug,
        isAccepting: show.isAccepting,
        serialCounter: show.serialCounter,
        venueName: show.venue?.name || '',
        address: show.venue?.address1 || '',
        isPrivate: show.venue?.isPrivate || false,
      },
    })
  } catch (error: any) {
    console.error('Error joining show:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to join show.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 3. GET /shows/:slug/catalog — Query songbook catalog (uses Postgres FTS on searchVector)
router.get('/:slug/catalog', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const slug = req.params.slug as string
  const q = req.query.q as string
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
  const offset = (page - 1) * limit

  try {
    // Find the active show
    const show = await prisma.show.findFirst({
      where: {
        slug: slug,
        deletedAt: null,
      },
    })

    if (!show) {
      return res.status(404).json({
        success: false,
        message: `Show with slug '${slug}' not found.`,
      })
    }

    if (!show.activeSystemsId) {
      return res.status(200).json({
        success: true,
        message: 'No hardware system is currently active for this show.',
        songs: [],
        pagination: { page, limit, total: 0, pages: 0 },
      })
    }

    let songs: any[] = []
    let totalCount = 0

    if (q && q.trim().length >= 2) {
      // Clean query search term for simple tsquery (e.g. spaces replaced by & or plainto_tsquery)
      const searchQuery = q.trim()

      // Full text search query
      songs = await prisma.$queryRaw<any[]>`
        SELECT 
          songs_id as id,
          artist,
          title,
          brand
        FROM songs
        WHERE systems_id = ${show.activeSystemsId}::uuid
          AND search_vector @@ plainto_tsquery('simple', ${searchQuery})
        ORDER BY artist ASC, title ASC
        LIMIT ${limit} OFFSET ${offset}
      `

      // Count total matches
      const counts = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int as count
        FROM songs
        WHERE systems_id = ${show.activeSystemsId}::uuid
          AND search_vector @@ plainto_tsquery('simple', ${searchQuery})
      `
      totalCount = counts[0]?.count || 0
    } else {
      // Regular lookup (no search query)
      songs = await prisma.song.findMany({
        where: {
          systemsId: show.activeSystemsId,
        },
        select: {
          id: true,
          artist: true,
          title: true,
          brand: true,
        },
        orderBy: [{ artist: 'asc' }, { title: 'asc' }],
        take: limit,
        skip: offset,
      })

      totalCount = await prisma.song.count({
        where: {
          systemsId: show.activeSystemsId,
        },
      })
    }

    return res.status(200).json({
      success: true,
      songs,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching show catalog:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve show catalog.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
