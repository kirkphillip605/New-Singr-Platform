import { Router } from 'express'
import { prisma, rawPrisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireRoles } from '../../middleware/rbac.middleware.js'
import crypto from 'crypto'

const router: Router = Router()

// All routes here require being admin or support admin
router.use(requireAuth)
router.use(requireRoles(['global_admin', 'support_admin']))

// 1. POST /v1/admin/impersonate — Exchange admin token for target-user session
router.post('/impersonate', async (req: AuthenticatedRequest, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'userId is required for impersonation.',
    })
  }

  try {
    // Find the target user using rawPrisma (in case the target user is banned/soft-deleted)
    const targetUser = await rawPrisma.user.findFirst({
      where: {
        id: String(userId),
      },
    })

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found.',
      })
    }

    // Role check: support_admin cannot impersonate another global_admin
    const userRoles = req.user.roles || []
    
    if (userRoles.includes('support_admin') && targetUser.roles.includes('global_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. support_admin cannot impersonate a global_admin.',
      })
    }

    // Generate a new session token for the target user
    const token = crypto.randomBytes(40).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour duration for impersonated sessions

    // Create session in the database with impersonatedBy logged
    await prisma.session.create({
      data: {
        userId: targetUser.id,
        token,
        expiresAt,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
        impersonatedBy: req.user.id, // Log the admin's user ID
      },
    })

    // Set cookie if needed, or return the token to be set by the client
    // For Better Auth client compatibility, we can set the cookie or return the session token
    res.cookie('singr.session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      domain: process.env.NODE_ENV === 'production' ? '.singrkaraoke.com' : undefined,
    })

    return res.status(200).json({
      success: true,
      message: `Successfully impersonating ${targetUser.email}`,
      sessionToken: token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        roles: targetUser.roles,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
      },
    })
  } catch (error: any) {
    console.error('Error impersonating user:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to establish impersonated session.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 2. GET /v1/admin/users — Paginated user lists with search and filtering (includes banned users)
router.get('/users', async (req: AuthenticatedRequest, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
  const offset = (page - 1) * limit
  const search = (req.query.q as string || '').trim()

  try {
    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Use rawPrisma to bypass the default soft-delete filter, allowing admins to see banned users
    const users = await rawPrisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        emailVerified: true,
        roles: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        createdAt: true,
        deletedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    const totalCount = await rawPrisma.user.count({
      where: whereClause,
    })

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching users for admin:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users list.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 3. PATCH /v1/admin/users/:id/ban — Ban or unban a user
router.patch('/users/:id/ban', async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string
  const { ban } = req.body

  if (ban === undefined) {
    return res.status(400).json({
      success: false,
      message: 'ban (boolean) is a required field in the request body.',
    })
  }

  try {
    // Find the target user using rawPrisma
    const targetUser = await rawPrisma.user.findFirst({
      where: { id: id },
    })

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    // Prevent banning other global admins
    if (targetUser.roles.includes('global_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot ban a global_admin.',
      })
    }

    // Support admin cannot ban another support admin
    const userRoles = req.user.roles || []
    if (userRoles.includes('support_admin') && targetUser.roles.includes('support_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. support_admin cannot ban another support_admin.',
      })
    }

    // Perform raw update to bypass soft-delete logic for unbanning
    const updatedUser = await rawPrisma.user.update({
      where: { id: id },
      data: {
        deletedAt: ban ? new Date() : null,
        deletedBy: ban ? req.user.id : null,
      },
    })

    return res.status(200).json({
      success: true,
      message: `User ${ban ? 'banned' : 'unbanned'} successfully.`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        deletedAt: updatedUser.deletedAt,
      },
    })
  } catch (error: any) {
    console.error('Error toggling ban state for user:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update user ban state.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 4. GET /v1/admin/metrics — View platform metrics & statistics
router.get('/metrics', async (_req: AuthenticatedRequest, res) => {
  try {
    // Gather statistics using rawPrisma to include soft-deleted / metrics calculations
    const totalUsers = await rawPrisma.user.count()
    const activeUsers = await prisma.user.count()
    const bannedUsers = totalUsers - activeUsers

    const totalShows = await rawPrisma.show.count()
    const activeShows = await prisma.show.count({
      where: { isAccepting: true },
    })

    const totalVenues = await rawPrisma.venue.count()
    const privateVenues = await rawPrisma.venue.count({ where: { isPrivate: true } })
    const publicVenues = totalVenues - privateVenues

    const totalRequests = await rawPrisma.request.count()
    const pendingRequests = await prisma.request.count({ where: { status: 'pending' } })

    const totalSystems = await rawPrisma.system.count()

    // Host accounts vs singer accounts
    // Since roles is an array, we can use Prisma's hasSome / has
    const hostCount = await rawPrisma.user.count({
      where: {
        roles: { has: 'host' },
      },
    })

    const singerCount = await rawPrisma.user.count({
      where: {
        roles: { has: 'singer' },
      },
    })

    // Venues with the highest number of shows
    const popularVenues = await rawPrisma.venue.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        _count: {
          select: { shows: true },
        },
      },
      orderBy: {
        shows: {
          _count: 'desc',
        },
      },
    })

    return res.status(200).json({
      success: true,
      metrics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          hosts: hostCount,
          singers: singerCount,
        },
        shows: {
          total: totalShows,
          active: activeShows,
        },
        venues: {
          total: totalVenues,
          public: publicVenues,
          private: privateVenues,
        },
        requests: {
          total: totalRequests,
          pending: pendingRequests,
        },
        systems: {
          total: totalSystems,
        },
        popularVenues,
      },
    })
  } catch (error: any) {
    console.error('Error fetching admin metrics:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to compile platform metrics.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
