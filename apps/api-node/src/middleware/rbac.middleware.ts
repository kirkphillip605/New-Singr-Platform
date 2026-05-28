import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from './auth.middleware.js'

/**
 * Middleware that checks if the logged-in user possesses at least one of the allowed roles.
 * Must be used AFTER requireAuth middleware.
 */
export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication session required.',
      })
    }

    const userRoles: string[] = req.user.roles || []

    // Check if the user's role array contains any of the allowed roles
    const hasAllowedRole = allowedRoles.some((role) => userRoles.includes(role))

    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      })
    }

    next()
  }
}
