import type { Request, Response, NextFunction } from 'express'
import { auth } from '../lib/auth.js'

export interface AuthenticatedRequest extends Request {
  session?: any
  user?: any
}

/**
 * Middleware that strictly requires a valid session.
 * Rejects with 401 if unauthorized.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'A valid session cookie or authorization token is required.',
      })
    }

    req.session = session.session
    req.user = session.user
    next()
  } catch (error) {
    console.error('Error in requireAuth middleware:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to authenticate request.',
    })
  }
}

/**
 * Middleware that checks for a session but does NOT reject if missing.
 * Allows anonymous requests to continue, but attaches user info if present.
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (session) {
      req.session = session.session
      req.user = session.user
    }
    next()
  } catch (error) {
    console.error('Error in optionalAuth middleware:', error)
    next() // Continue regardless
  }
}
