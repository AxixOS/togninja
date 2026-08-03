#!/usr/bin/env node
/**
 * Update questionnaire_links table structure
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function updateQuestionnaireLinks() {
  console.log('🔨 Updating questionnaire_links table structure...');
  
  try {
    // Drop template_id column if it exists
    await sql`ALTER TABLE questionnaire_links DROP COLUMN IF EXISTS template_id`;
    console.log('✅ Dropped template_id column');

    // Add questionnaire_id column if it doesn't exist
    await sql`ALTER TABLE questionnaire_links ADD COLUMN IF NOT EXISTS questionnaire_id uuid REFERENCES questionnaires(id) ON DELETE CASCADE`;
    console.log('✅ Added questionnaire_id column');

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_qr_client_id ON questionnaire_responses(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_qr_questionnaire_id ON questionnaire_responses(questionnaire_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ql_client_id ON questionnaire_links(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ql_questionnaire_id ON questionnaire_links(questionnaire_id)`;
    console.log('✅ Indexes created');

    console.log('🎉 questionnaire_links table structure updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating table structure:', error);
    throw error;
  }
}

if (require.main === module) {
  updateQuestionnaireLinks().catch(console.error);
}

module.exports = { updateQuestionnaireLinks };