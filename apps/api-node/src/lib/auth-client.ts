import { createAuthClient } from 'better-auth/client'
import { 
  magicLinkClient, 
  twoFactorClient, 
  adminClient, 
  anonymousClient,
  phoneNumberClient
} from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  plugins: [
    passkeyClient(),
    magicLinkClient(),
    twoFactorClient(),
    adminClient(),
    anonymousClient(),
    phoneNumberClient()
  ],
})
