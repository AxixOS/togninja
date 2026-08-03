/**
 * Migration script to add location columns (latitude, longitude, timezone) to studio_configs
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  try {
    console.log('🔄 Starting location columns migration...');

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const connection = neon(process.env.DATABASE_URL);
    const db = drizzle(connection);

    console.log('📊 Connected to database');

    // Add latitude column
    console.log('🔧 Adding latitude column to studio_configs...');
    try {
      await db.execute(sql`
        ALTER TABLE studio_configs 
        ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
      `);
      console.log('✅ Added latitude column');
    } catch (error: any) {
      console.log('⚠️ latitude column may already exist:', error.message);
    }

    // Add longitude column
    console.log('🔧 Adding longitude column to studio_configs...');
    try {
      await db.execute(sql`
        ALTER TABLE studio_configs 
        ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
      `);
      console.log('✅ Added longitude column');
    } catch (error: any) {
      console.log('⚠️ longitude column may already exist:', error.message);
    }

    // Add timezone column with default
    console.log('🔧 Adding timezone column to studio_configs...');
    try {
      await db.execute(sql`
        ALTER TABLE studio_configs 
        ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Vienna';
      `);
      console.log('✅ Added timezone column');
    } catch (error: any) {
      console.log('⚠️ timezone column may already exist:', error.message);
    }

    // Set default Vienna coordinates for existing studios without location
    console.log('🔧 Setting default Vienna coordinates for existing studios...');
    try {
      await db.execute(sql`
        UPDATE studio_configs 
        SET latitude = 48.2082, longitude = 16.3738 
        WHERE latitude IS NULL AND longitude IS NULL;
      `);
      console.log('✅ Set default coordinates for existing studios');
    } catch (error: any) {
      console.log('⚠️ Could not set defaults:', error.message);
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();
