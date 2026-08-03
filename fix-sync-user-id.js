const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function fix() {
  // Get the actual user id
  const users = await sql`SELECT id FROM users LIMIT 1`;
  const correctUserId = users[0].id;
  console.log('Correct user ID:', correctUserId);
  
  // Update calendar sync settings
  const result = await sql`
    UPDATE calendar_sync_settings 
    SET user_id = ${correctUserId}
    WHERE user_id = '030acdf9-b799-44d8-ac9e-50da1bb506b0'
    RETURNING id, user_id
  `;
  
  console.log('Updated:', result);
}

fix().catch(e => console.error(e));
