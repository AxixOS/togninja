/**
 * Storage Subscription Demo Mode Setup
 * Creates demo user with active subscription for testing
 */

import { db } from './db';
import {  storageSubscriptions, storageUsage, users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const DEMO_USER_EMAIL = 'demo@storage.test';
const DEMO_USER_ID = 'demo-storage-user-001';

async function setupDemoMode() {
  console.log('🎬 Setting up Storage Subscription Demo Mode...\n');

  try {
    // 1. Check if demo user exists
    console.log('1️⃣  Checking for demo user...');
    let demoUser = await db.select()
      .from(users)
      .where(eq(users.email, DEMO_USER_EMAIL))
      .limit(1);

    if (demoUser.length === 0) {
      console.log('   Creating demo user...');
      [demoUser[0]] = await db.insert(users).values({
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        password: '$2b$10$demo.hashed.password', // Placeholder
        role: 'user',
        firstName: 'Demo',
        lastName: 'User',
      }).returning();
      console.log('   ✅ Demo user created');
    } else {
      console.log(`   ✅ Demo user exists: ${demoUser[0].email}`);
    }

    // 2. Check if demo subscription exists
    console.log('\n2️⃣  Checking for demo subscription...');
    let demoSubscription = await db.select()
      .from(storageSubscriptions)
      .where(eq(storageSubscriptions.userId, demoUser[0].id))
      .limit(1);

    if (demoSubscription.length === 0) {
      console.log('   Creating demo subscription (Professional tier)...');
      
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30); // 30 days from now

      [demoSubscription[0]] = await db.insert(storageSubscriptions).values({
        userId: demoUser[0].id,
        tier: 'professional', // Professional plan: 200GB
        status: 'active',
        stripeSubscriptionId: 'sub_demo_12345',
        stripeCustomerId: 'cus_demo_12345',
        stripePriceId: 'price_demo_professional',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        storageLimit: 214748364800, // 200GB in bytes
        currentStorageBytes: 0,
      }).returning();
      
      console.log('   ✅ Demo subscription created');
    } else {
      console.log(`   ✅ Demo subscription exists: ${demoSubscription[0].tier} (${demoSubscription[0].status})`);
    }

    // 3. Create or update storage usage record
    console.log('\n3️⃣  Setting up storage usage tracking...');
    
    const existingUsage = await db.select()
      .from(storageUsage)
      .where(eq(storageUsage.subscriptionId, demoSubscription[0].id))
      .limit(1);

    if (existingUsage.length === 0) {
      await db.insert(storageUsage).values({
        subscriptionId: demoSubscription[0].id,
        currentStorageBytes: 0,
        fileCount: 0,
        lastCalculated: new Date(),
      });
      console.log('   ✅ Storage usage tracking initialized');
    } else {
      console.log('   ✅ Storage usage tracking already exists');
    }

    // 4. Print demo credentials and info
    console.log('\n' + '='.repeat(60));
    console.log('✨ DEMO MODE READY!');
    console.log('='.repeat(60));
    console.log('\n📋 Demo Account Details:');
    console.log(`   Email: ${DEMO_USER_EMAIL}`);
    console.log(`   User ID: ${demoUser[0].id}`);
    console.log(`   Subscription: ${demoSubscription[0].tier}`);
    console.log(`   Storage Limit: 200GB`);
    console.log(`   Status: ${demoSubscription[0].status}`);
    console.log(`   Expires: ${demoSubscription[0].currentPeriodEnd.toLocaleDateString()}`);
    
    console.log('\n🔗 Test URLs:');
    console.log(`   My Archive: http://localhost:3001/my-archive`);
    console.log(`   My Subscription: http://localhost:3001/my-subscription`);
    
    console.log('\n📝 Manual Session Setup:');
    console.log('   In your browser console, run:');
    console.log(`   document.cookie = "session=${DEMO_USER_ID}; path=/"`);
    console.log('   Then refresh the page.');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Start your dev server: npm run dev');
    console.log('   2. Navigate to http://localhost:3001/my-archive');
    console.log('   3. Try uploading some test images');
    console.log('   4. Check storage quota and upgrade prompts');
    console.log('   5. Visit /my-subscription to manage your plan');
    
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error setting up demo mode:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupDemoMode()
    .then(() => {
      console.log('✅ Demo mode setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demo mode setup failed:', error);
      process.exit(1);
    });
}

export { setupDemoMode, DEMO_USER_EMAIL, DEMO_USER_ID };
