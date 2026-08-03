/**
 * Quick test script to verify Vonage SMS configuration
 * Run: npx tsx server/scripts/test-vonage-quick.ts
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

async function testVonageConfig() {
  console.log('🔍 Testing Vonage SMS Configuration...\n');
  
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  
  console.log('Environment Variables:');
  console.log(`VONAGE_API_KEY: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET'}`);
  console.log(`VONAGE_API_SECRET: ${apiSecret ? (apiSecret.includes('placeholder') ? 'PLACEHOLDER - UPDATE NEEDED' : 'SET') : 'NOT SET'}`);
  console.log(`VONAGE_PHONE_NUMBER: ${process.env.VONAGE_PHONE_NUMBER || 'NOT SET'}\n`);

  if (!apiKey || !apiSecret || apiSecret.includes('placeholder')) {
    console.error('❌ Missing or invalid Vonage credentials');
    console.log('\n📋 To fix this:');
    console.log('1. Go to your Heroku app dashboard');
    console.log('2. Navigate to Settings > Config Vars');
    console.log('3. Copy the VONAGE_API_SECRET value');
    console.log('4. Update your local .env file with the real value');
    return;
  }

  try {
    console.log('🔄 Testing Vonage API connection...');
    
    // Test account balance (simple API test)
    const balanceUrl = `https://rest.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`;
    const response = await fetch(balanceUrl);
    const data = await response.json();

    if (response.ok && data.value !== undefined) {
      console.log('✅ Vonage connection successful!');
      console.log(`💰 Account balance: €${parseFloat(data.value).toFixed(2)}`);
      console.log('🎉 SMS service should work correctly now');
    } else {
      console.error('❌ Vonage API error:', data);
      console.log('\n💡 Possible issues:');
      console.log('- Invalid API credentials');
      console.log('- Network connectivity issues');
      console.log('- Vonage account suspended');
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('\n💡 This could be due to:');
    console.log('- Network issues');
    console.log('- Invalid credentials');
    console.log('- Firewall blocking requests');
  }
}

testVonageConfig().catch(console.error);
