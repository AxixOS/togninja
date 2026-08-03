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

async function createFolders() {
  console.log('📁 Creating photo category folders...\n');
  
  for (const folderName of folders) {
    try {
      const response = await fetch('http://localhost:3001/api/files/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: folderName })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${folderName}`);
      } else {
        console.log(`⚠️  ${folderName} - ${data.error || 'Failed'}`);
      }
    } catch (error) {
      console.error(`❌ ${folderName} - ${error.message}`);
    }
  }
  
  console.log('\n✅ All folders created!');
  console.log('\n📸 Next steps:');
  console.log('   1. Go to http://localhost:3001/my-archive');
  console.log('   2. You should see a "New Folder" button or folder dropdown');
  console.log('   3. Upload 5 images to each folder category');
  console.log('   4. The images will be organized by folder name\n');
}

createFolders();
