import { Router } from 'express'
import { prisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireRoles } from '../../middleware/rbac.middleware.js'
import crypto from 'crypto'

const router: Router = Router()

// Helper to check if a user is the owner (host) of the system
async function isSystemOwner(userId: string, systemHostUsersId: string | null): Promise<boolean> {
  return userId === systemHostUsersId
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

// Helper to generate a secure random API key
function generateApiKey(): string {
  // Generates a 64-character secure hexadecimal key (32 bytes)
  return 'sg_' + crypto.randomBytes(30).toString('hex')
}

// 1. GET /v1/systems — List all hardware systems manageable by the host/manager
router.get('/', requireAuth, requireRoles(['host', 'host_manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const manageableHostIds = await getManageableHostIds(req.user.id)

    const systems = await prisma.system.findMany({
      where: {
        hostUsersId: { in: manageableHostIds },
        deletedAt: null,
      },
      orderBy: {
        systemNumber: 'asc',
      },
    })

    // Mask API keys for security in listing, showing only first/last few characters
    const safeSystems = systems.map((sys) => ({
      ...sys,
      apiKey: sys.apiKey ? `${sys.apiKey.substring(0, 8)}...${sys.apiKey.substring(sys.apiKey.length - 4)}` : '',
    }))

    return res.status(200).json({
      success: true,
      systems: safeSystems,
    })
  } catch (error: any) {
    console.error('Error fetching systems:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve systems.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 2. POST /v1/systems — Create a hardware system with gap-fill system number (Host only)
router.post('/', requireAuth, requireRoles(['host']), async (req: AuthenticatedRequest, res) => {
  try {
    // Gap-fill provisioning logic:
    // 1. Fetch all active systems for this host sorted by systemNumber
    const existingSystems = await prisma.system.findMany({
      where: {
        hostUsersId: req.user.id,
        deletedAt: null,
      },
      orderBy: {
        systemNumber: 'asc',
      },
    })

    // 2. Find the first gap in system numbers starting at 1
    let nextSystemNumber = 1
    const activeNumbers = existingSystems.map((s) => s.systemNumber)
    for (let i = 1; i <= activeNumbers.length + 1; i++) {
      if (!activeNumbers.includes(i)) {
        nextSystemNumber = i
        break
      }
    }

    const apiKey = generateApiKey()

    // 3. Create the system
    const system = await prisma.system.create({
      data: {
        hostUsersId: req.user.id,
        apiKey,
        systemNumber: nextSystemNumber,
        createdBy: req.user.id,
      },
    })

    return res.status(201).json({
      success: true,
      message: `System created successfully as System #${nextSystemNumber}. Make sure to copy the API key as it will not be shown again.`,
      system: {
        id: system.id,
        systemNumber: system.systemNumber,
        apiKey: system.apiKey, // Show full key only on creation
        createdAt: system.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Error creating system:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create system.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 3. POST /v1/systems/:id/regenerate-key — Rotate hardware system API key (Host only)
router.post('/:id/regenerate-key', requireAuth, requireRoles(['host']), async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string

  try {
    const system = await prisma.system.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    })

    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'System not found.',
      })
    }

    const isAuthorized = await isSystemOwner(req.user.id, system.hostUsersId)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the owning host can regenerate API keys.',
      })
    }

    const newApiKey = generateApiKey()

    const updatedSystem = await prisma.system.update({
      where: { id: id },
      data: {
        apiKey: newApiKey,
        updatedBy: req.user.id,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'System API key regenerated successfully.',
      system: {
        id: updatedSystem.id,
        systemNumber: updatedSystem.systemNumber,
        apiKey: newApiKey, // Return the raw key once
        updatedAt: updatedSystem.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Error regenerating system key:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to regenerate API key.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 4. DELETE /v1/systems/:id — Soft-delete hardware system, freeing gap (Host only)
router.delete('/:id', requireAuth, requireRoles(['host']), async (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string

  try {
    const system = await prisma.system.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    })

    if (!system) {
      return res.status(404).json({
        success: false,
        message: 'System not found.',
      })
    }

    const isAuthorized = await isSystemOwner(req.user.id, system.hostUsersId)
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the owning host can delete this system.',
      })
    }

    await prisma.system.update({
      where: { id: id },
      data: {
        deletedBy: req.user.id,
        deletedAt: new Date(),
      },
    })

    return res.status(200).json({
      success: true,
      message: `System #${system.systemNumber} deleted successfully. This system number is now available.`,
    })
  } catch (error: any) {
    console.error('Error deleting system:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete system.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
