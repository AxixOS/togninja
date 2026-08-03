const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function setupQuestionnaireSchema() {
  try {
    console.log('🔨 Setting up questionnaire schema...');

    // Create questionnaire_links table
    await sql`
      CREATE TABLE IF NOT EXISTS questionnaire_links (
        token TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        template_id TEXT,
        is_used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ questionnaire_links table created');

    // Create questionnaire_responses table
    await sql`
      CREATE TABLE IF NOT EXISTS questionnaire_responses (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        client_id TEXT NOT NULL,
        token TEXT NOT NULL,
        template_slug TEXT,
        answers JSONB NOT NULL,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ questionnaire_responses table created');

    // Create surveys table for questionnaire templates
    await sql`
      CREATE TABLE IF NOT EXISTS surveys (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'draft',
        pages JSONB DEFAULT '[]',
        settings JSONB DEFAULT '{}',
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ surveys table created');

    // Insert default questionnaire template if none exists
    const existingSurveys = await sql`SELECT COUNT(*) FROM surveys`;
    if (parseInt(existingSurveys[0].count) === 0) {
      const defaultPages = JSON.stringify([
        {
          id: 'page_1',
          title: 'Photography Session Information',
          questions: [
            {
              id: 'session_type',
              type: 'single_choice',
              title: 'What type of photography session are you interested in?',
              required: true,
              options: [
                { id: 'family', text: 'Family Portrait' },
                { id: 'wedding', text: 'Wedding Photography' },
                { id: 'business', text: 'Business/Corporate' },
                { id: 'event', text: 'Event Photography' },
                { id: 'maternity', text: 'Maternity/Newborn' },
                { id: 'other', text: 'Other' }
              ]
            },
            {
              id: 'preferred_date',
              type: 'text',
              title: 'What is your preferred date for the session?',
              required: true
            },
            {
              id: 'location_preference',
              type: 'single_choice',
              title: 'Where would you prefer the session to take place?',
              required: true,
              options: [
                { id: 'studio', text: 'Studio' },
                { id: 'outdoor', text: 'Outdoor Location' },
                { id: 'client_location', text: 'My Location/Home' },
                { id: 'flexible', text: 'Flexible/Open to Suggestions' }
              ]
            },
            {
              id: 'group_size',
              type: 'text',
              title: 'How many people will be in the photos?',
              required: true
            },
            {
              id: 'special_requests',
              type: 'long_text',
              title: 'Do you have any special requests or specific shots you want to capture?',
              required: false
            },
            {
              id: 'budget_range',
              type: 'single_choice',
              title: 'What is your approximate budget range?',
              required: false,
              options: [
                { id: 'under_500', text: 'Under €500' },
                { id: '500_1000', text: '€500 - €1000' },
                { id: '1000_2000', text: '€1000 - €2000' },
                { id: 'over_2000', text: 'Over €2000' },
                { id: 'discuss', text: 'Prefer to discuss' }
              ]
            },
            {
              id: 'how_found_us',
              type: 'single_choice',
              title: 'How did you hear about us?',
              required: false,
              options: [
                { id: 'google', text: 'Google Search' },
                { id: 'social_media', text: 'Social Media' },
                { id: 'referral', text: 'Friend/Family Referral' },
                { id: 'website', text: 'Website' },
                { id: 'other', text: 'Other' }
              ]
            },
            {
              id: 'additional_comments',
              type: 'long_text',
              title: 'Any additional comments or questions?',
              required: false
            }
          ]
        }
      ]);

      const defaultSettings = JSON.stringify({
        allowAnonymous: true,
        progressBar: true,
        thankYouMessage: 'Thank you for completing our questionnaire! We will be in touch soon.'
      });

      await sql`
        INSERT INTO surveys (id, title, description, status, pages, settings)
        VALUES (
          'default-questionnaire',
          'Client Questionnaire',
          'Standard client intake questionnaire for photography sessions',
          'active',
          ${defaultPages},
          ${defaultSettings}
        )
      `;
      console.log('✅ Default questionnaire template created');
    }

    console.log('🎉 Questionnaire schema setup complete!');

  } catch (error) {
    console.error('❌ Error setting up questionnaire schema:', error);
    throw error;
  }
}

// Run the setup
setupQuestionnaireSchema().catch(console.error);
