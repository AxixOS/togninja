import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function checkSchema() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log('=== price_lists table schema ===');
  const priceListsSchema = await sql`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'price_lists' 
    ORDER BY ordinal_position
  `;
  console.log(priceListsSchema);
  
  console.log('\n=== price_list_suggestions table schema ===');
  const suggestionsSchema = await sql`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'price_list_suggestions' 
    ORDER BY ordinal_position
  `;
  console.log(suggestionsSchema);
  
  console.log('\n=== Sample suggestions ===');
  const suggestions = await sql`
    SELECT id, service_type, tier, status, suggested_price 
    FROM price_list_suggestions 
    LIMIT 3
  `;
  console.log(suggestions);
}

checkSchema().catch(console.error);
