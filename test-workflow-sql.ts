import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const sql = neon(process.env.DATABASE_URL!);

async function testSQL() {
  try {
    const sqlContent = readFileSync('./server/migrations/008-workflow-wizard-schema.sql', 'utf-8');
    
    // Split into statements and test each one
    const statements = sqlContent.split(';').filter(s => s.trim().length > 0);
    
    console.log(`📝 Testing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      try {
        // Just explain the statement to check syntax
        const firstWord = statement.split(/\s+/)[0].toUpperCase();
        console.log(`${i + 1}. ${firstWord}...`);
        
        if (firstWord === 'INSERT' || firstWord === 'CREATE') {
          await sql.unsafe(statement);
          console.log(`   ✅ OK`);
        }
      } catch (error: any) {
        console.log(`   ❌ ERROR at statement ${i + 1}:`);
        console.log(`   ${error.message}`);
        console.log(`   Statement preview: ${statement.substring(0, 100)}...`);
        break;
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testSQL();
