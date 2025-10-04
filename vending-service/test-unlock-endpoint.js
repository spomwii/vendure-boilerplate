// Test vending service unlock endpoint

async function testUnlockEndpoint() {
  console.log('🔧 Testing Vending Service Unlock Endpoint');
  console.log('==========================================');
  
  const VENDING_SERVICE_URL = process.env.VENDING_SERVICE_URL || 'https://vending-service-production-1708.up.railway.app';
  const unlockUrl = `${VENDING_SERVICE_URL}/unlock`;
  
  const unlockData = {
    orderId: 'test-order-123',
    door: 1
  };
  
  console.log('📡 Testing unlock endpoint:', unlockUrl);
  console.log('📤 Unlock data:', unlockData);
  
  try {
    const response = await fetch(unlockUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unlockData)
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Unlock endpoint working!');
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('📝 Parsed response:', jsonResponse);
      } catch (e) {
        console.log('⚠️ Response is not JSON:', responseText);
      }
    } else {
      console.log('❌ Unlock endpoint failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing unlock endpoint:', error.message);
  }
}

testUnlockEndpoint().catch(console.error);
