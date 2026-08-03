import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkImageColumns() {
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'gallery_images'
    ORDER BY ordinal_position
  `;
  
  console.log('Gallery images columns:');
  columns.forEach(col => {
    console.log(`  ${col.column_name}: ${col.data_type}`);
  });
}

checkImageColumns().catch(console.error);
