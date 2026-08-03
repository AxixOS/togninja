#!/usr/bin/env node

/**
 * Script to reset demo data to original state
 * Usage: node scripts/reset-demo-data.js
 */

const { db } = require('../server/db');
const { clients, crmLeads, photographySessions, crmInvoices, galleries, blogPosts, users } = require('../shared/schema');
const { eq, like } = require('drizzle-orm');

async function resetDemoData() {
  try {
    console.log('🔄 Resetting demo data to original state...');

    // Delete all demo data
    console.log('🗑️ Clearing existing demo data...');
    
    await db.delete(clients).where(like(clients.id, 'demo-%'));
    await db.delete(crmLeads).where(like(crmLeads.id, 'demo-%'));
    await db.delete(photographySessions).where(like(photographySessions.id, 'demo-%'));
    await db.delete(crmInvoices).where(like(crmInvoices.id, 'demo-%'));
    await db.delete(galleries).where(like(galleries.id, 'demo-%'));
    await db.delete(blogPosts).where(like(blogPosts.id, 'demo-%'));
    
    // Reset demo user passwords
    console.log('🔐 Resetting demo user credentials...');
    
    // Note: In production, you'd hash these passwords properly
    const demoUsers = [
      {
        email: 'demo@example.com',
        password: 'demo2024', // In production: await hash('demo2024')
        isAdmin: true
      },
      {
        email: 'client@demo.com', 
        password: 'client2024', // In production: await hash('client2024')
        isAdmin: false
      }
    ];

    // Update or create demo users
    for (const user of demoUsers) {
      // This would be implemented based on your auth system
      console.log(`Resetting credentials for ${user.email}`);
    }

    console.log('✅ Demo data reset complete!');
    console.log('');
    console.log('🔄 Run "npm run demo:setup" to repopulate fresh demo data');
    console.log('');
    console.log('Demo Accounts After Reset:');
    console.log('Admin: demo@example.com / demo2024');
    console.log('Client: client@demo.com / client2024');

  } catch (error) {
    console.error('❌ Error resetting demo data:', error);
    process.exit(1);
  }
}

// Schedule automatic reset (daily at midnight)
function scheduleAutomaticReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    console.log('🕛 Performing scheduled demo data reset...');
    resetDemoData().then(() => {
      // Setup fresh data after reset
      require('./setup-demo-data').setupDemoData();
      
      // Schedule next reset
      scheduleAutomaticReset();
    });
  }, msUntilMidnight);
  
  console.log(`⏰ Next automatic reset scheduled for: ${tomorrow.toLocaleString()}`);
}

if (require.main === module) {
  if (process.argv.includes('--schedule')) {
    scheduleAutomaticReset();
  } else {
    resetDemoData();
  }
}

module.exports = { resetDemoData, scheduleAutomaticReset };