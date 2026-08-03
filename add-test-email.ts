#!/usr/bin/env tsx
/**
 * Quick fix: Add a test received email so inbox shows something
 */

import { pool } from './server/db';

async function addTestEmail() {
  try {
    console.log('📧 Adding test received email to inbox...\n');
    
    const result = await pool.query(`
      INSERT INTO crm_messages (
        sender_name,
        sender_email,
        subject,
        content,
        message_type,
        status,
        direction,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      ) RETURNING id, subject
    `, [
      'John Doe',
      'john.doe@example.com',
      'Test Booking Request',
      'Hello, I would like to book a family photoshoot for next weekend. Please let me know your availability.',
      'email',
      'unread',
      'received'
    ]);
    
    console.log('✅ Test email added successfully!');
    console.log('   ID:', result.rows[0].id);
    console.log('   Subject:', result.rows[0].subject);
    console.log('\n🎉 Your inbox should now show this message');
    console.log('   Refresh the admin inbox page to see it');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add test email:', error);
    process.exit(1);
  }
}

addTestEmail();
