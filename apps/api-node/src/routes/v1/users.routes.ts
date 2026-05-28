import { Router } from 'express'
import { prisma, rawPrisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'

const router: Router = Router()

// 1. GET /v1/users/history — Retrieve request history for current user
router.get('/history', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // 1. Fetch user's requests (including soft-deleted ones since history needs them,
    // but wait! prisma middleware automatically filters deletedAt: null unless we bypass it or use rawPrisma)
    // Since the prisma softDelete extension filters deletedAt: null by default,
    // to retrieve the user's FULL history (including processed/deleted requests),
    // we should use rawPrisma!
    const requests = await rawPrisma.request.findMany({
      where: {
        usersId: req.user.id,
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
        show: {
          select: {
            id: true,
            showName: true,
            slug: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    })

    // 2. Fetch user's favorites to highlight matches
    const favorites = await prisma.favorite.findMany({
      where: {
        usersId: req.user.id,
      },
      select: {
        artist: true,
        title: true,
      },
    })

    // Create a set of "artist||title" lowercase strings for quick matching
    const favoritesSet = new Set(
      favorites.map((f) => `${f.artist.toLowerCase()}||${f.title.toLowerCase()}`)
    )

    // 3. Map requests and add isFavorite property
    const history = requests.map((reqItem) => {
      const artist = reqItem.song?.artist || ''
      const title = reqItem.song?.title || ''
      const isFavorite = favoritesSet.has(`${artist.toLowerCase()}||${title.toLowerCase()}`)

      return {
        id: reqItem.id,
        legacyId: reqItem.legacyId,
        singerName: reqItem.singerName,
        keyChange: reqItem.keyChange,
        status: reqItem.status,
        submittedAt: reqItem.submittedAt,
        song: reqItem.song,
        show: reqItem.show,
        isFavorite,
      }
    })

    return res.status(200).json({
      success: true,
      history,
    })
  } catch (error: any) {
    console.error('Error fetching user history:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve request history.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 2. GET /v1/users/favorites — List all favorites for current user
router.get('/favorites', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: {
        usersId: req.user.id,
      },
      orderBy: [
        { artist: 'asc' },
        { title: 'asc' },
      ],
    })

    return res.status(200).json({
      success: true,
      favorites,
    })
  } catch (error: any) {
    console.error('Error fetching favorites:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve favorites.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 3. POST /v1/users/favorites — Add a song to favorites
router.post('/favorites', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { artist, title } = req.body

  if (!artist || !title) {
    return res.status(400).json({
      success: false,
      message: 'artist and title are required fields.',
    })
  }

  try {
    // Upsert or findFirst+create to avoid duplicate key errors on compound index
    const cleanArtist = String(artist).trim()
    const cleanTitle = String(title).trim()

    const favorite = await prisma.favorite.upsert({
      where: {
        usersId_artist_title: {
          usersId: req.user.id,
          artist: cleanArtist,
          title: cleanTitle,
        },
      },
      update: {}, // No updates needed if already exists
      create: {
        usersId: req.user.id,
        artist: cleanArtist,
        title: cleanTitle,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Favorite added successfully.',
      favorite,
    })
  } catch (error: any) {
    console.error('Error adding favorite:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to add favorite.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 4. DELETE /v1/users/favorites/:id — Remove a favorite
router.delete('/favorites/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string

  try {
    const favorite = await prisma.favorite.findUnique({
      where: {
        id: id,
      },
    })

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found.',
      })
    }

    if (favorite.usersId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to delete this favorite.',
      })
    }

    await prisma.favorite.delete({
      where: {
        id: id,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Favorite removed successfully.',
    })
  } catch (error: any) {
    console.error('Error deleting favorite:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to remove favorite.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 5. GET /v1/users/profile — Retrieve detailed user profile including hostProfile status
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      include: {
        hostProfile: true,
      },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        roles: user.roles,
        businessName: user.businessName,
        singerAbout: user.singerAbout,
        subscriptionStatus: user.hostProfile?.subscriptionStatus || 'inactive',
      },
    })
  } catch (error: any) {
    console.error('Error fetching user profile:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
