const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function check() {
  const clients = await sql`SELECT id, first_name, last_name, email FROM crm_clients LIMIT 10`;
  console.log('Clients in database:', clients.length);
  clients.forEach(c => {
    console.log(`  - ${c.first_name} ${c.last_name} (${c.email})`);
  });
}

check().catch(e => console.error(e));
