// Test MQTT publish only - no subscription
const mqtt = require('mqtt');

const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
const MQTT_PORT = 8883;
const MQTT_USER = 'mqttuser';
const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';

console.log('🔧 MQTT Publish Only Test');
console.log('=========================');

const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  clientId: 'test-publish-' + Math.random().toString(36).substr(2, 9)
});

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ');
  
  const topic = 'vending/esp-test-1/cmd';
  const testMessage = {
    type: 'unlock',
    port: 0,
    orderId: 'test-connection-123',
    token: 'test-token-123',
    durationMs: 1000
  };
  
  console.log(`📤 Publishing to ${topic}`);
  console.log('Message:', JSON.stringify(testMessage, null, 2));
  
  client.publish(topic, JSON.stringify(testMessage), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Publish failed:', err);
    } else {
      console.log('✅ Message published successfully!');
      console.log('');
      console.log('🔍 Check your ESP32 serial monitor for:');
      console.log('   - MQTT RX topic: vending/esp-test-1/cmd');
      console.log('   - Command type: unlock');
      console.log('   - Unlock cmd received: port=0, orderId=test-connection-123');
      console.log('   - Activating port 0 -> pin 25 for 1000ms');
    }
    
    // Disconnect after publishing
    setTimeout(() => {
      client.end();
      console.log('🔌 Disconnected');
    }, 2000);
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT error:', err);
});
