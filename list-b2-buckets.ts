import 'dotenv/config';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

async function listB2Buckets() {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-central-003',
    endpoint: process.env.AWS_S3_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  const command = new ListBucketsCommand({});
  const response = await s3Client.send(command);
  
  console.log('📦 Your Backblaze B2 Buckets:');
  console.log('═══════════════════════════════════════');
  
  if (response.Buckets && response.Buckets.length > 0) {
    response.Buckets.forEach((bucket, index) => {
      console.log(`${index + 1}. ${bucket.Name}`);
    });
  } else {
    console.log('No buckets found.');
  }
  
  console.log('═══════════════════════════════════════\n');
  console.log('💡 Copy the exact bucket name and update AWS_S3_BUCKET in your .env file');
}

listB2Buckets().catch(console.error);
