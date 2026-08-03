import "dotenv/config";

/**
 * Simple script to test Vonage SMS API configuration
 */
async function testVonageConnection() {
  console.log('🔍 Testing Vonage SMS Configuration...');
  
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.error('❌ Missing Vonage credentials in environment variables');
    console.log('Required: VONAGE_API_KEY, VONAGE_API_SECRET');
    return;
  }
  
  console.log(`📱 API Key: ${apiKey}`);
  console.log(`🔐 API Secret: ${apiSecret ? '***' + apiSecret.slice(-4) : 'Not set'}`);
  
  try {
    // Test account balance
    console.log('💰 Checking account balance...');
    
    const balanceResponse = await fetch(`https://rest.nexmo.com/account/get-balance?api_key=${apiKey}&api_secret=${apiSecret}`);
    const balance = await balanceResponse.json();
    
    if (balanceResponse.ok) {
      console.log('✅ Vonage connection successful!');
      console.log(`💵 Account Balance: €${balance.value} ${balance.currency}`);
      console.log(`🔄 Auto-reload: ${balance.autoReload ? 'Enabled' : 'Disabled'}`);
    } else {
      console.error('❌ Authentication failed:', balance);
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

// Run the test
testVonageConnection().catch(console.error);
