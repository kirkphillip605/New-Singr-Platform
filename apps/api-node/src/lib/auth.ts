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

/**
 * Reusable Mailjet email sender.
 * Logs every step for debugging: env check, connector init, request payload, response.
 */
export async function sendMailjetEmail(opts: {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  logLabel: string;
}): Promise<boolean> {
  const { toEmail, toName, subject, htmlContent, logLabel } = opts;

  console.log(`📧 [Mailjet/${logLabel}] Preparing to send email to ${toEmail}`);
  console.log(`📧 [Mailjet/${logLabel}] MAILJET_API_KEY present: ${!!process.env.MAILJET_API_KEY} (length: ${process.env.MAILJET_API_KEY?.length || 0})`);
  console.log(`📧 [Mailjet/${logLabel}] MAILJET_API_SECRET present: ${!!process.env.MAILJET_API_SECRET} (length: ${process.env.MAILJET_API_SECRET?.length || 0})`);

  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
    console.warn(`⚠️ [Mailjet/${logLabel}] MAILJET_API_KEY or MAILJET_API_SECRET is missing — skipping email send.`);
    return false;
  }

  try {
    console.log(`📧 [Mailjet/${logLabel}] Importing node-mailjet module...`);
    const mailjetModule = (await import('node-mailjet')) as any;
    const mailjetConnector = mailjetModule.default?.apiConnect || mailjetModule.apiConnect;
    
    if (!mailjetConnector) {
      console.error(`❌ [Mailjet/${logLabel}] Could not find apiConnect on node-mailjet module. Available keys: ${Object.keys(mailjetModule).join(', ')}`);
      return false;
    }

    console.log(`📧 [Mailjet/${logLabel}] Creating Mailjet client...`);
    const mailjet = mailjetConnector(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_API_SECRET
    );

    const payload = {
      Messages: [
        {
          From: {
            Email: 'noreply@singrkaraoke.com',
            Name: 'Singr Karaoke',
          },
          To: [
            {
              Email: toEmail,
              ...(toName ? { Name: toName } : {}),
            },
          ],
          Subject: subject,
          HTMLPart: htmlContent,
        },
      ],
    };

    console.log(`📧 [Mailjet/${logLabel}] Sending request with payload:`, JSON.stringify(payload, null, 2));
    const response = await mailjet.post('send', { version: 'v3.1' }).request(payload);
    console.log(`✅ [Mailjet/${logLabel}] Email sent successfully to ${toEmail}. Response status: ${(response as any)?.response?.status || 'unknown'}`);
    console.log(`✅ [Mailjet/${logLabel}] Response body:`, JSON.stringify((response as any)?.body || {}, null, 2));
    return true;
  } catch (err: any) {
    console.error(`❌ [Mailjet/${logLabel}] Failed to send email to ${toEmail}:`);
    console.error(`❌ [Mailjet/${logLabel}] Error message: ${err?.message || 'unknown'}`);
    console.error(`❌ [Mailjet/${logLabel}] Error status: ${err?.statusCode || err?.response?.status || 'unknown'}`);
    console.error(`❌ [Mailjet/${logLabel}] Full error:`, err);
    return false;
  }
}

/**
 * Reusable Twilio SMS sender.
 * Logs every step for debugging: env check, client init, request payload, response.
 */
async function sendTwilioSms(opts: {
  to: string;
  body: string;
  logLabel: string;
}): Promise<boolean> {
  const { to, body, logLabel } = opts;

  console.log(`📱 [Twilio/${logLabel}] Preparing to send SMS to ${to}`);
  console.log(`📱 [Twilio/${logLabel}] TWILIO_ACCOUNT_SID present: ${!!process.env.TWILIO_ACCOUNT_SID} (length: ${process.env.TWILIO_ACCOUNT_SID?.length || 0})`);
  console.log(`📱 [Twilio/${logLabel}] TWILIO_AUTH_TOKEN present: ${!!process.env.TWILIO_AUTH_TOKEN} (length: ${process.env.TWILIO_AUTH_TOKEN?.length || 0})`);
  console.log(`📱 [Twilio/${logLabel}] TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || '(not set)'}`);

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn(`⚠️ [Twilio/${logLabel}] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing — skipping SMS send.`);
    return false;
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.warn(`⚠️ [Twilio/${logLabel}] TWILIO_PHONE_NUMBER is not set — cannot send SMS without a sender number.`);
    return false;
  }

  try {
    console.log(`📱 [Twilio/${logLabel}] Importing twilio module...`);
    const twilioModule = (await import('twilio')) as any;
    const twilioConstructor = twilioModule.default || twilioModule;

    if (typeof twilioConstructor !== 'function') {
      console.error(`❌ [Twilio/${logLabel}] Could not find Twilio constructor. Type: ${typeof twilioConstructor}. Keys: ${Object.keys(twilioModule).join(', ')}`);
      return false;
    }

    console.log(`📱 [Twilio/${logLabel}] Creating Twilio client...`);
    const client = twilioConstructor(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    console.log(`📱 [Twilio/${logLabel}] Sending SMS: to=${to}, from=${process.env.TWILIO_PHONE_NUMBER}, body_length=${body.length}`);
    const message = await client.messages.create({
      body,
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    console.log(`✅ [Twilio/${logLabel}] SMS sent successfully to ${to}. SID: ${message.sid}, Status: ${message.status}`);
    return true;
  } catch (err: any) {
    console.error(`❌ [Twilio/${logLabel}] Failed to send SMS to ${to}:`);
    console.error(`❌ [Twilio/${logLabel}] Error message: ${err?.message || 'unknown'}`);
    console.error(`❌ [Twilio/${logLabel}] Error code: ${err?.code || err?.status || 'unknown'}`);
    console.error(`❌ [Twilio/${logLabel}] Full error:`, err);
    return false;
  }
}

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
    // The `host` role is owned by host-profile completion (PUT /profile), NOT by
    // subscription state. Subscription only drives hostProfile.subscriptionStatus.
    // As a harmless safety net we may ADD `host` on an active subscription, but we
    // must NEVER remove it (or force roles back to ['singer']) on inactive.
    if (status === 'active') {
      const currentRoles = user.roles || []
      if (!currentRoles.includes('host')) {
        await prisma.user.update({
          where: { id: userId },
          data: { roles: [...currentRoles, 'host'] },
        })
      }
    }

    console.log(`[syncUserSubscription] Synced user ${user.email} (ID: ${userId}) to status: ${status}`)
  } catch (error) {
    console.error(`[syncUserSubscription] Failed to sync subscription for user ${userId}:`, error)
  }
}

// Log startup env state for debugging email/SMS sending
console.log('🔧 [Auth Config] Initializing Better Auth...');
console.log(`🔧 [Auth Config] MAILJET_API_KEY present: ${!!process.env.MAILJET_API_KEY}`);
console.log(`🔧 [Auth Config] MAILJET_API_SECRET present: ${!!process.env.MAILJET_API_SECRET}`);
console.log(`🔧 [Auth Config] TWILIO_ACCOUNT_SID present: ${!!process.env.TWILIO_ACCOUNT_SID}`);
console.log(`🔧 [Auth Config] TWILIO_AUTH_TOKEN present: ${!!process.env.TWILIO_AUTH_TOKEN}`);
console.log(`🔧 [Auth Config] TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || '(not set)'}`);
console.log(`🔧 [Auth Config] BETTER_AUTH_URL: ${process.env.BETTER_AUTH_URL}`);
console.log(`🔧 [Auth Config] NODE_ENV: ${process.env.NODE_ENV}`);

// =============================================
// SOCIAL PROVIDERS — built CONDITIONALLY
// Only register a provider when its clientId/clientSecret env vars are present
// AND not equal to the .env.example placeholder values. This prevents better-auth
// from registering broken providers at startup (which throws on bad creds).
// `mapProfileToUser` captures first/last name. Note user.fields.name = 'firstName',
// so we also set `name` to the given name to keep the firstName column populated.
// =============================================
const PLACEHOLDER_ENV_VALUES = new Set([
  'your_google_client_id',
  'your_google_client_secret',
  'your_apple_client_id',
  'your_apple_client_secret',
])

function hasRealCredential(value: string | undefined): value is string {
  return !!value && !PLACEHOLDER_ENV_VALUES.has(value)
}

const socialProviders: Record<string, any> = {}

if (hasRealCredential(process.env.GOOGLE_CLIENT_ID) && hasRealCredential(process.env.GOOGLE_CLIENT_SECRET)) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    mapProfileToUser: (profile: any) => ({
      firstName: profile.given_name,
      lastName: profile.family_name,
      name: profile.given_name,
    }),
  }
  console.log('🔧 [Auth Config] Google social provider registered.')
} else {
  console.log('🔧 [Auth Config] Google social provider NOT registered (missing/placeholder credentials).')
}

if (hasRealCredential(process.env.APPLE_CLIENT_ID) && hasRealCredential(process.env.APPLE_CLIENT_SECRET)) {
  // NOTE: Apple requires a generated JWT client secret (signed with your private key)
  // and a Services ID as the clientId. Apple only returns the user's name on the
  // FIRST consent, so map given/family name only when present.
  socialProviders.apple = {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    mapProfileToUser: (profile: any) => ({
      firstName: profile.given_name,
      lastName: profile.family_name,
      name: profile.given_name,
    }),
  }
  console.log('🔧 [Auth Config] Apple social provider registered.')
} else {
  console.log('🔧 [Auth Config] Apple social provider NOT registered (missing/placeholder credentials).')
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  // Conditionally-registered Google/Apple providers (see builder above).
  socialProviders,

  // Allow OAuth sign-in to link to an existing email/password account with the
  // same email. google/apple are trusted so linking happens automatically.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'apple'],
    },
  },

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

  // =============================================
  // EMAIL VERIFICATION — top-level config (NOT inside emailAndPassword)
  // This is where Better Auth looks for sendVerificationEmail.
  // See: https://www.better-auth.com/docs/authentication/email-password#email-verification
  // =============================================
  emailVerification: {
    sendOnSignUp: true,   // Automatically send verification email when a user signs up
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token: _token }: any, _request: any) => {
      console.log(`✉️ [emailVerification.sendVerificationEmail] TRIGGERED for ${user.email}`);
      console.log(`✉️ [emailVerification.sendVerificationEmail] Verification URL: ${url}`);

      const firstName = (user as any).firstName || (user as any).name || 'there';

      await sendMailjetEmail({
        toEmail: user.email,
        toName: firstName,
        subject: 'Verify Your Email Address - Singr',
        logLabel: 'VerificationEmail',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #1a1a1a; color: #ffffff;">
            <h2 style="color: #FF5722;">Welcome to Singr!</h2>
            <p>Hello ${firstName},</p>
            <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
            <div style="margin: 24px 0;">
              <a href="${url}" style="background-color: #FF5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="color: #aaa; font-size: 12px;">Or copy and paste this URL into your browser:</p>
            <p style="color: #aaa; font-size: 12px; word-break: break-all;"><a href="${url}" style="color: #FF5722;">${url}</a></p>
            <p style="color: #888; font-size: 11px; margin-top: 24px;">This link is valid for 24 hours.</p>
          </div>
        `,
      });
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token: _token }: any) => {
      console.log(`✉️ [emailAndPassword.sendResetPassword] TRIGGERED for ${user.email}`);
      console.log(`✉️ [emailAndPassword.sendResetPassword] Reset URL: ${url}`);

      const firstName = (user as any).firstName || (user as any).name || 'there';

      await sendMailjetEmail({
        toEmail: user.email,
        toName: firstName,
        subject: 'Reset Your Password - Singr',
        logLabel: 'ResetPassword',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #1a1a1a; color: #ffffff;">
            <h2 style="color: #FF5722;">Reset Your Password</h2>
            <p>Hello ${firstName},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <div style="margin: 24px 0;">
              <a href="${url}" style="background-color: #FF5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #aaa; font-size: 12px;">Or copy and paste this URL into your browser:</p>
            <p style="color: #aaa; font-size: 12px; word-break: break-all;"><a href="${url}" style="color: #FF5722;">${url}</a></p>
            <p style="color: #888; font-size: 11px; margin-top: 24px;">If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        `,
      });
    },
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
      // Sign-in only: never create a new account from a magic link. The client
      // pre-checks email existence and routes unknown users to signup.
      disableSignUp: true,
      sendMagicLink: async ({ email, url }) => {
        console.log(`✉️ [magicLink.sendMagicLink] TRIGGERED for ${email}`);
        console.log(`✉️ [magicLink.sendMagicLink] Magic link URL: ${url}`);

        await sendMailjetEmail({
          toEmail: email,
          subject: 'Your Magic Sign-In Link for Singr',
          logLabel: 'MagicLink',
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #1a1a1a; color: #ffffff;">
              <h2 style="color: #FF5722;">Welcome to Singr!</h2>
              <p>Click the button below to sign in to your account:</p>
              <div style="margin: 24px 0;">
                <a href="${url}" style="background-color: #FF5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Sign In to Singr</a>
              </div>
              <p style="color: #aaa; font-size: 12px;">Or copy and paste this URL into your browser:</p>
              <p style="color: #aaa; font-size: 12px; word-break: break-all;"><a href="${url}" style="color: #FF5722;">${url}</a></p>
              <p style="color: #888; font-size: 11px; margin-top: 24px;">This link is valid for 10 minutes.</p>
            </div>
          `,
        });
      },
    }),
    twoFactor({
      otpOptions: {
        sendOTP: async ({ user, otp }: any) => {
          const userPhone = (user as any).phoneNumber;
          console.log(`📱 [twoFactor.sendOTP] TRIGGERED for user ${user.email}`);
          console.log(`📱 [twoFactor.sendOTP] Phone on record: ${userPhone || '(none)'}`);
          console.log(`📱 [twoFactor.sendOTP] OTP code: ${otp}`);

          if (!userPhone) {
            console.error('❌ [twoFactor.sendOTP] Cannot send 2FA OTP: User does not have a phone number on record.');
            return;
          }

          await sendTwilioSms({
            to: userPhone,
            body: `Your Singr 2FA security code is: ${otp}. Do not share this code.`,
            logLabel: '2FA-OTP',
          });
        },
      },
    }),
    admin(),
    anonymous(),
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }: any) => {
        console.log(`📱 [phoneNumber.sendOTP] TRIGGERED for ${phone}`);
        console.log(`📱 [phoneNumber.sendOTP] Verification code: ${code}`);

        await sendTwilioSms({
          to: phone,
          body: `Your Singr verification code is: ${code}. It expires in 5 minutes.`,
          logLabel: 'PhoneVerification-OTP',
        });
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
            priceId: process.env.STRIPE_MONTHLY_PRICE || 'price_1SDoYqEHv8jD9HNKhqkE6KYA',
            freeTrial: {
              days: 7,
            },
          },
          {
            name: 'six_month',
            priceId: process.env.STRIPE_SEMI_ANNUAL_PRICE || 'price_1SDoYrEHv8jD9HNKb4u0KBVx',
            freeTrial: {
              days: 7,
            },
          },
          {
            name: 'annual',
            priceId: process.env.STRIPE_ANNUAL_PRICE || 'price_1SDoYrEHv8jD9HNKNPlSfrwB',
            freeTrial: {
              days: 14,
            },
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

