import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log('📁 Setting up photo folders...\n');
  
  const sqlFile = fs.readFileSync(path.join(process.cwd(), 'create-photo-folders.sql'), 'utf-8');
  
  try {
    await sql(sqlFile);
    console.log('✅ Photo folders table created!');
    console.log('✅ Default folders inserted!\n');
    console.log('📸 Ready! Refresh your My Archive page to see the folders.\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
