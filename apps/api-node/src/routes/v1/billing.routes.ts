import { Router } from 'express'
import { prisma } from '@singr/db'
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireRoles } from '../../middleware/rbac.middleware.js'
import Stripe from 'stripe'

const router: Router = Router()

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock'
const stripe = new Stripe(stripeSecretKey, {
  // Use the API version specified by best practices and TS types
  apiVersion: '2026-05-27.dahlia',
})

// 1. GET /v1/billing/tiers — List subscription tiers (Public, no auth needed or optional)
router.get('/tiers', async (_req, res) => {
  try {
    const tiers = await prisma.subscriptionTier.findMany({
      where: {
        active: true,
      },
      orderBy: {
        priceCents: 'asc',
      },
    })

    return res.status(200).json({
      success: true,
      tiers,
    })
  } catch (error: any) {
    console.error('Error fetching billing tiers:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve pricing tiers.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 2. POST /v1/billing/checkout — Create Stripe checkout session (Host only)
router.post('/checkout', requireAuth, requireRoles(['host', 'singer']), async (req: AuthenticatedRequest, res) => {
  const { priceId } = req.body

  if (!priceId) {
    return res.status(400).json({
      success: false,
      message: 'priceId is a required field in the request body.',
    })
  }

  try {
    // Verify pricing tier exists
    const tier = await prisma.subscriptionTier.findFirst({
      where: {
        stripePriceId: priceId,
        active: true,
      },
    })

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Subscription price tier not found.',
      })
    }

    // Retrieve or create host profile
    let hostProfile = await prisma.hostProfile.findUnique({
      where: {
        userId: req.user.id,
      },
    })

    let stripeCustomerId = hostProfile?.stripeCustomerId

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || undefined,
        metadata: {
          userId: req.user.id,
        },
      })
      stripeCustomerId = customer.id

      if (hostProfile) {
        hostProfile = await prisma.hostProfile.update({
          where: { userId: req.user.id },
          data: { stripeCustomerId },
        })
      } else {
        hostProfile = await prisma.hostProfile.create({
          data: {
            userId: req.user.id,
            stripeCustomerId,
            subscriptionStatus: 'inactive',
          },
        })
      }
    }

    const hostPortalUrl = process.env.HOST_PORTAL_URL || 'http://localhost:3011'

    // Create Stripe checkout session (following security guidelines: no payment_method_types)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${hostPortalUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${hostPortalUrl}/billing`,
      metadata: {
        userId: req.user.id,
      },
    })

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create checkout session.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 3. POST /v1/billing/webhook — Ingest and verify Stripe webhook signatures
router.post('/webhook', async (req: any, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return res.status(400).json({
      success: false,
      message: 'Webhook configuration error: stripe-signature or STRIPE_WEBHOOK_SECRET missing.',
    })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature using raw body (req.rawBody)
    const rawBody = req.rawBody
    if (!rawBody) {
      throw new Error('Raw request body is missing. Ensure body-parser verify hook is active.')
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    console.log(`⚡ Stripe Webhook Event Received: ${event.type}`)

    switch (event.type) {
      // 1. Subscription event synchronization
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const stripeCustomerId = subscription.customer as string
        const status = subscription.status

        // subscription status mapping
        let subStatus = 'inactive'
        if (status === 'active' || status === 'trialing') {
          subStatus = 'active'
        }

        // Find and update host profile
        const hostProfile = await prisma.hostProfile.findUnique({
          where: { stripeCustomerId },
          include: { user: true },
        })

        if (hostProfile) {
          await prisma.hostProfile.update({
            where: { userId: hostProfile.userId },
            data: { subscriptionStatus: subStatus },
          })

          // Maintain roles bridge: grant/remove 'host' role based on active status
          const user = hostProfile.user
          let updatedRoles = user.roles || []

          if (subStatus === 'active') {
            if (!updatedRoles.includes('host')) {
              updatedRoles.push('host')
            }
          } else {
            updatedRoles = updatedRoles.filter((r) => r !== 'host')
          }

          // Fallback to singer if empty
          if (updatedRoles.length === 0) {
            updatedRoles = ['singer']
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { roles: updatedRoles },
          })

          console.log(`✅ Updated subscription status for user ${user.email} to: ${subStatus}`)
        }
        break
      }

      // 2. Price and product synchronization
      case 'price.created':
      case 'price.updated': {
        const price = event.data.object as Stripe.Price
        let name = price.nickname || 'Singr Subscription'

        // Retrieve product details to fetch the display name
        if (price.product && typeof price.product === 'string') {
          try {
            const product = await stripe.products.retrieve(price.product)
            name = product.name
          } catch (err) {
            console.error('Failed to retrieve Stripe product for price syncing:', err)
          }
        }

        await prisma.subscriptionTier.upsert({
          where: { stripePriceId: price.id },
          update: {
            name,
            priceCents: price.unit_amount || 0,
            interval: price.recurring?.interval || 'month',
            active: price.active,
          },
          create: {
            stripePriceId: price.id,
            name,
            priceCents: price.unit_amount || 0,
            interval: price.recurring?.interval || 'month',
            active: price.active,
          },
        })
        console.log(`✅ Synced price tier: ${price.id} (${name})`)
        break
      }

      case 'price.deleted': {
        const price = event.data.object as Stripe.Price
        await prisma.subscriptionTier.update({
          where: { stripePriceId: price.id },
          data: { active: false },
        })
        console.log(`✅ Deactivated deleted price tier: ${price.id}`)
        break
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }

    return res.status(200).json({ received: true })
  } catch (error: any) {
    console.error('Error handling Stripe webhook event:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to process webhook event.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
