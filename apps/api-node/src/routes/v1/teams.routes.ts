import { Router } from 'express'
import { prisma, rawPrisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireRoles } from '../../middleware/rbac.middleware.js'

const router: Router = Router()

// All routes here require the user to be a Host
router.use(requireAuth)
router.use(requireRoles(['host']))

// 1. GET /v1/teams — List all team members for the host
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const teamMembers = await prisma.hostTeamMember.findMany({
      where: {
        hostUsersId: req.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            roles: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return res.status(200).json({
      success: true,
      teamMembers,
    })
  } catch (error: any) {
    console.error('Error fetching team members:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve team members.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 2. POST /v1/teams/invite — Invite a user to the team (Host only)
router.post('/invite', async (req: AuthenticatedRequest, res) => {
  const { email, role } = req.body

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required to send team invitation.',
    })
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const memberRole = role || 'host_manager'

  if (memberRole !== 'host_manager') {
    return res.status(400).json({
      success: false,
      message: 'Only the "host_manager" role can be provisioned through invitations.',
    })
  }

  try {
    // 1. Find or create the user with rawPrisma (to handle banned/deleted users if needed)
    let user = await rawPrisma.user.findFirst({
      where: { email: normalizedEmail },
    })

    if (!user) {
      // User doesn't exist, create a placeholder account
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          roles: ['singer', 'host_manager'], // Give singer + host_manager by default
          emailVerified: false,
          isAnonymous: false,
        },
      })
    } else {
      // User exists, check if already on the team
      const existingMembership = await prisma.hostTeamMember.findFirst({
        where: {
          hostUsersId: req.user.id,
          userId: user.id,
        },
      })

      if (existingMembership) {
        return res.status(409).json({
          success: false,
          message: 'User is already a member of your team.',
        })
      }

      // Ensure they have the host_manager role in their roles array
      if (!user.roles.includes('host_manager')) {
        const updatedRoles = [...user.roles, 'host_manager']
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: updatedRoles },
        })
      }
    }

    // 2. Create the team membership record
    const membership = await prisma.hostTeamMember.create({
      data: {
        hostUsersId: req.user.id,
        userId: user.id,
        role: memberRole,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // TODO: Send invite email here via Mailjet (optional helper, magic link flow handles basic sign-in)

    return res.status(201).json({
      success: true,
      message: `User ${normalizedEmail} successfully added to the team.`,
      membership,
    })
  } catch (error: any) {
    console.error('Error inviting team member:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to complete team invitation.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 3. DELETE /v1/teams/:id — Remove a team member (Host only)
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string

  try {
    const membership = await prisma.hostTeamMember.findFirst({
      where: {
        id: id,
      },
    })

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Team membership record not found.',
      })
    }

    // Verify current host is the owner of the team
    if (membership.hostUsersId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to manage this team.',
      })
    }

    const userId = membership.userId

    // Delete membership
    await prisma.hostTeamMember.delete({
      where: { id: id },
    })

    // Check if the user has other team memberships or roles before stripping host_manager
    const otherMemberships = await prisma.hostTeamMember.findFirst({
      where: { userId },
    })

    if (!otherMemberships) {
      // Fetch user to remove host_manager role if it is no longer needed
      const user = await rawPrisma.user.findFirst({
        where: { id: userId },
      })

      if (user && user.roles.includes('host_manager')) {
        const updatedRoles = user.roles.filter((r) => r !== 'host_manager')
        await prisma.user.update({
          where: { id: userId },
          data: { roles: updatedRoles.length > 0 ? updatedRoles : ['singer'] },
        })
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Team member removed successfully.',
    })
  } catch (error: any) {
    console.error('Error removing team member:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to remove team member.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
