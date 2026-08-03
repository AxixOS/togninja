#!/usr/bin/env node
/**
 * Enhanced Questionnaire Database Setup
 * This script sets up the improved questionnaire system with proper token management
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function setupEnhancedQuestionnaires() {
  console.log('🔨 Setting up enhanced questionnaire system...');
  
  try {
    // Enable UUID extension
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    console.log('✅ UUID extension enabled');

    // Create questionnaires table
    await sql`
      CREATE TABLE IF NOT EXISTS questionnaires (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        title text NOT NULL,
        fields jsonb NOT NULL,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      )
    `;
    console.log('✅ questionnaires table created');

    // Create questionnaire_links table
    await sql`
      CREATE TABLE IF NOT EXISTS questionnaire_links (
        token text PRIMARY KEY,
        questionnaire_id uuid NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
        client_id text REFERENCES crm_clients(id) ON DELETE SET NULL,
        expires_at timestamptz,
        is_used boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      )
    `;
    console.log('✅ questionnaire_links table created');

    // Create questionnaire_responses table
    await sql`
      CREATE TABLE IF NOT EXISTS questionnaire_responses (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        questionnaire_id uuid NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
        client_id text REFERENCES crm_clients(id) ON DELETE SET NULL,
        token text REFERENCES questionnaire_links(token) ON DELETE SET NULL,
        answers jsonb NOT NULL,
        submitted_at timestamptz DEFAULT now()
      )
    `;
    console.log('✅ questionnaire_responses table created');

    // Ensure optional metadata columns exist for better admin visibility
    await sql`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS client_name text`;
    await sql`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS client_email text`;
    console.log('✅ Ensured client_name and client_email columns exist on questionnaire_responses');

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_qr_client_id ON questionnaire_responses(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_qr_questionnaire_id ON questionnaire_responses(questionnaire_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ql_client_id ON questionnaire_links(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ql_questionnaire_id ON questionnaire_links(questionnaire_id)`;
    console.log('✅ Indexes created');

    // Insert default questionnaire if none exists
    const existingQuestionnaires = await sql`SELECT COUNT(*) FROM questionnaires`;
    if (parseInt(existingQuestionnaires[0].count) === 0) {
      const defaultFields = [
        {
          key: "clientName",
          label: "Your Name",
          type: "text",
          required: true
        },
        {
          key: "clientEmail", 
          label: "Your Email",
          type: "email",
          required: true
        },
        {
          key: "session_type",
          label: "What type of photoshoot are you looking for?",
          type: "text",
          required: true
        },
        {
          key: "occasion",
          label: "What is the occasion for this photoshoot?",
          type: "textarea",
          required: true
        },
        {
          key: "inspiration",
          label: "Do you have any specific ideas or inspiration for the shoot?",
          type: "textarea",
          required: false
        },
        {
          key: "location_preference",
          label: "Preferred location type?",
          type: "text",
          required: true
        },
        {
          key: "comfort_level",
          label: "How comfortable are you in front of the camera? (1-5)",
          type: "text",
          required: true
        }
      ];

      await sql`
        INSERT INTO questionnaires (id, title, fields)
        VALUES (
          'default-questionnaire'::uuid,
          'Client Pre-Shoot Questionnaire',
          ${JSON.stringify(defaultFields)}
        )
      `;
      console.log('✅ Default questionnaire created');
    }

    console.log('🎉 Enhanced questionnaire system setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up enhanced questionnaire system:', error);
    throw error;
  }
}

if (require.main === module) {
  setupEnhancedQuestionnaires().catch(console.error);
}

module.exports = { setupEnhancedQuestionnaires };