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
        const stripeSub = event.data.object as any
        const stripeCustomerId = stripeSub.customer as string
        const status = stripeSub.status

        // subscription status mapping
        let subStatus = 'inactive'
        if (status === 'active' || status === 'trialing') {
          subStatus = 'active'
        }

        // Find user by stripeCustomerId
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { stripeCustomerId },
              { hostProfile: { stripeCustomerId } }
            ]
          },
          include: { hostProfile: true }
        })

        if (user) {
          const priceId = stripeSub.items?.data[0]?.price?.id
          const tier = await prisma.subscriptionTier.findFirst({
            where: { stripePriceId: priceId }
          })
          const planName = tier?.name || 'monthly'

          const subData = {
            plan: planName,
            referenceId: user.id,
            stripeCustomerId,
            stripeSubscriptionId: stripeSub.id,
            status: status,
            periodStart: new Date(stripeSub.current_period_start * 1000),
            periodEnd: new Date(stripeSub.current_period_end * 1000),
            trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
            trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            cancelAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
            canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
            endedAt: stripeSub.ended_at ? new Date(stripeSub.ended_at * 1000) : null,
            billingInterval: stripeSub.items?.data[0]?.price?.recurring?.interval || 'month',
            stripeScheduleId: (stripeSub.schedule as string) || null,
          }

          const existingSub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: stripeSub.id },
          })

          if (existingSub) {
            await prisma.subscription.update({
              where: { id: existingSub.id },
              data: subData,
            })
          } else {
            await prisma.subscription.create({
              data: subData,
            })
          }

          // Update HostProfile
          await prisma.hostProfile.upsert({
            where: { userId: user.id },
            update: {
              stripeCustomerId,
              subscriptionStatus: subStatus,
            },
            create: {
              userId: user.id,
              stripeCustomerId,
              subscriptionStatus: subStatus,
            },
          })

          // Maintain roles bridge: grant/remove 'host' role based on active status
          let updatedRoles = user.roles || []

          if (subStatus === 'active') {
            if (!updatedRoles.includes('host')) {
              updatedRoles = [...updatedRoles, 'host']
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

// 4. POST /v1/billing/verify-session — Synchronously verify and sync Stripe checkout session status
router.post('/verify-session', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { sessionId } = req.body

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: 'sessionId is a required field in the request body.',
    })
  }

  try {
    console.log(`🔍 [verify-session] Verifying checkout session ${sessionId} for user ${req.user.email}`)
    
    // Retrieve checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(400).json({
        success: false,
        message: 'Stripe checkout session has not been fully paid or completed.',
        status: session.status,
        paymentStatus: session.payment_status,
      })
    }

    const stripeCustomerId = session.customer as string
    const subscriptionId = session.subscription as string

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'No subscription is associated with this checkout session.',
      })
    }

    // Retrieve subscription from Stripe to get period dates and status
    const stripeSub = (await stripe.subscriptions.retrieve(subscriptionId)) as any
    const status = stripeSub.status
    const subStatus = status === 'active' || status === 'trialing' ? 'active' : 'inactive'

    const priceId = stripeSub.items.data[0]?.price.id
    const tier = await prisma.subscriptionTier.findFirst({
      where: { stripePriceId: priceId },
    })
    const planName = tier?.name || 'monthly'

    // Update database inside transaction to prevent race conditions
    await prisma.$transaction(async (tx) => {
      // 1. Upsert Subscription table
      const existingSub = await tx.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
      })

      const subData = {
        plan: planName,
        referenceId: req.user.id,
        stripeCustomerId,
        stripeSubscriptionId: subscriptionId,
        status: status,
        periodStart: new Date(stripeSub.current_period_start * 1000),
        periodEnd: new Date(stripeSub.current_period_end * 1000),
        trialStart: stripeSub.trial_start ? new Date(stripeSub.trial_start * 1000) : null,
        trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        cancelAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
        canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
        endedAt: stripeSub.ended_at ? new Date(stripeSub.ended_at * 1000) : null,
        billingInterval: stripeSub.items.data[0]?.price.recurring?.interval || 'month',
        stripeScheduleId: (stripeSub.schedule as string) || null,
      }

      if (existingSub) {
        await tx.subscription.update({
          where: { id: existingSub.id },
          data: subData,
        })
      } else {
        await tx.subscription.create({
          data: subData,
        })
      }

      // 2. Upsert HostProfile
      await tx.hostProfile.upsert({
        where: { userId: req.user.id },
        update: {
          stripeCustomerId,
          subscriptionStatus: subStatus,
        },
        create: {
          userId: req.user.id,
          stripeCustomerId,
          subscriptionStatus: subStatus,
        },
      })

      // 3. Grant host role in User table
      const user = await tx.user.findUnique({
        where: { id: req.user.id },
      })

      if (user) {
        let updatedRoles = user.roles || []
        if (subStatus === 'active') {
          if (!updatedRoles.includes('host')) {
            updatedRoles = [...updatedRoles, 'host']
          }
        } else {
          updatedRoles = updatedRoles.filter((r) => r !== 'host')
        }

        if (updatedRoles.length === 0) {
          updatedRoles = ['singer']
        }

        await tx.user.update({
          where: { id: req.user.id },
          data: { roles: updatedRoles },
        })
      }
    })

    console.log(`✅ [verify-session] Synced user subscription details successfully. status=${subStatus}`)

    return res.status(200).json({
      success: true,
      message: 'Subscription session verified and synced.',
      status: subStatus,
    })
  } catch (error: any) {
    console.error('Error verifying Stripe session:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to verify checkout session.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 5. GET /v1/billing/portal-data — Fetch unified custom billing portal details (subscription, default payment method, past invoices, upcoming charge)
router.get('/portal-data', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // 1. Fetch user's local subscription state
    const subscription = await prisma.subscription.findFirst({
      where: { referenceId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })

    // 2. Fetch customer ID
    let stripeCustomerId = req.user.stripeCustomerId
    if (!stripeCustomerId) {
      const hostProfile = await prisma.hostProfile.findUnique({
        where: { userId: req.user.id }
      })
      stripeCustomerId = hostProfile?.stripeCustomerId || null
    }

    // If no Stripe customer, they are not subscribed yet
    if (!stripeCustomerId) {
      return res.status(200).json({
        success: true,
        subscription: null,
        paymentMethod: null,
        invoices: [],
        upcomingInvoice: null,
      })
    }

    // 3. Fetch Stripe dynamic details in parallel
    const [pmResult, invoicesResult, upcomingResult] = await Promise.allSettled([
      // Fetch default payment method details
      (async () => {
        const customer = await stripe.customers.retrieve(stripeCustomerId) as any
        if (customer.deleted) return null

        const pmId = customer.invoice_settings?.default_payment_method as string | undefined
        if (!pmId) {
          // Fallback to first available card payment method
          const paymentMethods = await stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: 'card',
            limit: 1,
          })
          if (paymentMethods.data.length > 0) {
            return paymentMethods.data[0]
          }
          return null
        }

        return await stripe.paymentMethods.retrieve(pmId)
      })(),

      // Fetch invoice list
      stripe.invoices.list({
        customer: stripeCustomerId,
        limit: 12,
      }),

      // Fetch upcoming invoice
      (async () => {
        try {
          if (!subscription?.stripeSubscriptionId) {
            return null
          }
          // Use the new createPreview API for 2026-05-27.dahlia
          return await (stripe.invoices as any).createPreview({
            customer: stripeCustomerId,
            subscription: subscription.stripeSubscriptionId,
          })
        } catch {
          // createPreview throws if there are no upcoming charges, return null in that case
          return null
        }
      })()
    ])

    // Coalesce results safely
    const paymentMethodRaw = pmResult.status === 'fulfilled' ? pmResult.value : null
    const invoicesRaw = invoicesResult.status === 'fulfilled' ? invoicesResult.value : null
    const upcomingInvoiceRaw = upcomingResult.status === 'fulfilled' ? upcomingResult.value : null

    // Format payment method
    let paymentMethod = null
    if (paymentMethodRaw && (paymentMethodRaw as any).card) {
      paymentMethod = {
        brand: (paymentMethodRaw as any).card.brand,
        last4: (paymentMethodRaw as any).card.last4,
        expMonth: (paymentMethodRaw as any).card.exp_month,
        expYear: (paymentMethodRaw as any).card.exp_year,
      }
    }

    // Format invoices list
    const invoices = invoicesRaw
      ? invoicesRaw.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          amount: inv.total || 0,
          status: inv.status,
          created: inv.created,
          hostedUrl: inv.hosted_invoice_url,
          pdf: inv.invoice_pdf,
        }))
      : []

    // Format upcoming invoice
    let upcomingInvoice = null
    if (upcomingInvoiceRaw) {
      upcomingInvoice = {
        amount: (upcomingInvoiceRaw as any).total || (upcomingInvoiceRaw as any).amount_due || 0,
        date: (upcomingInvoiceRaw as any).next_payment_attempt || (upcomingInvoiceRaw as any).period_end || null,
      }
    }

    return res.status(200).json({
      success: true,
      subscription,
      paymentMethod,
      invoices,
      upcomingInvoice,
    })
  } catch (error: any) {
    console.error('Error fetching billing portal data:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve billing portal details.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// 6. POST /v1/billing/portal-session — Create flow-specific Stripe billing portal session redirect
router.post('/portal-session', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { flowType, subscriptionId } = req.body

  try {
    let stripeCustomerId = req.user.stripeCustomerId
    if (!stripeCustomerId) {
      const hostProfile = await prisma.hostProfile.findUnique({
        where: { userId: req.user.id }
      })
      stripeCustomerId = hostProfile?.stripeCustomerId || null
    }

    if (!stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe customer profile found. Please subscribe first.',
      })
    }

    const hostPortalUrl = process.env.HOST_PORTAL_URL || 'http://localhost:3011'
    const returnUrl = `${hostPortalUrl}/billing`

    const sessionParams: any = {
      customer: stripeCustomerId,
      return_url: returnUrl,
    }

    if (flowType === 'payment_method_update') {
      sessionParams.flow_data = {
        type: 'payment_method_update',
      }
    } else if (flowType === 'subscription_cancel') {
      const subId = subscriptionId || (await prisma.subscription.findFirst({
        where: { referenceId: req.user.id, status: 'active' },
        orderBy: { createdAt: 'desc' },
      }))?.stripeSubscriptionId

      if (!subId) {
        return res.status(400).json({
          success: false,
          message: 'No active subscription found to cancel.',
        })
      }

      sessionParams.flow_data = {
        type: 'subscription_cancel',
        subscription_cancel: {
          subscription: subId,
        },
      }
    } else if (flowType === 'subscription_update') {
      const subId = subscriptionId || (await prisma.subscription.findFirst({
        where: { referenceId: req.user.id, status: 'active' },
        orderBy: { createdAt: 'desc' },
      }))?.stripeSubscriptionId

      if (!subId) {
        return res.status(400).json({
          success: false,
          message: 'No active subscription found to update.',
        })
      }

      sessionParams.flow_data = {
        type: 'subscription_update',
        subscription_update: {
          subscription: subId,
        },
      }
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams)

    return res.status(200).json({
      success: true,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create billing portal session.',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
