require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkStorageUsage() {
  try {
    const data = await sql`
      SELECT 
        ss.tier, 
        su.current_storage_bytes, 
        su.file_count, 
        ss.storage_limit 
      FROM storage_subscriptions ss 
      LEFT JOIN storage_usage su ON su.subscription_id = ss.id 
      WHERE ss.status = 'active'
    `;
    
    console.log('📊 Current Storage Usage:\n');
    
    if (data.length === 0) {
      console.log('No active subscriptions found.');
      return;
    }
    
    data.forEach(d => {
      const usedBytes = Number(d.current_storage_bytes) || 0;
      const limitBytes = Number(d.storage_limit);
      const usedGB = (usedBytes / (1024*1024*1024)).toFixed(3);
      const limitGB = (limitBytes / (1024*1024*1024)).toFixed(1);
      const percent = ((usedBytes / limitBytes) * 100).toFixed(2);
      
      console.log(`Tier: ${d.tier.toUpperCase()}`);
      console.log(`Used: ${usedGB}GB / ${limitGB}GB (${percent}%)`);
      console.log(`Files: ${d.file_count || 0}`);
      console.log(`Storage Limit: ${limitBytes.toLocaleString()} bytes`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStorageUsage();
