// Gallery database schema setup script
// Creates all necessary tables and sample data for the gallery functionality

require('dotenv').config();

async function setupGallerySchema() {
  let sql;
  
  try {
    // Initialize Neon connection
    const { neon } = require('@neondatabase/serverless');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not found in environment variables');
      process.exit(1);
    }
    
    sql = neon(process.env.DATABASE_URL);
    console.log('✅ Connected to Neon database');
    
    // Read the SQL schema file
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '_data', 'gallery_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Gallery schema file not found:', schemaPath);
      process.exit(1);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Loaded gallery schema SQL');
    
    // Execute the schema creation
    console.log('🏗️ Creating gallery tables and sample data...');
    
    // Split the SQL into individual statements and execute them
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        if (statement.includes('SELECT') && statement.includes('status')) {
          // This is the final status message - execute it separately
          const result = await sql(statement);
          console.log('🎉', result[0]?.status || 'Schema setup complete');
          console.log('📊 Total galleries:', result[0]?.total_galleries || 'Unknown');
        } else {
          await sql(statement);
          successCount++;
        }
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.warn('⚠️ SQL warning:', error.message.substring(0, 100));
          errorCount++;
        }
      }
    }
    
    console.log(`✅ Gallery schema setup completed: ${successCount} statements executed, ${errorCount} warnings`);
    
    // Verify the tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%gallery%'
      ORDER BY table_name
    `;
    
    console.log('📋 Gallery tables created:');
    tables.forEach(table => {
      console.log(`   • ${table.table_name}`);
    });
    
    // Get gallery count
    const galleryCount = await sql`SELECT COUNT(*) as count FROM galleries`;
    console.log(`🎨 Sample galleries created: ${galleryCount[0]?.count || 0}`);
    
    // Get image count
    const imageCount = await sql`SELECT COUNT(*) as count FROM gallery_images`;
    console.log(`🖼️ Sample images created: ${imageCount[0]?.count || 0}`);
    
    console.log('\n🚀 Gallery system is ready to use!');
    console.log('   • Visit /galleries to see the gallery overview');
    console.log('   • Visit /gallery/wedding-photos to test password protection (password: wedding2024)');
    console.log('   • Visit /gallery/family-portraits to test public access');
    
  } catch (error) {
    console.error('❌ Error setting up gallery schema:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupGallerySchema();