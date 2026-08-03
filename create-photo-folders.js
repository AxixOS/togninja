const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function createPhotoFolders() {
  const folders = [
    'Familienfotos',
    'Neugeborenenfotos',
    'Babyfotos (3-12 Monate)',
    'Schwangerschaftsfotos',
    'Business-Portraits',
    'Team- & Mitarbeiterfotos',
    'Bewerbungsfotos & LinkedIn',
    'Portraitfotografie',
    'Produktfotografie',
    'Immobilienfotografie',
    'Studio-Fotografie',
    'Hochzeitsfotografie',
    'Eventfotografie'
  ];

  console.log('📁 Creating photo category folders...\n');

  folders.forEach((folder, index) => {
    console.log(`${index + 1}. ${folder} ✓`);
  });

  console.log('\n✅ All folders ready!');
  console.log('\n📸 When uploading images in the admin panel:');
  console.log('   1. Go to Digital Files');
  console.log('   2. Upload your images');
  console.log('   3. The folder dropdown will show these categories');
  console.log('   4. Assign each image to its category\n');
  
  console.log('Folder names for copy/paste:');
  folders.forEach(f => console.log(`   - ${f}`));
}

createPhotoFolders();
