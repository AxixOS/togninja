require('dotenv').config();
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  endpoint: process.env.AWS_S3_ENDPOINT,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
});

async function listAllB2Files() {
  try {
    console.log('🔍 Connecting to Backblaze B2...');
    console.log('Bucket:', process.env.AWS_S3_BUCKET);
    console.log('Endpoint:', process.env.AWS_S3_ENDPOINT);
    console.log('Region:', process.env.AWS_REGION);
    console.log('');
    
    let allFiles = [];
    let continuationToken = null;
    
    do {
      const command = new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_BUCKET,
        ContinuationToken: continuationToken
      });
      
      const response = await s3Client.send(command);
      
      if (response.Contents && response.Contents.length > 0) {
        allFiles = allFiles.concat(response.Contents);
        console.log(`📦 Retrieved ${response.Contents.length} files (total so far: ${allFiles.length})`);
      }
      
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    
    console.log('\n✅ Total files in Backblaze B2:', allFiles.length);
    console.log('\n📊 Storage breakdown:');
    
    const totalBytes = allFiles.reduce((sum, file) => sum + (file.Size || 0), 0);
    const totalGB = (totalBytes / 1024 / 1024 / 1024).toFixed(2);
    
    console.log(`  Total size: ${totalGB} GB (${totalBytes} bytes)`);
    console.log(`  Average file size: ${(totalBytes / allFiles.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Group by prefix/folder
    const folders = {};
    allFiles.forEach(file => {
      const parts = file.Key.split('/');
      const folder = parts.length > 1 ? parts[0] : 'root';
      if (!folders[folder]) folders[folder] = { count: 0, size: 0 };
      folders[folder].count++;
      folders[folder].size += file.Size || 0;
    });
    
    console.log('\n📁 Files by folder:');
    Object.entries(folders).forEach(([folder, stats]) => {
      console.log(`  ${folder}: ${stats.count} files (${(stats.size/1024/1024/1024).toFixed(2)} GB)`);
    });
    
    // Show recent files
    const sortedByDate = allFiles.sort((a, b) => 
      new Date(b.LastModified) - new Date(a.LastModified)
    );
    
    console.log('\n📅 Most recent 10 files:');
    sortedByDate.slice(0, 10).forEach((file, i) => {
      const sizeMB = (file.Size / 1024 / 1024).toFixed(2);
      console.log(`${i+1}. ${file.Key} (${sizeMB} MB) - ${file.LastModified}`);
    });
    
    // Save full list to JSON
    const fs = require('fs');
    fs.writeFileSync('backblaze-files-inventory.json', JSON.stringify(allFiles, null, 2));
    console.log('\n💾 Full file list saved to: backblaze-files-inventory.json');
    
    console.log('\n🎯 NEXT STEP: Restore database records for these files');
    
  } catch (error) {
    console.error('❌ Error connecting to Backblaze B2:', error.message);
    if (error.Code) console.error('Error code:', error.Code);
  }
  process.exit(0);
}

listAllB2Files();
