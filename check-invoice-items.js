require('dotenv').config();
const neon = require('@neondatabase/serverless');
const { neonConfig } = neon;
neonConfig.fetchConnectionCache = true;
const sql = neon.neon(process.env.DATABASE_URL);

(async () => {
  try {
    // Test invoice update with a sample ID
    const testId = '8cadb2f2-055a-4306-98c6-ff10b75b0b6d'; // From the URL in screenshot
    
    // Try to update
    console.log('Testing update for invoice:', testId);
    
    const result = await sql`
      UPDATE crm_invoices 
      SET 
        notes = ${'Test update'},
        updated_at = NOW()
      WHERE id = ${testId}::uuid
      RETURNING id, notes
    `;
    
    console.log('Update result:', JSON.stringify(result, null, 2));
    
  } catch (e) {
    console.log('Error:', e.message);
    console.log('Full error:', e);
  }
})();
