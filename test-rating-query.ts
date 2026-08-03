import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function test() {
  const result = await sql`SELECT id, gallery_id, filename, rating FROM gallery_images LIMIT 3`;
  console.log('Sample images:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
