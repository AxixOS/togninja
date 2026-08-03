// PASTE THIS INTO YOUR BROWSER CONSOLE on the /my-archive page
// It will show you all uploaded images with their correct URLs

async function getImageURLs() {
  try {
    const response = await fetch('/api/files');
    const files = await response.json();
    
    console.log('📸 YOUR UPLOADED IMAGES:\n');
    console.log('='.repeat(80));
    
    files.forEach((file, index) => {
      if (file.thumbnailUrl) {
        console.log(`\n${index + 1}. "${file.fileName}"`);
        console.log(`   URL: ${file.thumbnailUrl.replace('_thumb.webp', file.fileName.match(/\.\w+$/)[0])}`);
        console.log(`   Thumbnail: ${file.thumbnailUrl}`);
        console.log(`   Size: ${(file.fileSize / 1024 / 1024).toFixed(2)} MB`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 COPY THESE URLS TO USE IN YOUR PAGES:\n');
    
    files.forEach(file => {
      if (file.thumbnailUrl && file.fileName.match(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i)) {
        const actualUrl = file.thumbnailUrl.replace('_thumb.webp', '.' + file.fileName.split('.').pop());
        console.log(`"${file.fileName}" → "${actualUrl}"`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

getImageURLs();
