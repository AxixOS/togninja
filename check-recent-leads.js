import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { desc } from 'drizzle-orm';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

const db = drizzle(pool);

async function checkRecentLeads() {
  try {
    console.log('📊 Checking recent leads in database...\n');
    
    // Import schema
    const { crmLeads } = await import('./shared/schema.js');
    
    // Get last 5 leads
    const leads = await db
      .select()
      .from(crmLeads)
      .orderBy(desc(crmLeads.createdAt))
      .limit(5);
    
    console.log(`Found ${leads.length} recent leads:\n`);
    
    leads.forEach((lead, i) => {
      console.log(`${i + 1}. Lead #${lead.id}`);
      console.log(`   Name: ${lead.name}`);
      console.log(`   Email: ${lead.email}`);
      console.log(`   Source: ${lead.source}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Created: ${lead.createdAt}`);
      console.log('');
    });
    
    // Check total count
    const allLeads = await db.select().from(crmLeads);
    console.log(`Total leads in database: ${allLeads.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkRecentLeads();
