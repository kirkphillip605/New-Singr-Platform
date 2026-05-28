import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@singr/db'
import { 
  twoFactor, 
  admin, 
  anonymous,
  bearer
} from 'better-auth/plugins'
import { passkey } from '@better-auth/passkey'
import { magicLink } from 'better-auth/plugins/magic-link'
import { phoneNumber } from 'better-auth/plugins/phone-number'
import { redis } from './redis.js'

// Load environment variables for local testing if not running from root dev script
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = 'dev_secret_replace_in_production_32chars_min'
}
if (!process.env.BETTER_AUTH_URL) {
  process.env.BETTER_AUTH_URL = 'http://localhost:3001'
}

import crypto from 'crypto'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    'http://localhost:3010',
    'http://localhost:3011',
    'http://localhost:3012',
    'http://localhost:3013',
    'https://singrkaraoke.com',
    'https://host.singrkaraoke.com',
    'https://admin.singrkaraoke.com',
    'https://app.singrkaraoke.com',
  ],

  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    cookies: {
      session_token: {
        name: 'singr.session',
        attributes: {
          domain: process.env.NODE_ENV === 'production' ? '.singrkaraoke.com' : undefined,
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  // Enable secondary session storage in Redis for speed & rate limiting
  secondaryStorage: {
    get: async (key) => {
      const res = await redis.get(key)
      if (!res) return null
      try {
        return JSON.parse(res)
      } catch {
        return res
      }
    },
    set: async (key, value, ttl) => {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      if (ttl) {
        await redis.set(key, stringValue, 'EX', ttl)
      } else {
        await redis.set(key, stringValue)
      }
    },
    delete: async (key) => {
      await redis.del(key)
    },
  },


  // Session cache strategy
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache in cookies
    },
  },

  // Schema additional fields definition
  user: {
    fields: {
      name: 'firstName',
    },
    additionalFields: {
      roles: { type: 'string[]', required: false, defaultValue: ['singer'] },
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      phoneNumber: { type: 'string', required: false },
      isAnonymous: { type: 'boolean', required: false, defaultValue: false },
      businessName: { type: 'string', required: false },
      businessLogo: { type: 'string', required: false },
      businessAbout: { type: 'string', required: false },
      singerAbout: { type: 'string', required: false },
      deletedAt: { type: 'date', required: false },
      deletedBy: { type: 'string', required: false },
    },
  },

  // Database hooks
  databaseHooks: {
    user: {
      create: {
        before: async (user: any) => {
          // If no roles are provided, default to singer
          if (!user.roles || (Array.isArray(user.roles) && user.roles.length === 0)) {
            user.roles = ['singer']
          }
          return {
            data: user,
          }
        },
      },
    },
  },

  // Plugins
  plugins: [
    bearer(),
    passkey(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        console.log(`✉️ Magic link requested for ${email}: ${url}`)
        // If Mailjet is configured, we will send email via Mailjet SDK
        if (process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET) {
          try {
            const mailjetModule = (await import('node-mailjet')) as any
            const mailjetConnector = mailjetModule.default?.apiConnect || mailjetModule.apiConnect
            const mailjet = mailjetConnector(
              process.env.MAILJET_API_KEY,
              process.env.MAILJET_API_SECRET
            )
            await mailjet.post('send', { version: 'v3.1' }).request({
              Messages: [
                {
                  From: {
                    Email: 'noreply@singrkaraoke.com',
                    Name: 'Singr Platform',
                  },
                  To: [
                    {
                      Email: email,
                    },
                  ],
                  Subject: 'Your Magic Sign-In Link for Singr',
                  HTMLPart: `<h3>Welcome to Singr!</h3><p>Click <a href="${url}">here</a> to sign in to your account.</p><p>This link is valid for 10 minutes.</p>`,
                },
              ],
            })
            console.log(`✅ Magic link email sent successfully via Mailjet to ${email}`)
          } catch (err) {
            console.error('❌ Failed to send magic link email via Mailjet:', err)
          }
        }
      },
    }),
    twoFactor(),
    admin(),
    anonymous(),
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        console.log(`📱 SMS OTP requested for ${phoneNumber}: ${code}`)
        // If Twilio is configured, we will send SMS via Twilio SDK
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          try {
            const twilioModule = (await import('twilio')) as any
            const twilioClient = twilioModule.default || twilioModule
            const client = twilioClient(
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN
            )
            await client.messages.create({
              body: `Your Singr verification code is: ${code}. It expires in 5 minutes.`,
              to: phoneNumber,
              from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
            })
            console.log(`✅ SMS OTP sent successfully via Twilio to ${phoneNumber}`)
          } catch (err) {
            console.error('❌ Failed to send SMS OTP via Twilio:', err)
          }
        }
      },
    }),
  ],
})

