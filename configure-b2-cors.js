const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
  endpoint: process.env.AWS_S3_ENDPOINT,
  region: 'eu-central-003',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const bucketName = process.env.AWS_S3_BUCKET;

async function configureCORS() {
  try {
    console.log('Setting CORS configuration for bucket:', bucketName);
    
    const corsRules = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedOrigins: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3000
        }
      ]
    };

    await s3Client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsRules
    }));

    console.log('✅ CORS configuration set successfully!');
    
    // Verify
    const getCors = await s3Client.send(new GetBucketCorsCommand({
      Bucket: bucketName
    }));
    
    console.log('\n📋 Current CORS configuration:');
    console.log(JSON.stringify(getCors.CORSRules, null, 2));
    
  } catch (error) {
    console.error('❌ Error setting CORS:', error.message);
    if (error.Code === 'CORSNotEnabled') {
      console.log('\n⚠️ CORS might not be supported by this endpoint.');
      console.log('Alternative: Set bucket to "Public" and use b2_download_url instead.');
    }
  }
}

configureCORS();
