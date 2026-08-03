import 'dotenv/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testImageUpload() {
  console.log('📸 Testing Image Upload to Backblaze B2...\n');

  const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    endpoint: process.env.AWS_S3_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  // Create a simple test image buffer (1x1 red pixel PNG)
  const testImageBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  const testKey = `test-gallery/test-upload-${Date.now()}.png`;

  try {
    console.log(`📤 Uploading to: ${process.env.AWS_S3_BUCKET}/${testKey}`);
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: testKey,
      Body: testImageBuffer,
      ContentType: 'image/png',
      Metadata: {
        'uploaded-by': 'test-script',
        'test': 'true'
      }
    });

    await s3Client.send(command);

    console.log('✅ Upload successful!');
    console.log('📦 File location:', testKey);
    console.log('\n🔗 To view in Backblaze:');
    console.log('   1. Go to: https://secure.backblaze.com/b2_buckets.htm');
    console.log(`   2. Click on bucket: ${process.env.AWS_S3_BUCKET}`);
    console.log('   3. Navigate to: test-gallery/');
    console.log('   4. Find your test image!');
    console.log('\n✅ Your CRM is ready to upload gallery images! 🎉');
    
  } catch (error: any) {
    console.error('❌ Upload failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Check your B2 bucket name in .env');
    console.log('   - Verify application key has write permissions');
    console.log('   - Check bucket settings allow uploads');
  }
}

testImageUpload();
