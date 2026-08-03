import 'dotenv/config';
import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import Stripe from 'stripe';
import OpenAI from 'openai';
import nodemailer from 'nodemailer';

console.log('🔍 Testing API Service Integrations...\n');

// Test 1: Backblaze B2 Storage
async function testBackblazeB2() {
  console.log('1️⃣ Testing Backblaze B2 Storage...');
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-central-005',
      endpoint: process.env.AWS_S3_ENDPOINT || 'https://s3.eu-central-005.backblazeb2.com',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });

    // Test bucket access
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('   ✅ B2 Connected successfully!');
    console.log(`   📦 Buckets found: ${response.Buckets?.length || 0}`);
    
    // Try a test upload
    const testKey = `test-${Date.now()}.txt`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: testKey,
      Body: Buffer.from('Test upload from Photography CRM'),
      ContentType: 'text/plain',
    }));
    console.log(`   ✅ Test file uploaded: ${testKey}\n`);
    
    return true;
  } catch (error: any) {
    console.log('   ❌ B2 Error:', error.message);
    console.log('   💡 Check: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_S3_ENDPOINT\n');
    return false;
  }
}

// Test 2: Stripe Payments
async function testStripe() {
  console.log('2️⃣ Testing Stripe Payment Integration...');
  try {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('sk_test_your')) {
      console.log('   ⚠️  Stripe key not configured (using placeholder)\n');
      return false;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    // Test API access
    const account = await stripe.balance.retrieve();
    console.log('   ✅ Stripe Connected successfully!');
    console.log(`   💰 Account currency: ${account.available[0]?.currency || 'N/A'}\n`);
    
    return true;
  } catch (error: any) {
    console.log('   ❌ Stripe Error:', error.message);
    console.log('   💡 Get your key from: https://dashboard.stripe.com/apikeys\n');
    return false;
  }
}

// Test 3: OpenAI
async function testOpenAI() {
  console.log('3️⃣ Testing OpenAI Integration...');
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_openai')) {
      console.log('   ⚠️  OpenAI key not configured (using placeholder)\n');
      return false;
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test with a simple request
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "API test successful" if you can read this.' }],
      max_tokens: 20,
    });

    console.log('   ✅ OpenAI Connected successfully!');
    console.log(`   🤖 Response: ${response.choices[0]?.message?.content}\n`);
    
    return true;
  } catch (error: any) {
    console.log('   ❌ OpenAI Error:', error.message);
    console.log('   💡 Get your key from: https://platform.openai.com/api-keys\n');
    return false;
  }
}

// Test 4: SMTP Email
async function testSMTP() {
  console.log('4️⃣ Testing SMTP Email...');
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log('   ⚠️  SMTP not configured\n');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    await transporter.verify();
    
    console.log('   ✅ SMTP Connected successfully!');
    console.log(`   📧 Server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}\n`);
    
    return true;
  } catch (error: any) {
    console.log('   ❌ SMTP Error:', error.message);
    console.log('   💡 Check: SMTP_HOST, SMTP_USER, SMTP_PASS\n');
    return false;
  }
}

// Test 5: Database
async function testDatabase() {
  console.log('5️⃣ Testing Database Connection...');
  try {
    if (!process.env.DATABASE_URL) {
      console.log('   ⚠️  DATABASE_URL not configured\n');
      return false;
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    
    console.log('   ✅ Database Connected successfully!');
    console.log(`   🗄️  PostgreSQL version: ${result[0].pg_version.split(' ')[1]}\n`);
    
    return true;
  } catch (error: any) {
    console.log('   ❌ Database Error:', error.message);
    console.log('   💡 Get free database: https://neon.tech\n');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    b2: await testBackblazeB2(),
    stripe: await testStripe(),
    openai: await testOpenAI(),
    smtp: await testSMTP(),
    database: await testDatabase(),
  };

  console.log('═══════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Backblaze B2:  ${results.b2 ? '✅ Working' : '❌ Failed'}`);
  console.log(`Stripe:        ${results.stripe ? '✅ Working' : '⚠️  Not configured'}`);
  console.log(`OpenAI:        ${results.openai ? '✅ Working' : '⚠️  Not configured'}`);
  console.log(`SMTP Email:    ${results.smtp ? '✅ Working' : '⚠️  Not configured'}`);
  console.log(`Database:      ${results.database ? '✅ Working' : '❌ Failed'}`);
  console.log('═══════════════════════════════════════\n');

  const criticalServices = [results.b2, results.database];
  const allCriticalWorking = criticalServices.every(r => r === true);

  if (allCriticalWorking) {
    console.log('✅ All critical services are working!');
    console.log('💡 You can now upload files and the app will use Backblaze B2 storage.');
  } else {
    console.log('⚠️  Some critical services failed. Check the errors above.');
  }
}

runAllTests().catch(console.error);
