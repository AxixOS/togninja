/**
 * Setup script for Digital Storage Stripe subscription products
 * Run with: node scripts/setup-storage-subscriptions.js
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const STORAGE_LIMITS = {
  starter: 53687091200,      // 50GB in bytes
  professional: 214748364800, // 200GB in bytes
  enterprise: 1099511627776,  // 1TB in bytes
};

async function setupStorageProducts() {
  console.log('🚀 Setting up Digital Storage subscription products...\n');

  try {
    // 1. Create Starter Plan
    console.log('Creating Starter plan...');
    const starterProduct = await stripe.products.create({
      name: 'Digital Storage - Starter',
      description: 'Perfect for small studios - 50GB storage, up to 100 clients',
      metadata: {
        tier: 'starter',
        storageLimit: STORAGE_LIMITS.starter.toString(),
        clientLimit: '100',
      },
    });

    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 999, // €9.99
      currency: 'eur',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'starter',
        storageLimit: STORAGE_LIMITS.starter.toString(),
      },
    });

    console.log(`✅ Starter Product: ${starterProduct.id}`);
    console.log(`✅ Starter Price: ${starterPrice.id}\n`);

    // 2. Create Professional Plan
    console.log('Creating Professional plan...');
    const professionalProduct = await stripe.products.create({
      name: 'Digital Storage - Professional',
      description: 'For growing businesses - 200GB storage, up to 500 clients, client galleries',
      metadata: {
        tier: 'professional',
        storageLimit: STORAGE_LIMITS.professional.toString(),
        clientLimit: '500',
        features: 'client_galleries',
      },
    });

    const professionalPrice = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 1999, // €19.99
      currency: 'eur',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'professional',
        storageLimit: STORAGE_LIMITS.professional.toString(),
      },
    });

    console.log(`✅ Professional Product: ${professionalProduct.id}`);
    console.log(`✅ Professional Price: ${professionalPrice.id}\n`);

    // 3. Create Enterprise Plan
    console.log('Creating Enterprise plan...');
    const enterpriseProduct = await stripe.products.create({
      name: 'Digital Storage - Enterprise',
      description: 'For large studios - 1TB storage, unlimited clients, priority backup, advanced features',
      metadata: {
        tier: 'enterprise',
        storageLimit: STORAGE_LIMITS.enterprise.toString(),
        clientLimit: 'unlimited',
        features: 'priority_backup,advanced_features',
      },
    });

    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 3999, // €39.99
      currency: 'eur',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'enterprise',
        storageLimit: STORAGE_LIMITS.enterprise.toString(),
      },
    });

    console.log(`✅ Enterprise Product: ${enterpriseProduct.id}`);
    console.log(`✅ Enterprise Price: ${enterprisePrice.id}\n`);

    // 4. Print environment variables to add
    console.log('📝 Add these to your .env file:\n');
    console.log(`STRIPE_PRICE_STARTER=${starterPrice.id}`);
    console.log(`STRIPE_PRICE_PROFESSIONAL=${professionalPrice.id}`);
    console.log(`STRIPE_PRICE_ENTERPRISE=${enterprisePrice.id}\n`);
    console.log(`VITE_STRIPE_PRICE_STARTER=${starterPrice.id}`);
    console.log(`VITE_STRIPE_PRICE_PROFESSIONAL=${professionalPrice.id}`);
    console.log(`VITE_STRIPE_PRICE_ENTERPRISE=${enterprisePrice.id}\n`);

    console.log('✨ Setup complete! Products created in Stripe dashboard.');
    console.log(`🔗 View at: https://dashboard.stripe.com/products\n`);

  } catch (error) {
    console.error('❌ Error setting up products:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n💡 Make sure STRIPE_SECRET_KEY is set in your .env file');
    }
    process.exit(1);
  }
}

// Run setup
setupStorageProducts();
