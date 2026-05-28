import type { Request, Response, NextFunction } from 'express'

/**
 * Express middleware that catches and logs unhandled exceptions.
 * Prevents system crash and formats response standard.
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
   
  _next: NextFunction
) => {
  // Log full error stack for debugging
  console.error(`❌ Error on request ${req.method} ${req.path}:`, error)

  const statusCode = error.statusCode || error.status || 500
  const errorName = error.name || 'InternalServerError'
  const message = error.message || 'An unexpected error occurred on the server.'

  res.status(statusCode).json({
    success: false,
    error: errorName,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  })
}
