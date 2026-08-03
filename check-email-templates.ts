import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function checkEmailTemplates() {
  try {
    // Check if table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%email%template%'
    `;
    
    console.log('📧 Email template tables:', tables.map(t => t.table_name));
    
    if (tables.length > 0) {
      // Get columns
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'email_templates'
        ORDER BY ordinal_position
      `;
      
      console.log('\n📋 Columns in email_templates:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEmailTemplates();
