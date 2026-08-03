#!/usr/bin/env tsx
/**
 * Quick inbox smoke test - check crm_messages table
 */

import { pool } from './server/db';

async function testInbox() {
  try {
    console.log('🔍 Testing inbox database connection...\n');
    
    // Test 1: Check if crm_messages table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'crm_messages'
      ) as table_exists
    `);
    
    console.log('✓ crm_messages table exists:', tableCheck.rows[0].table_exists);
    
    if (!tableCheck.rows[0].table_exists) {
      console.log('❌ Table does not exist - need to run migrations');
      process.exit(1);
    }
    
    // Test 2: Count total messages
    const countResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE message_type = 'email') as emails,
        COUNT(*) FILTER (WHERE message_type = 'sms') as sms,
        COUNT(*) FILTER (WHERE status = 'unread') as unread
      FROM crm_messages
    `);
    
    const stats = countResult.rows[0];
    console.log('\n📊 Message Statistics:');
    console.log('   Total messages:', stats.total);
    console.log('   Emails:', stats.emails || 0);
    console.log('   SMS:', stats.sms || 0);
    console.log('   Unread:', stats.unread);
    
    // Test 3: Show recent messages
    const recentResult = await pool.query(`
      SELECT 
        id,
        sender_name,
        sender_email,
        subject,
        message_type,
        status,
        created_at
      FROM crm_messages
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📧 Recent Messages (last 10):');
    if (recentResult.rows.length === 0) {
      console.log('   ⚠️  No messages found in database');
      console.log('\n💡 This is why your inbox is empty!');
      console.log('\nTo populate inbox:');
      console.log('1. Configure email settings in Admin → Settings → Email');
      console.log('2. Click "Import Emails" or wait for automatic sync');
      console.log('3. Or manually trigger: POST /api/communications/email/import');
    } else {
      recentResult.rows.forEach((msg, i) => {
        console.log(`\n   ${i + 1}. ${msg.subject || '(no subject)'}`);
        console.log(`      From: ${msg.sender_name || msg.sender_email || 'Unknown'}`);
        console.log(`      Type: ${msg.message_type || 'email'} | Status: ${msg.status || 'unread'}`);
        console.log(`      Date: ${msg.created_at}`);
      });
    }
    
    // Test 4: Check table schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'crm_messages'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table Schema:');
    schemaResult.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : ''}`);
    });
    
    console.log('\n✅ Inbox test complete');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testInbox();
