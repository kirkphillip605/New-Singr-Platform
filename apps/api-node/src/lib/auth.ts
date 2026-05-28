import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@singr/db'
import { 
  twoFactor, 
  admin, 
  anonymous,
  bearer
} from 'better-auth/plugins'
import { stripe } from '@better-auth/stripe'
import Stripe from 'stripe'

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-05-27.dahlia' as any,
})
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

async function syncUserSubscription(userId: string, status: 'active' | 'inactive') {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hostProfile: true },
    })

    if (!user) {
      console.warn(`[syncUserSubscription] User not found: ${userId}`)
      return
    }

    // 1. Update or create HostProfile
    if (user.hostProfile) {
      await prisma.hostProfile.update({
        where: { userId },
        data: { subscriptionStatus: status },
      })
    } else {
      await prisma.hostProfile.create({
        data: {
          userId,
          subscriptionStatus: status,
          stripeCustomerId: user.stripeCustomerId,
        },
      })
    }

    // 2. Sync User Roles
    let updatedRoles = user.roles || []
    if (status === 'active') {
      if (!updatedRoles.includes('host')) {
        updatedRoles = [...updatedRoles, 'host']
      }
    } else {
      updatedRoles = updatedRoles.filter((r) => r !== 'host')
    }

    if (updatedRoles.length === 0) {
      updatedRoles = ['singer']
    }

    await prisma.user.update({
      where: { id: userId },
      data: { roles: updatedRoles },
    })

    console.log(`[syncUserSubscription] Synced user ${user.email} (ID: ${userId}) to status: ${status}, roles: ${JSON.stringify(updatedRoles)}`)
  } catch (error) {
    console.error(`[syncUserSubscription] Failed to sync subscription for user ${userId}:`, error)
  }
}

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
    requireEmailVerification: true,
    sendVerificationEmail: async ({ user, url, token: _token }: any) => {
      console.log(`✉️ Verification email requested for ${user.email}: ${url}`)
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
                  Name: 'Singr Karaoke',
                },
                To: [
                  {
                    Email: user.email,
                  },
                ],
                Subject: 'Verify Your Email Address - Singr',
                HTMLPart: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #1a1a1a; color: #ffffff;">
                    <h2 style="color: #FF5722;">Welcome to Singr!</h2>
                    <p>Hello ${(user as any).firstName || 'Singer'},</p>
                    <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
                    <div style="margin: 24px 0;">
                      <a href="${url}" style="background-color: #FF5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                    </div>
                    <p style="color: #aaa; font-size: 12px;">Or copy and paste this URL into your browser:</p>
                    <p style="color: #aaa; font-size: 12px; word-break: break-all;"><a href="${url}" style="color: #FF5722;">${url}</a></p>
                    <p style="color: #888; font-size: 11px; margin-top: 24px;">This link is valid for 24 hours.</p>
                  </div>
                `,
              },
            ],
          })
          console.log(`✅ Verification email sent successfully via Mailjet to ${user.email}`)
        } catch (err) {
          console.error('❌ Failed to send verification email via Mailjet:', err)
        }
      }
    },
    sendResetPassword: async ({ user, url, token: _token }: any) => {
      console.log(`✉️ Reset password requested for ${user.email}: ${url}`)
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
                  Name: 'Singr Karaoke',
                },
                To: [
                  {
                    Email: user.email,
                  },
                ],
                Subject: 'Reset Your Password - Singr',
                HTMLPart: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #1a1a1a; color: #ffffff;">
                    <h2 style="color: #FF5722;">Reset Your Password</h2>
                    <p>Hello ${(user as any).firstName || 'Singer'},</p>
                    <p>We received a request to reset your password. Click the button below to set a new password:</p>
                    <div style="margin: 24px 0;">
                      <a href="${url}" style="background-color: #FF5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="color: #aaa; font-size: 12px;">Or copy and paste this URL into your browser:</p>
                    <p style="color: #aaa; font-size: 12px; word-break: break-all;"><a href="${url}" style="color: #FF5722;">${url}</a></p>
                    <p style="color: #888; font-size: 11px; margin-top: 24px;">If you did not request a password reset, you can safely ignore this email.</p>
                  </div>
                `,
              },
            ],
          })
          console.log(`✅ Reset password email sent successfully via Mailjet to ${user.email}`)
        } catch (err) {
          console.error('❌ Failed to send reset password email via Mailjet:', err)
        }
      }
    }
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
                    Name: 'Singr Karaoke',
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
    twoFactor({
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          const userPhone = (user as any).phoneNumber;
          if (!userPhone) {
            console.error('❌ Cannot send 2FA OTP: User does not have a phone number.')
            return
          }
          console.log(`📱 2FA SMS OTP requested for ${userPhone}: ${otp}`)
          if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
              const twilioModule = (await import('twilio')) as any
              const twilioClient = twilioModule.default || twilioModule
              const client = twilioClient(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
              )
              await client.messages.create({
                body: `Your Singr 2FA security code is: ${otp}. Do not share this code.`,
                to: userPhone,
                from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
              })
              console.log(`✅ 2FA SMS OTP sent successfully via Twilio to ${userPhone}`)
            } catch (err) {
              console.error('❌ Failed to send 2FA SMS OTP via Twilio:', err)
            }
          }
        }
      }
    }),
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
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock',
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: 'monthly',
            priceId: 'price_1TOBKUEHv8jD9HNKuH9i3sEy',
          },
          {
            name: 'six_month',
            priceId: 'price_1TOBKVEHv8jD9HNKcXvrP2Po',
          },
          {
            name: 'annual',
            priceId: 'price_1TOBKVEHv8jD9HNKK0nTrlRV',
          },
        ],
        onSubscriptionComplete: async ({ event: _event, subscription, stripeSubscription: _stripeSubscription, plan: _plan }) => {
          console.log(`⚡ Better Auth Stripe: Subscription complete for ${subscription.referenceId}`)
          await syncUserSubscription(subscription.referenceId, 'active')
        },
        onSubscriptionUpdate: async ({ event: _event, subscription, stripeSubscription: _stripeSubscription }) => {
          console.log(`⚡ Better Auth Stripe: Subscription update for ${subscription.referenceId}`)
          const status = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive'
          await syncUserSubscription(subscription.referenceId, status)
        },
        onSubscriptionDeleted: async ({ event: _event, subscription, stripeSubscription: _stripeSubscription }) => {
          console.log(`⚡ Better Auth Stripe: Subscription deleted for ${subscription.referenceId}`)
          await syncUserSubscription(subscription.referenceId, 'inactive')
        }
      },
      onCustomerCreate: async ({ stripeCustomer, user }, _ctx) => {
        console.log(`⚡ Better Auth Stripe: Customer created in Stripe: ${stripeCustomer.id} for user ${user.email}`)
        // Upsert HostProfile with the customer ID
        await prisma.hostProfile.upsert({
          where: { userId: user.id },
          update: { stripeCustomerId: stripeCustomer.id },
          create: {
            userId: user.id,
            stripeCustomerId: stripeCustomer.id,
            subscriptionStatus: 'inactive',
          },
        })
      },
    }),
  ],
})

