import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function listAllTables() {
  try {
    const tables = await sql`
      SELECT 
        table_name,
        (SELECT COUNT(*) 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('\n📊 ALL TABLES IN DATABASE:\n');
    console.log('Table Name'.padEnd(40) + 'Columns');
    console.log('─'.repeat(60));
    
    tables.forEach((table: any) => {
      console.log(table.table_name.padEnd(40) + table.column_count);
    });
    
    console.log('\n' + '─'.repeat(60));
    console.log(`Total: ${tables.length} tables\n`);
    
    // Group by category
    const categories: any = {
      'Core CRM': [],
      'Agent V2': [],
      'Price Wizard': [],
      'Workflow Wizard': [],
      'Calendar': [],
      'Gallery': [],
      'Email': [],
      'Questionnaires': [],
      'Other': []
    };
    
    tables.forEach((table: any) => {
      const name = table.table_name;
      if (name.startsWith('agent_')) categories['Agent V2'].push(name);
      else if (name.includes('competitor') || name.includes('price_wizard')) categories['Price Wizard'].push(name);
      else if (name.startsWith('workflow_')) categories['Workflow Wizard'].push(name);
      else if (name.includes('calendar') || name.includes('event')) categories['Calendar'].push(name);
      else if (name.includes('gallery') || name.includes('image')) categories['Gallery'].push(name);
      else if (name.includes('email')) categories['Email'].push(name);
      else if (name.includes('questionnaire')) categories['Questionnaires'].push(name);
      else if (['users', 'clients', 'crm_clients', 'invoices', 'bookings', 'sessions', 'packages', 'products', 'vouchers'].some(term => name.includes(term))) {
        categories['Core CRM'].push(name);
      } else {
        categories['Other'].push(name);
      }
    });
    
    console.log('\n📦 TABLES BY CATEGORY:\n');
    Object.entries(categories).forEach(([category, tableNames]: [string, any]) => {
      if (tableNames.length > 0) {
        console.log(`\n${category} (${tableNames.length}):`);
        tableNames.forEach((name: string) => console.log(`  • ${name}`));
      }
    });
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

listAllTables();
