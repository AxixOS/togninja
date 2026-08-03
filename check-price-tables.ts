import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function check() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log('=== price_list_items schema ===');
  const schema = await sql`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'price_list_items' ORDER BY ordinal_position
  `;
  console.log(schema);

  console.log('\n=== Sample price_list_items data ===');
  const items = await sql`SELECT * FROM price_list_items LIMIT 3`;
  console.log(JSON.stringify(items, null, 2));
}

check().catch(console.error);
