import { Router } from 'express'
import { prisma } from '@singr/db'
import type { Prisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { auth } from '../../lib/auth.js'
import { fromNodeHeaders } from 'better-auth/node'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock'
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-05-27.dahlia',
})

const router: Router = Router()

// 1. GET /v1/users/history — Retrieve request history for current user
//
// Query params (all optional):
//   - showId:      string   -> scope to a single show
//   - hours:       number   -> only requests submitted within the last N hours
//   - groupByShow: 'true'   -> return all processed requests grouped by show
//
// Always filters status='processed' and uses the soft-delete-aware `prisma`
// client, so cancelled/soft-deleted requests are excluded and only genuinely
// completed performances are returned.
//
// Response shapes:
//   - ungrouped: { success: true, history: [...] }
//   - grouped:   { success: true, groups: [{ show, requests: [...] }] }
router.get('/history', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const showId = typeof req.query.showId === 'string' ? req.query.showId : undefined
    const groupByShow = req.query.groupByShow === 'true'
    const hoursRaw = req.query.hours
    const hours =
      hoursRaw !== undefined && hoursRaw !== '' && !Number.isNaN(Number(hoursRaw))
        ? Number(hoursRaw)
        : undefined

    // 1. Build the where clause. status='processed' and the user scope always apply.
    const where: Prisma.RequestWhereInput = {
      usersId: req.user.id,
      status: 'processed',
    }

    // ?showId=<id> -> scope to a single show
    if (!groupByShow && showId) {
      where.showsId = showId
    }

    // ?showId=<id>&hours=N -> only requests submitted in the last N hours
    if (!groupByShow && showId && hours !== undefined && hours > 0) {
      where.submittedAt = {
        gte: new Date(Date.now() - hours * 60 * 60 * 1000),
      }
    }

    const requests = await prisma.request.findMany({
      where,
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
    const mapped = requests.map((reqItem) => {
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

    // ?groupByShow=true -> group every processed request by its show
    if (groupByShow) {
      const groupMap = new Map<
        string,
        { show: { id: string; showName: string | null; slug: string | null }; requests: typeof mapped }
      >()

      for (const item of mapped) {
        if (!item.show) continue
        const key = item.show.id
        if (!groupMap.has(key)) {
          groupMap.set(key, { show: item.show, requests: [] })
        }
        groupMap.get(key)!.requests.push(item)
      }

      return res.status(200).json({
        success: true,
        groups: Array.from(groupMap.values()),
      })
    }

    return res.status(200).json({
      success: true,
      history: mapped,
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
  // Favorites are a registered-users-only feature.
  if (req.user.isAnonymous) {
    return res.status(403).json({
      success: false,
      message: 'Favorites are only available to registered users. Please create a free account.',
    })
  }

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
  // Favorites are a registered-users-only feature.
  if (req.user.isAnonymous) {
    return res.status(403).json({
      success: false,
      message: 'Favorites are only available to registered users. Please create a free account.',
    })
  }

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

    let subscriptionStatus = user.hostProfile?.subscriptionStatus || 'inactive'
    const stripeCustomerId = user.stripeCustomerId || user.hostProfile?.stripeCustomerId

    if (stripeCustomerId) {
      try {
        console.log(`🔍 [profile] Querying live Stripe subscriptions for customer ${stripeCustomerId}`)
        const activeSubscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          limit: 1,
        })
        if (activeSubscriptions.data.length > 0) {
          const stripeSub = activeSubscriptions.data[0] as any
          if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
            subscriptionStatus = 'active'
          } else {
            subscriptionStatus = 'inactive'
          }
        } else {
          subscriptionStatus = 'inactive'
        }

        // Asynchronously update database if status is out of sync.
        // NOTE: subscription status only drives hostProfile.subscriptionStatus.
        // The `host` role is owned by profile completion (PUT /profile) and is
        // never added/removed here based on subscription state.
        if (user.hostProfile && user.hostProfile.subscriptionStatus !== subscriptionStatus) {
          await prisma.hostProfile.update({
            where: { userId: user.id },
            data: { subscriptionStatus }
          })
        }
      } catch (stripeErr) {
        console.error('⚠️ [profile] Stripe connection failed, falling back to local DB status:', stripeErr)
      }
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
        subscriptionStatus,
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

// 6. PUT /v1/users/profile — Update user profile details directly
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { firstName, lastName, businessName, phoneNumber } = req.body

    if (!firstName || !lastName || !businessName) {
      return res.status(400).json({
        success: false,
        message: 'First Name, Last Name, and Business Name are required.',
      })
    }

    // Completing the host profile (business name) grants the `host` role.
    // This powers BOTH normal host onboarding and the singer->host upgrade.
    // Merge idempotently so we never duplicate or drop existing roles.
    const currentRoles: string[] = req.user.roles || []
    const roles = currentRoles.includes('host') ? currentRoles : [...currentRoles, 'host']

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        firstName,
        lastName,
        businessName,
        phoneNumber: phoneNumber || undefined,
        roles,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        businessName: updatedUser.businessName,
      },
    })
  } catch (error: any) {
    console.error('Error updating user profile:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 7. POST /v1/users/check-email — Check if user email exists and verification status (public)
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    })

    if (!user) {
      return res.status(200).json({
        success: true,
        exists: false,
      })
    }

    return res.status(200).json({
      success: true,
      exists: true,
      emailVerified: user.emailVerified,
    })
  } catch (error: any) {
    console.error('Error checking email:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to check email.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 8. POST /v1/users/set-password — Set or update password for logged-in user (authenticated)
router.post('/set-password', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { password } = req.body
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      })
    }

    // Call Better Auth setPassword server API
    await auth.api.setPassword({
      body: { newPassword: password },
      headers: fromNodeHeaders(req.headers),
    })

    return res.status(200).json({
      success: true,
      message: 'Password set successfully.',
    })
  } catch (error: any) {
    console.error('Error setting password:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to set password.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 9. POST /v1/users/change-password — Change password for logged-in user (authenticated)
router.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      })
    }

    // Call Better Auth changePassword server API
    await auth.api.changePassword({
      body: { currentPassword, newPassword },
      headers: fromNodeHeaders(req.headers),
    })

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    })
  } catch (error: any) {
    console.error('Error changing password:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to change password.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router

