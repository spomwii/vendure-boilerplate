// Test MQTT client conflict issue
const mqtt = require('mqtt');

async function testMQTTConflict() {
  console.log('🔧 Testing MQTT Client Conflict Issue');
  console.log('====================================');
  
  const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
  const MQTT_PORT = 8883;
  const MQTT_USER = 'mqttuser';
  const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';
  
  console.log('📡 Connecting to MQTT with unique client ID...');
  
  // Connect with unique client ID (like ESP32 does)
  const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USER,
    password: MQTT_PASS,
    clientId: 'test-conflict-' + Math.random().toString(36).substr(2, 9)
  });
  
  client.on('connect', () => {
    console.log('✅ Connected to MQTT');
    console.log('📡 Subscribing to ESP32 events...');
    
    // Subscribe to ESP32 events (this might cause ESP32 to lose subscription)
    client.subscribe('vending/esp-test-1/events', { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Subscribe error:', err);
      } else {
        console.log('✅ Subscribed to vending/esp-test-1/events');
        console.log('⚠️  This subscription might cause ESP32 to lose its subscription!');
      }
    });
    
    // Wait 5 seconds then disconnect
    setTimeout(() => {
      console.log('🔌 Disconnecting...');
      client.end();
    }, 5000);
  });
  
  client.on('message', (topic, message) => {
    console.log('📥 Received message:', topic, message.toString());
  });
  
  client.on('error', (err) => {
    console.error('❌ MQTT error:', err);
  });
  
  client.on('offline', () => {
    console.log('📴 MQTT client offline');
  });
}

testMQTTConflict().catch(console.error);
