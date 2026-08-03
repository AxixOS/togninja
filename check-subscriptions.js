require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkSubscriptions() {
  const subs = await sql`
    SELECT ss.id, ss.user_id, ss.tier, ss.status, u.email 
    FROM storage_subscriptions ss 
    JOIN users u ON u.id = ss.user_id 
    WHERE ss.status = 'active'
  `;
  
  console.log('Active subscriptions:', subs.length);
  subs.forEach(s => console.log(`  - ${s.email}: ${s.tier} (${s.status})`));
}

checkSubscriptions();
