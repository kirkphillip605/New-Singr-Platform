import type express from 'express';
import { Router } from 'express'
import { toNodeHandler } from 'better-auth/node'
import { auth } from '../lib/auth.js'

const authRouter: express.Router = Router()

/**
 * Better Auth catch-all route handler.
 * Dispatches incoming requests (sign-up, sign-in, etc.) to the Better Auth framework.
 */
authRouter.all('/*splat', toNodeHandler(auth))

export default authRouter
