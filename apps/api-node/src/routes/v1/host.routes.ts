import { Router } from 'express'
import { prisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireRoles } from '../../middleware/rbac.middleware.js'

const router: Router = Router()

// Resolve every host ID the current user can manage resources for
async function getManageableHostIds(userId: string): Promise<string[]> {
  const hostIds = [userId]
  const memberships = await prisma.hostTeamMember.findMany({
    where: { userId, role: 'host_manager' },
    select: { hostUsersId: true },
  })
  memberships.forEach((m) => hostIds.push(m.hostUsersId))
  return hostIds
}

// GET /v1/host/metrics — aggregate dashboard stats scoped to the host
router.get(
  '/metrics',
  requireAuth,
  requireRoles(['host', 'host_manager']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hostIds = await getManageableHostIds(req.user.id)

      const [
        venuesCount,
        showsCount,
        activeShowsCount,
        systemsCount,
        totalRequests,
        pendingRequests,
        systems,
        recent,
      ] = await Promise.all([
        prisma.hostVenue.count({
          where: { userId: { in: hostIds }, venue: { deletedAt: null } },
        }),
        prisma.show.count({ where: { hostUsersId: { in: hostIds } } }),
        prisma.show.count({ where: { hostUsersId: { in: hostIds }, isAccepting: true } }),
        prisma.system.count({ where: { hostUsersId: { in: hostIds } } }),
        prisma.request.count({ where: { show: { hostUsersId: { in: hostIds } } } }),
        prisma.request.count({
          where: { status: 'pending', show: { hostUsersId: { in: hostIds } } },
        }),
        prisma.system.findMany({
          where: { hostUsersId: { in: hostIds } },
          select: { id: true, systemNumber: true },
        }),
        prisma.show.findMany({
          where: { hostUsersId: { in: hostIds } },
          include: { venue: { select: { name: true, isPrivate: true } } },
          orderBy: [{ isAccepting: 'desc' }, { createdAt: 'desc' }],
          take: 5,
        }),
      ])

      const systemMap = new Map(systems.map((s) => [s.id, s.systemNumber]))

      const recentShows = recent.map((show) => ({
        id: show.id,
        showName: show.showName,
        slug: show.slug,
        venueName: show.venue?.name || 'Unknown Venue',
        isPrivate: show.venue?.isPrivate ?? false,
        isAccepting: show.isAccepting,
        pinCode: show.pinCode,
        systemNumber: show.activeSystemsId
          ? systemMap.get(show.activeSystemsId) ?? null
          : null,
      }))

      return res.status(200).json({
        success: true,
        metrics: {
          venuesCount,
          showsCount,
          activeShowsCount,
          systemsCount,
          totalRequests,
          pendingRequests,
        },
        recentShows,
      })
    } catch (error: any) {
      console.error('Error fetching host metrics:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve host metrics.',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
)

export default router
