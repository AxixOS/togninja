// Make Backblaze B2 bucket publicly accessible
require('dotenv').config();
const { S3Client, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: true,
});

const bucketName = process.env.AWS_S3_BUCKET || 'TogNinja';

// Bucket policy for public read access
const bucketPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'PublicReadGetObject',
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${bucketName}/*`
    }
  ]
};

async function makePublic() {
  try {
    console.log(`📤 Making bucket "${bucketName}" publicly accessible...`);
    
    const command = new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy)
    });
    
    await s3Client.send(command);
    
    console.log(`✅ Bucket "${bucketName}" is now publicly accessible!`);
    console.log(`🌐 Images will be accessible at:`);
    console.log(`   https://f003.backblazeb2.com/file/${bucketName}/vouchers/FILENAME`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: Set bucket to "Public" in Backblaze B2 web console:');
    console.log('   1. Go to https://secure.backblaze.com/b2_buckets.htm');
    console.log(`   2. Find bucket "${bucketName}"`);
    console.log('   3. Click "Bucket Settings"');
    console.log('   4. Change "Files in Bucket" to "Public"');
    console.log('   5. Save changes');
  }
}

makePublic();
