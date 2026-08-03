// Database Schema Setup Script
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function setupDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check existing tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📋 Existing tables:', tables.map(t => t.table_name));
    
    // Create missing tables
    console.log('🔨 Creating missing tables...');
    
    // CRM Clients table
    await sql`
      CREATE TABLE IF NOT EXISTS crm_clients (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip VARCHAR(20),
        country VARCHAR(100),
        total_sales DECIMAL(10,2) DEFAULT 0,
        outstanding_balance DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ CRM Clients table ready');
    
    // Leads table
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        message TEXT,
        source VARCHAR(100),
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Leads table ready');
    
    // Invoices table
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT,
        invoice_number VARCHAR(50) UNIQUE,
        status VARCHAR(50) DEFAULT 'draft',
        due_date DATE,
        subtotal DECIMAL(10,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (client_id) REFERENCES crm_clients(id)
      )
    `;
    console.log('✅ Invoices table ready');
    
    // Digital Files table
    await sql`
      CREATE TABLE IF NOT EXISTS digital_files (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        folder_name TEXT,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        client_id TEXT,
        session_id TEXT,
        description TEXT,
        tags TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        file_path TEXT,
        original_filename TEXT,
        mime_type TEXT,
        category TEXT,
        uploaded_by TEXT,
        location TEXT
      )
    `;
    console.log('✅ Digital Files table ready');
    
    // CRM Messages table for email functionality
    await sql`
      CREATE TABLE IF NOT EXISTS crm_messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT,
        type VARCHAR(50) DEFAULT 'email',
        content TEXT,
        subject VARCHAR(500),
        recipient VARCHAR(255),
        sender_name VARCHAR(255),
        sender_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'unread',
        message_type VARCHAR(50),
        client_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ CRM Messages table ready');
    
    // Galleries table
    await sql`
      CREATE TABLE IF NOT EXISTS galleries (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        slug VARCHAR(255) UNIQUE,
        cover_image TEXT,
        password_hash TEXT,
        download_enabled BOOLEAN DEFAULT TRUE,
        is_public BOOLEAN DEFAULT FALSE,
        client_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Galleries table ready');
    
    // Gallery Images table
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        gallery_id TEXT,
        filename VARCHAR(255),
        original_url TEXT,
        display_url TEXT,
        thumb_url TEXT,
        size_bytes BIGINT DEFAULT 0,
        content_type VARCHAR(100),
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
      )
    `;
    console.log('✅ Gallery Images table ready');
    
    // Questionnaire Responses table
    await sql`
      CREATE TABLE IF NOT EXISTS questionnaire_responses (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT,
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        questionnaire_token TEXT,
        questionnaire_title VARCHAR(255) DEFAULT 'Photography Preferences Survey',
        responses JSONB,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        sent_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT 'sent',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (client_id) REFERENCES crm_clients(id) ON DELETE CASCADE
      )
    `;
    console.log('✅ Questionnaire Responses table ready');
    
    // Insert some sample data if tables are empty
    const clientCount = await sql`SELECT COUNT(*) FROM crm_clients`;
    if (parseInt(clientCount[0].count) === 0) {
      await sql`
        INSERT INTO crm_clients (first_name, last_name, email, phone, client_id)
        VALUES 
        ('John', 'Smith', 'john.smith@example.com', '+1234567890', 'CLT001'),
        ('Sarah', 'Johnson', 'sarah.johnson@example.com', '+1234567891', 'CLT002')
      `;
      console.log('✅ Sample clients added');
    }
    
    const leadCount = await sql`SELECT COUNT(*) FROM leads`;
    if (parseInt(leadCount[0].count) === 0) {
      await sql`
        INSERT INTO leads (first_name, last_name, email, phone, message, source, status)
        VALUES 
        ('Mike', 'Wilson', 'mike.wilson@example.com', '+1234567892', 'Interested in wedding photography', 'website', 'new'),
        ('Emma', 'Davis', 'emma.davis@example.com', '+1234567893', 'Need family portrait session', 'referral', 'contacted')
      `;
      console.log('✅ Sample leads added');
    }
    
    console.log('🎉 Database schema setup complete!');
    
    // Final table check
    const finalTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📋 Final tables:', finalTables.map(t => t.table_name));
    
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    throw error;
  }
}

setupDatabaseSchema()
  .then(() => {
    console.log('✅ Database setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  });
