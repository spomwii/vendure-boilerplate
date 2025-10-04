// Test direct MQTT unlock (same as storefront will do)
const mqtt = require('mqtt');

async function testDirectMQTTUnlock() {
  console.log('🔧 Testing Direct MQTT Unlock');
  console.log('==============================');
  
  const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
  const MQTT_PORT = 8883;
  const MQTT_USER = 'mqttuser';
  const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';
  
  const clientId = 'test-direct-unlock-' + Math.random().toString(36).substr(2, 9);
  
  console.log('📡 Connecting to MQTT with client ID:', clientId);
  
  const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USER,
    password: MQTT_PASS,
    clientId: clientId,
    clean: true,
    reconnectPeriod: 0
  });
  
  client.on('connect', () => {
    console.log('✅ Connected to MQTT');
    
    // Create unlock message (same format as ESP32 expects)
    const unlockMessage = {
      type: 'unlock',
      port: 0, // Door 1 = port 0
      orderId: 'test-direct-unlock-123',
      token: 'DIRECT-UNLOCK-' + Date.now(),
      durationMs: 600
    };
    
    const topic = 'vending/esp-test-1/cmd';
    const payload = JSON.stringify(unlockMessage);
    
    console.log('📤 Publishing direct unlock:', topic);
    console.log('📤 Payload:', payload);
    
    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Publish error:', err);
      } else {
        console.log('✅ Direct unlock published successfully!');
        console.log('🔍 Check ESP32 Serial Monitor for unlock command');
      }
      
      // Disconnect immediately to avoid conflicts
      setTimeout(() => {
        client.end();
        console.log('🔌 Disconnected from MQTT');
      }, 1000);
    });
  });
  
  client.on('error', (err) => {
    console.error('❌ MQTT error:', err);
  });
  
  client.on('offline', () => {
    console.log('📴 MQTT client offline');
  });
}

testDirectMQTTUnlock().catch(console.error);
