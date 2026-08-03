const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function getImageMappings() {
  try {
    console.log('🔍 Finding UUID mappings for your uploaded images...\n');
    
    // List of images from the admin panel
    const targetImages = [
      'JAGSCHTITZ A2 L',
      '00003872',
      '458A4322',
      '458A1716',
      'Black Family 20x8 L',
      '458A0361',
      'E7012707',
      'E7014011'
    ];
    
    // Get all files to match
    const files = await sql`
      SELECT 
        id,
        file_name,
        file_type,
        uploaded_at
      FROM digital_files
      ORDER BY uploaded_at DESC
    `;
    
    console.log(`Total files in database: ${files.length}\n`);
    console.log('='.repeat(80));
    console.log('\nMATCHING YOUR UPLOADED IMAGES:\n');
    
    const mappings = [];
    
    targetImages.forEach(targetName => {
      const matched = files.find(f => {
        const baseName = f.file_name.replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, '');
        return baseName === targetName || f.file_name === targetName;
      });
      
      if (matched) {
        const ext = matched.file_name.match(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i);
        const fileExt = ext ? ext[0] : '.jpg';
        const actualFilename = `${matched.id}${fileExt}`;
        const url = `/api/files/serve/${actualFilename}`;
        
        mappings.push({
          original: matched.file_name,
          id: matched.id,
          actualFile: actualFilename,
          url: url
        });
        
        console.log(`✅ "${matched.file_name}"`);
        console.log(`   ID: ${matched.id}`);
        console.log(`   File on disk: ${actualFilename}`);
        console.log(`   URL: ${url}`);
        console.log('');
      } else {
        console.log(`❌ "${targetName}" - NOT FOUND in database`);
        console.log('');
      }
    });
    
    console.log('='.repeat(80));
    console.log('\n📋 SUMMARY FOR COPY/PASTE:\n');
    
    mappings.forEach(m => {
      console.log(`"${m.original}" → ${m.url}`);
    });
    
    return mappings;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

getImageMappings();
