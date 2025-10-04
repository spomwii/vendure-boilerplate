// Test unlock with retain flag (like the working script)
const mqtt = require('mqtt');

const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
const MQTT_PORT = 8883;
const MQTT_USER = 'mqttuser';
const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';

console.log('🔧 MQTT Unlock with Retain Test');
console.log('===============================');

const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  // No clientId - let MQTT generate unique one
  rejectUnauthorized: false
});

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ');
  
  const topic = 'vending/esp-test-1/cmd';
  const payload = JSON.stringify({
    type: 'unlock',
    port: 0,
    orderId: 'retain-test-123',
    token: 'RETAIN-TOKEN-123',
    durationMs: 2000
  });
  
  console.log(`📤 Publishing to ${topic} with retain flag...`);
  console.log('Payload:', payload);
  
  client.publish(topic, payload, { qos: 1, retain: true }, (err) => {
    if (err) {
      console.error('❌ Publish failed:', err);
    } else {
      console.log('✅ Message published with retain flag!');
      console.log('');
      console.log('🔍 Check your ESP32 serial monitor for:');
      console.log('   - MQTT RX topic: vending/esp-test-1/cmd');
      console.log('   - Command type: unlock');
      console.log('   - Unlock cmd received: port=0, orderId=retain-test-123');
      console.log('   - Activating port 0 -> pin 25 for 2000ms');
    }
    
    client.end();
    console.log('🔌 Disconnected');
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT error:', err);
});
