require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'questionnaire_links' ORDER BY ordinal_position`;
    console.log('questionnaire_links columns:');
    console.log(JSON.stringify(cols, null, 2));

    const cols2 = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'questionnaire_responses' ORDER BY ordinal_position`;
    console.log('questionnaire_responses columns:');
    console.log(JSON.stringify(cols2, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();