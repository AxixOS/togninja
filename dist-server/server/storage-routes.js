"use strict";
/**
 * Digital Storage Subscription API Routes
 * Handles Stripe checkout, webhooks, and subscription management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("./db");
const schema_1 = require("../shared/schema");
const router = (0, express_1.Router)();
// Initialize Stripe (only if API key is available)
const stripe = process.env.STRIPE_SECRET_KEY
    ? new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
    })
    : null;
const STORAGE_LIMITS = {
    starter: 53687091200, // 50GB
    professional: 214748364800, // 200GB
    enterprise: 1099511627776, // 1TB
};
/**
 * Create Stripe Checkout Session
 * POST /api/storage/create-checkout-session
 */
router.post('/create-checkout-session', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Payment service not configured' });
        }
        const { tier } = req.body;
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        // Get user details
        const user = await db_1.db.select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user || user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if user already has a subscription
        const existingSub = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId))
            .limit(1);
        if (existingSub && existingSub.length > 0 && existingSub[0].status === 'active') {
            return res.status(400).json({ error: 'Already have an active subscription' });
        }
        // Get price ID for tier
        const priceIds = {
            starter: process.env.STRIPE_PRICE_STARTER,
            professional: process.env.STRIPE_PRICE_PROFESSIONAL,
            enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
        };
        const priceId = priceIds[tier];
        if (!priceId) {
            return res.status(400).json({ error: 'Invalid tier' });
        }
        // Create Stripe customer if doesn't exist
        let customerId = existingSub?.[0]?.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user[0].email,
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
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});
/**
 * Stripe Webhook Handler
 * POST /api/storage/webhook
 */
router.post('/webhook', async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Payment service not configured' });
    }
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        return res.status(400).send('No signature');
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            await handleCheckoutComplete(session);
            break;
        }
        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            await handleSubscriptionUpdated(subscription);
            break;
        }
        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            await handleSubscriptionDeleted(subscription);
            break;
        }
        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            console.log('Payment succeeded for invoice:', invoice.id);
            break;
        }
        case 'invoice.payment_failed': {
            const invoice = event.data.object;
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
async function handleCheckoutComplete(session) {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;
    if (!userId || !tier) {
        console.error('Missing userId or tier in session metadata');
        return;
    }
    // Get subscription details from Stripe
    const subscriptionId = session.subscription;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    // Create subscription record
    const [newSub] = await db_1.db.insert(schema_1.storageSubscriptions).values({
        userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        stripePriceId: subscription.items.data[0].price.id,
        tier,
        status: 'active',
        storageLimit: STORAGE_LIMITS[tier],
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
    }).returning();
    // Create initial storage usage record
    await db_1.db.insert(schema_1.storageUsage).values({
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
async function handleSubscriptionUpdated(subscription) {
    const updates = {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
    };
    // Check if tier changed
    const priceId = subscription.items.data[0].price.id;
    const tierMap = {
        [process.env.STRIPE_PRICE_STARTER || '']: { tier: 'starter', limit: STORAGE_LIMITS.starter },
        [process.env.STRIPE_PRICE_PROFESSIONAL || '']: { tier: 'professional', limit: STORAGE_LIMITS.professional },
        [process.env.STRIPE_PRICE_ENTERPRISE || '']: { tier: 'enterprise', limit: STORAGE_LIMITS.enterprise },
    };
    if (tierMap[priceId]) {
        updates.tier = tierMap[priceId].tier;
        updates.storageLimit = tierMap[priceId].limit;
    }
    await db_1.db.update(schema_1.storageSubscriptions)
        .set(updates)
        .where((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.stripeSubscriptionId, subscription.id));
    console.log(`✅ Subscription updated: ${subscription.id}`);
}
/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription) {
    await db_1.db.update(schema_1.storageSubscriptions)
        .set({
        status: 'canceled',
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.stripeSubscriptionId, subscription.id));
    console.log(`✅ Subscription canceled: ${subscription.id}`);
}
/**
 * Get user's subscription
 * GET /api/storage/subscription
 */
router.get('/subscription', async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId))
            .limit(1);
        if (!subscription || subscription.length === 0) {
            return res.json({ subscription: null });
        }
        const usage = await db_1.db.select()
            .from(schema_1.storageUsage)
            .where((0, drizzle_orm_1.eq)(schema_1.storageUsage.subscriptionId, subscription[0].id))
            .limit(1);
        res.json({
            subscription: subscription[0],
            usage: usage[0] || null,
        });
    }
    catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});
/**
 * Create Stripe Customer Portal session
 * POST /api/storage/create-portal-session
 */
router.post('/create-portal-session', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Payment service not configured' });
        }
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId))
            .limit(1);
        if (!subscription || subscription.length === 0) {
            return res.status(404).json({ error: 'No subscription found' });
        }
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: subscription[0].stripeCustomerId,
            return_url: `${process.env.BASE_URL || 'http://localhost:3001'}/my-subscription`,
        });
        res.json({ url: portalSession.url });
    }
    catch (error) {
        console.error('Error creating portal session:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});
/**
 * Cancel subscription at period end
 * POST /api/storage/cancel-subscription
 */
router.post('/cancel-subscription', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Payment service not configured' });
        }
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const subscription = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.status, 'active')))
            .limit(1);
        if (!subscription || subscription.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }
        const sub = subscription[0];
        // Cancel at period end in Stripe
        const updatedSubscription = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });
        // Update in database
        await db_1.db.update(schema_1.storageSubscriptions)
            .set({
            cancelAtPeriodEnd: true,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.id, sub.id));
        res.json({
            success: true,
            message: 'Subscription will be canceled at the end of the billing period',
            cancelAt: updatedSubscription.cancel_at,
        });
    }
    catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});
/**
 * Create Demo Subscription (No Stripe - for testing)
 * POST /api/storage/demo-subscription
 */
router.post('/demo-subscription', async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        // Check if user already has a subscription
        const existingSub = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId))
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
        const [newSub] = await db_1.db.insert(schema_1.storageSubscriptions)
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
    }
    catch (error) {
        console.error('Error creating demo subscription:', error);
        res.status(500).json({ error: 'Failed to create demo subscription' });
    }
});
/**
 * Activate Free Tier (5GB)
 * POST /api/storage/activate-free-tier
 * Note: Requires authentication - user must be logged in
 */
router.post('/activate-free-tier', async (req, res) => {
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
        const existingSub = await db_1.db.select()
            .from(schema_1.storageSubscriptions)
            .where((0, drizzle_orm_1.eq)(schema_1.storageSubscriptions.userId, userId))
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
        const [newSub] = await db_1.db.insert(schema_1.storageSubscriptions)
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
        await db_1.db.execute((0, drizzle_orm_1.sql) `
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
    }
    catch (error) {
        console.error('❌ Error activating free tier:', error);
        res.status(500).json({ error: 'Failed to activate free tier' });
    }
});
exports.default = router;
