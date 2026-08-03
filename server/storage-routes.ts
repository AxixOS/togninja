/**
 * Digital Storage Subscription API Routes
 * Handles Stripe checkout, webhooks, and subscription management
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { eq, and, sql as sqlOperator } from 'drizzle-orm';
import { db } from './db';
import { requireAuth, getCurrentUser } from './auth';
import { 
  storageSubscriptions, 
  storageUsage,
  users,
  crmClients 
} from '../shared/schema';

const router = Router();

// Initialize Stripe (only if API key is available)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

const STORAGE_LIMITS = {
  starter: 53687091200,      // 50GB
  professional: 214748364800, // 200GB
  enterprise: 1099511627776,  // 1TB
};

/**
 * Create Stripe Checkout Session
 * POST /api/storage/create-checkout-session
 */
router.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const { tier } = req.body;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Resolve the signed-in admin the same way the rest of the app does
    // (admin_users). The old code queried a separate `users` table the admin
    // isn't in → "User not found".
    const currentUser: any = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userEmail: string = currentUser.email || '';

    // Check if user already has a subscription
    const existingSub = await db.select()
      .from(storageSubscriptions)
      .where(eq(storageSubscriptions.userId, userId))
      .limit(1);

    if (existingSub && existingSub.length > 0 && existingSub[0].status === 'active' && existingSub[0].tier !== 'free') {
      return res.status(400).json({ error: 'You already have an active paid subscription.' });
    }

    // Get price ID for tier
    const priceIds = {
      starter: process.env.STRIPE_PRICE_STARTER,
      professional: process.env.STRIPE_PRICE_PROFESSIONAL,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    };

    const priceId = priceIds[tier as keyof typeof priceIds];
    if (!priceId) {
      // Honest, non-cryptic message: paid tiers require Stripe products/prices
      // (STRIPE_PRICE_*) which aren't set on this installation.
      return res.status(400).json({ error: 'Paid storage plans are not enabled on this installation. You can keep using the Free plan — open “Go to My Archive” to manage your files.' });
    }

    // Create Stripe customer if doesn't exist
    let customerId = existingSub?.[0]?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
          tier: tier,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.BASE_URL || 'http://localhost:3001'}/storage/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL || 'http://localhost:3001'}/digital-files`,
      metadata: {
        userId,
        tier,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * Stripe Webhook Handler
 * POST /api/storage/webhook
 */
router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment service not configured' });
  }

  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).send('No signature');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Payment succeeded for invoice:', invoice.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Payment failed for invoice:', invoice.id);
      // TODO: Send email notification to user
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * Handle successful checkout
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as 'starter' | 'professional' | 'enterprise';

  if (!userId || !tier) {
    console.error('Missing userId or tier in session metadata');
    return;
  }

  // Get subscription details from Stripe
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Create subscription record
  const [newSub] = await db.insert(storageSubscriptions).values({
    userId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    stripePriceId: subscription.items.data[0].price.id,
    tier,
    status: 'active',
    storageLimit: STORAGE_LIMITS[tier],
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }).returning();

  // Create initial storage usage record
  await db.insert(storageUsage).values({
    subscriptionId: newSub.id,
    totalUsed: 0,
    imagesCount: 0,
    videosCount: 0,
    documentsCount: 0,
    otherFilesCount: 0,
    percentageUsed: '0',
  });

  console.log(`✅ Subscription created for user ${userId}, tier: ${tier}`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const updates: any = {
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date(),
  };

  // Check if tier changed
  const priceId = subscription.items.data[0].price.id;
  const tierMap: Record<string, { tier: string; limit: number }> = {
    [process.env.STRIPE_PRICE_STARTER || '']: { tier: 'starter', limit: STORAGE_LIMITS.starter },
    [process.env.STRIPE_PRICE_PROFESSIONAL || '']: { tier: 'professional', limit: STORAGE_LIMITS.professional },
    [process.env.STRIPE_PRICE_ENTERPRISE || '']: { tier: 'enterprise', limit: STORAGE_LIMITS.enterprise },
  };

  if (tierMap[priceId]) {
    updates.tier = tierMap[priceId].tier;
    updates.storageLimit = tierMap[priceId].limit;
  }

  await db.update(storageSubscriptions)
    .set(updates)
    .where(eq(storageSubscriptions.stripeSubscriptionId, subscription.id));

  console.log(`✅ Subscription updated: ${subscription.id}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.update(storageSubscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(storageSubscriptions.stripeSubscriptionId, subscription.id));

  console.log(`✅ Subscription canceled: ${subscription.id}`);
}

/**
 * Get user's subscription
 * GET /api/storage/subscription
 */
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const subscription = await db.select()
      .from(storageSubscriptions)
      .where(eq(storageSubscriptions.userId, userId))
      .limit(1);

    if (!subscription || subscription.length === 0) {
      return res.json({ subscription: null });
    }

    const usage = await db.select()
      .from(storageUsage)
      .where(eq(storageUsage.subscriptionId, subscription[0].id))
      .limit(1);

    res.json({
      subscription: subscription[0],
      usage: usage[0] || null,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * Create Stripe Customer Portal session
 * POST /api/storage/create-portal-session
 */
router.post('/create-portal-session', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const subscription = await db.select()
      .from(storageSubscriptions)
      .where(eq(storageSubscriptions.userId, userId))
      .limit(1);

    if (!subscription || subscription.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription[0].stripeCustomerId!,
      return_url: `${process.env.BASE_URL || 'http://localhost:3001'}/my-subscription`,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * Cancel subscription at period end
 * POST /api/storage/cancel-subscription
 */
router.post('/cancel-subscription', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const subscription = await db.select()
      .from(storageSubscriptions)
      .where(
        and(
          eq(storageSubscriptions.userId, userId),
          eq(storageSubscriptions.status, 'active')
        )
      )
      .limit(1);

    if (!subscription || subscription.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const sub = subscription[0];

    // Cancel at period end in Stripe
    const updatedSubscription = await stripe.subscriptions.update(
      sub.stripeSubscriptionId!,
      {
        cancel_at_period_end: true,
      }
    );

    // Update in database
    await db.update(storageSubscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(storageSubscriptions.id, sub.id));

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
      cancelAt: updatedSubscription.cancel_at,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Create Demo Subscription (No Stripe - for testing)
 * POST /api/storage/demo-subscription
 */
router.post('/demo-subscription', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user already has a subscription
    const existingSub = await db.select()
      .from(storageSubscriptions)
      .where(eq(storageSubscriptions.userId, userId))
      .limit(1);

    if (existingSub && existingSub.length > 0 && existingSub[0].status === 'active') {
      return res.json({ 
        success: true, 
        message: 'Already have an active subscription',
        subscription: existingSub[0]
      });
    }

    // Create demo subscription (Professional tier - 200GB)
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [newSub] = await db.insert(storageSubscriptions)
      .values({
        userId: userId,
        tier: 'professional',
        status: 'active',
        stripeCustomerId: `demo_customer_${userId}`,
        stripeSubscriptionId: `demo_sub_${Date.now()}`,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        storageLimit: STORAGE_LIMITS.professional,
      })
      .returning();

    console.log('✅ Demo subscription created:', { userId, tier: 'professional' });

    res.json({
      success: true,
      message: 'Demo subscription created successfully! You can now upload files.',
      subscription: newSub,
    });
  } catch (error) {
    console.error('Error creating demo subscription:', error);
    res.status(500).json({ error: 'Failed to create demo subscription' });
  }
});

/**
 * Activate Free Tier (5GB)
 * POST /api/storage/activate-free-tier
 * Note: Requires authentication - user must be logged in
 */
router.post('/activate-free-tier', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    const userId = req.session?.userId;
    
    console.log('🔍 Free tier activation request:', { 
      userId, 
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : []
    });
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Please log in to activate free storage' 
      });
    }

    // Check if user already has a subscription
    const existingSub = await db.select()
      .from(storageSubscriptions)
      .where(eq(storageSubscriptions.userId, userId))
      .limit(1);

    console.log('🔍 Existing subscription check:', { 
      userId, 
      hasExisting: existingSub && existingSub.length > 0,
      existingStatus: existingSub?.[0]?.status 
    });

    if (existingSub && existingSub.length > 0) {
      console.log('⚠️ User already has subscription:', existingSub[0]);
      return res.json({ 
        success: true,
        message: 'You already have an active subscription!',
        subscription: existingSub[0],
      });
    }

    // Create free tier subscription (5GB)
    const now = new Date();
    
    const [newSub] = await db.insert(storageSubscriptions)
      .values({
        userId: userId,
        tier: 'free',
        status: 'active',
        storageLimit: 5 * 1024 * 1024 * 1024, // 5GB in bytes
        currentPeriodStart: now,
        currentPeriodEnd: null, // Free tier doesn't expire
      })
      .returning();

    console.log('✅ Free tier subscription created:', { 
      subscriptionId: newSub.id, 
      userId,
      tier: newSub.tier,
      status: newSub.status 
    });

    // Create initial usage record using raw SQL (schema mismatch workaround)
    await db.execute(sqlOperator`
      INSERT INTO storage_usage (subscription_id, current_storage_bytes, file_count)
      VALUES (${newSub.id}, 0, 0)
    `);

    console.log('✅ Free tier activated:', { 
      userId, 
      subscriptionId: newSub.id,
      tier: 'free',
      storageLimit: newSub.storageLimit 
    });

    res.json({
      success: true,
      message: 'Free tier activated! You now have 5GB of storage.',
      subscription: newSub,
    });
  } catch (error) {
    console.error('❌ Error activating free tier:', error);
    res.status(500).json({ error: 'Failed to activate free tier' });
  }
});

export default router;
