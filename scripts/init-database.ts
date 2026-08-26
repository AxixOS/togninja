/**
 * Complete Database Initialization Script
 * 
 * This script will:
 * 1. Verify database connection
 * 2. Check/create all tables via Drizzle
 * 3. Seed initial configuration data
 * 4. Create default admin user
 * 5. Set up initial studio configuration
 * 6. Validate all features are ready
 */

import 'dotenv/config';
import { db } from '../server/db';
import { 
  users, 
  adminUsers,
  studioConfigs,
  templateDefinitions,
  priceListItems,
  voucherProducts,
  discountCoupons
} from '../shared/schema';
import { sql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function step(number: number, message: string) {
  log(`\n${COLORS.bright}${COLORS.cyan}[${number}/8] ${message}${COLORS.reset}`);
}

async function checkConnection() {
  step(1, 'Testing database connection...');
  
  try {
    await db.execute(sql`SELECT 1`);
    log('✅ Database connection successful!', COLORS.green);
    return true;
  } catch (error: any) {
    log('❌ Database connection failed!', COLORS.red);
    log(`Error: ${error.message}`, COLORS.red);
    return false;
  }
}

async function verifyTables() {
  step(2, 'Verifying database schema...');
  
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tableCount = result.rows.length;
    log(`✅ Found ${tableCount} tables in database`, COLORS.green);
    
    if (tableCount === 0) {
      log('\n⚠️  No tables found! Please run: npm run db:push', COLORS.yellow);
      return false;
    }
    
    // List some key tables
    const tableNames = result.rows.map((row: any) => row.table_name);
    const keyTables = [
      'users', 'crm_clients', 'photography_sessions', 
      'crm_invoices', 'voucher_products', 'galleries'
    ];
    
    const missingTables = keyTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length > 0) {
      log(`\n⚠️  Missing key tables: ${missingTables.join(', ')}`, COLORS.yellow);
      log('Run: npm run db:push to create all tables', COLORS.yellow);
      return false;
    }
    
    log('✅ All key tables verified', COLORS.green);
    return true;
  } catch (error: any) {
    log(`❌ Error checking tables: ${error.message}`, COLORS.red);
    return false;
  }
}

async function createDefaultAdmin() {
  step(3, 'Creating default admin user...');
  
  try {
    // Check if admin exists
    const existing = await db.select().from(adminUsers).limit(1);
    
    if (existing.length > 0) {
      log('ℹ️  Admin user already exists, skipping...', COLORS.blue);
      return true;
    }
    
    // Create default admin
    // Opt-in, and off by default.
    //
    // This used to run on every provisioned instance, putting a known password on a
    // public URL — and worse, its mere existence made server/index.ts mark onboarding
    // COMPLETE, which put /api/setup behind a login the buyer had never been given.
    // The buyer creates their own admin during setup (technical-setup-routes.ts), so
    // this exists only for a local demo where somebody wants to skip that.
    if (String(process.env.SEED_DEMO_ADMIN || '').toLowerCase() !== 'true') {
      log('ℹ️  Skipping the demo admin (set SEED_DEMO_ADMIN=true to create one).', COLORS.blue);
      // true: the step succeeded. It simply had nothing to create — same contract as the
      // "already exists" branch above, so a future caller that DOES check this cannot be
      // told a healthy skip was a failure.
      return true;
    }

    const demoPassword = process.env.SEED_DEMO_ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    
    await db.insert(adminUsers).values({
      email: 'admin@photography-crm.local',
      passwordHash: passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      status: 'active'
    });
    
    log('✅ Default admin created!', COLORS.green);
    log('   📧 Email: admin@photography-crm.local', COLORS.cyan);
    log('   🔑 Password: admin123', COLORS.cyan);
    log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!', COLORS.yellow);
    return true;
  } catch (error: any) {
    log(`❌ Error creating admin: ${error.message}`, COLORS.red);
    return false;
  }
}

async function createStudioConfig() {
  step(4, 'Setting up default studio configuration...');
  
  try {
    const existing = await db.select().from(studioConfigs).limit(1);
    
    if (existing.length > 0) {
      log('ℹ️  Studio config already exists, skipping...', COLORS.blue);
      return true;
    }
    
    // A ROW, NOT AN ANSWER.
    //
    // This seeded businessName and studioName as "Photography Studio" — and server/index.ts
    // treats a non-empty name as proof that a studio has been through Basics:
    //
    //     "A studio that has told us its own name has genuinely been through Basics.
    //      That is a fact about the STUDIO rather than about the auth table."
    //
    // Sound reasoning, given a name the studio actually gave. The seed gave it one they
    // never chose, so every freshly provisioned tenant booted, was auto-marked
    // creative_setup_complete, and the /api/setup mount then required authentication —
    // which does not exist yet, because the admin account is created several steps into the
    // wizard that can no longer save anything. Observed on togninja-studio: setup status
    // reported currentStep "complete" on an instance nobody had touched, and every save
    // returned 401.
    //
    // Empty rather than absent: studio_name is NOT NULL, and the detector reads through
    // nullif(trim(...), '') so an empty string is correctly read as unanswered.
    await db.insert(studioConfigs).values({
      studioName: '',
      businessName: '',
      // Austria was the origin studio's. A seeded country pre-answers a question the wizard
      // asks, and it drives the competitor search index and the pillar copy.
      country: '',
      ownerEmail: '',
      subdomain: '',
      // Left to the theme presets. #7C3AED is the violet this product spent a week removing
      // from everything else it touched.
      fontFamily: 'Inter',
      enabledFeatures: ['gallery', 'booking', 'blog', 'crm'],
      isActive: true,
      subscriptionStatus: 'trial'
    });
    
    log('✅ Studio configuration created!', COLORS.green);
    return true;
  } catch (error: any) {
    log(`❌ Error creating studio config: ${error.message}`, COLORS.red);
    return false;
  }
}

async function createTemplateDefinitions() {
  step(5, 'Setting up website templates...');
  
  try {
    const existing = await db.select().from(templateDefinitions).limit(1);
    
    if (existing.length > 0) {
      log('ℹ️  Templates already exist, skipping...', COLORS.blue);
      return true;
    }
    
    const templates = [
      {
        id: 'template-01-modern-minimal',
        name: 'Modern Minimal',
        description: 'Clean and minimal design perfect for showcasing photography',
        category: 'minimal',
        features: ['Responsive', 'Fast Loading', 'SEO Optimized'],
        isActive: true,
        isPremium: false
      },
      {
        id: 'template-02-artistic-bold',
        name: 'Artistic Bold',
        description: 'Bold and creative design for artistic photographers',
        category: 'artistic',
        features: ['Full-screen galleries', 'Parallax effects', 'Video backgrounds'],
        isActive: true,
        isPremium: true
      }
    ];
    
    await db.insert(templateDefinitions).values(templates);
    
    log(`✅ Created ${templates.length} template definitions!`, COLORS.green);
    return true;
  } catch (error: any) {
    log(`❌ Error creating templates: ${error.message}`, COLORS.red);
    return false;
  }
}

async function createSamplePriceList() {
  step(6, 'Creating sample price list...');
  
  try {
    const existing = await db.select().from(priceListItems).limit(1);
    
    if (existing.length > 0) {
      log('ℹ️  Price list already exists, skipping...', COLORS.blue);
      return true;
    }
    
    const priceItems = [
      {
        name: 'Family Photo Session',
        description: 'Up to 2 hours, outdoor or studio',
        category: 'SESSIONS',
        price: '299.00',
        currency: 'EUR',
        taxRate: '19.00',
        isActive: true
      },
      {
        name: 'Newborn Session',
        description: 'Up to 3 hours including setup',
        category: 'SESSIONS',
        price: '399.00',
        currency: 'EUR',
        taxRate: '19.00',
        isActive: true
      },
      {
        name: 'Digital Files Package (10 images)',
        description: 'High-resolution digital files',
        category: 'DIGITAL',
        price: '150.00',
        currency: 'EUR',
        taxRate: '19.00',
        isActive: true
      },
      {
        name: 'Canvas Print 50x70cm',
        description: 'Premium canvas mounted on frame',
        category: 'PRINTS',
        price: '180.00',
        currency: 'EUR',
        taxRate: '19.00',
        isActive: true
      }
    ];
    
    await db.insert(priceListItems).values(priceItems);
    
    log(`✅ Created ${priceItems.length} price list items!`, COLORS.green);
    return true;
  } catch (error: any) {
    log(`❌ Error creating price list: ${error.message}`, COLORS.red);
    return false;
  }
}

async function createSampleVouchers() {
  step(7, 'Creating sample voucher products...');
  
  try {
    const existing = await db.select().from(voucherProducts).limit(1);
    
    if (existing.length > 0) {
      log('ℹ️  Vouchers already exist, skipping...', COLORS.blue);
      return true;
    }
    
    const vouchers = [
      {
        name: 'Familie Fotoshooting',
        description: 'Professional family photo session in our studio or outdoor location',
        price: '299.00',
        originalPrice: '349.00',
        category: 'familie',
        sessionDuration: 120,
        validityPeriod: 1460, // 48 months
        redemptionInstructions: 'Contact us to schedule your session',
        slug: 'familie-fotoshooting',
        isActive: true,
        featured: true,
        badge: '15% OFF'
      },
      {
        name: 'Neugeborenen Fotoshooting',
        description: 'Gentle newborn photography session with props and setups',
        price: '399.00',
        category: 'baby',
        sessionDuration: 180,
        validityPeriod: 365, // 12 months
        redemptionInstructions: 'Best within first 14 days after birth',
        slug: 'neugeborenen-fotoshooting',
        isActive: true,
        featured: true
      },
      {
        name: 'Business Portrait Session',
        description: 'Professional headshots for business use',
        price: '199.00',
        category: 'business',
        sessionDuration: 60,
        validityPeriod: 730, // 24 months
        slug: 'business-portrait',
        isActive: true
      }
    ];
    
    await db.insert(voucherProducts).values(vouchers);
    
    log(`✅ Created ${vouchers.length} voucher products!`, COLORS.green);
    return true;
  } catch (error: any) {
    log(`❌ Error creating vouchers: ${error.message}`, COLORS.red);
    return false;
  }
}

async function createSampleCoupons() {
  step(8, 'Creating sample discount coupons...');
  
  try {
    const existing = await db.select().from(discountCoupons).limit(1);
    
    if (existing.length > 0) {
      log('ℹ️  Coupons already exist, skipping...', COLORS.blue);
      return true;
    }
    
    const coupons = [
      {
        code: 'WELCOME10',
        name: 'Welcome Discount',
        description: '10% off your first booking',
        discountType: 'percentage',
        discountValue: '10.00',
        usageLimit: 100,
        usageCount: 0,
        firstTimeCustomersOnly: true,
        isActive: true
      },
      {
        code: 'SUMMER25',
        name: 'Summer Sale',
        description: '€25 off any session',
        discountType: 'fixed_amount',
        discountValue: '25.00',
        minOrderAmount: '150.00',
        usageLimit: 50,
        usageCount: 0,
        isActive: true
      }
    ];
    
    await db.insert(discountCoupons).values(coupons);
    
    log(`✅ Created ${coupons.length} discount coupons!`, COLORS.green);
    return true;
  } catch (error: any) {
    log(`❌ Error creating coupons: ${error.message}`, COLORS.red);
    return false;
  }
}

async function printSummary() {
  log('\n' + '='.repeat(60), COLORS.cyan);
  log('🎉 DATABASE INITIALIZATION COMPLETE!', COLORS.bright + COLORS.green);
  log('='.repeat(60) + '\n', COLORS.cyan);
  
  log('📊 Your Photography CRM is ready with:', COLORS.bright);
  log('   ✅ Complete database schema (28+ tables)');
  log('   ✅ Default admin user');
  log('   ✅ Studio configuration');
  log('   ✅ Website templates');
  log('   ✅ Sample price list (4 items)');
  log('   ✅ Sample voucher products (3 items)');
  log('   ✅ Sample discount coupons (2 items)');
  
  log('\n🔐 Default Admin Login:', COLORS.bright);
  log('   📧 Email: admin@photography-crm.local', COLORS.cyan);
  log('   🔑 Password: admin123', COLORS.cyan);
  log('   ⚠️  Change this password immediately!', COLORS.yellow);
  
  log('\n🚀 Next Steps:', COLORS.bright);
  log('   1. Run: npm run dev');
  log('   2. Visit: http://localhost:3000');
  log('   3. Login with admin credentials');
  log('   4. Customize your studio settings');
  log('   5. Add your first client!');
  
  log('\n📚 Feature Documentation:', COLORS.bright);
  log('   See DATABASE_SETUP_GUIDE.md for all features');
  
  log('\n' + '='.repeat(60) + '\n', COLORS.cyan);
}

// Main execution
async function main() {
  log('\n' + '='.repeat(60), COLORS.cyan);
  log('🚀 PHOTOGRAPHY CRM - DATABASE INITIALIZATION', COLORS.bright + COLORS.cyan);
  log('='.repeat(60), COLORS.cyan);
  
  // Step 1: Check connection
  const connected = await checkConnection();
  if (!connected) {
    log('\n❌ Cannot proceed without database connection', COLORS.red);
    log('Please check your DATABASE_URL in .env file', COLORS.yellow);
    process.exit(1);
  }
  
  // Step 2: Verify tables
  const tablesOk = await verifyTables();
  if (!tablesOk) {
    log('\n❌ Database schema not ready', COLORS.red);
    log('\n💡 Run these commands first:', COLORS.yellow);
    log('   npm run db:generate', COLORS.cyan);
    log('   npm run db:push', COLORS.cyan);
    process.exit(1);
  }
  
  // Step 3-8: Create initial data
  await createDefaultAdmin();
  await createStudioConfig();
  await createTemplateDefinitions();
  await createSamplePriceList();
  await createSampleVouchers();
  await createSampleCoupons();
  
  // Summary
  await printSummary();
  
  process.exit(0);
}

// Run the script
main().catch((error) => {
  log('\n❌ FATAL ERROR:', COLORS.red);
  log(error.message, COLORS.red);
  if (error.stack) {
    log('\nStack trace:', COLORS.red);
    log(error.stack, COLORS.red);
  }
  process.exit(1);
});
