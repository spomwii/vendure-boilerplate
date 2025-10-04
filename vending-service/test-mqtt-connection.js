// Test MQTT connection and subscription
const mqtt = require('mqtt');

const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
const MQTT_PORT = 8883;
const MQTT_USER = 'mqttuser';
const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';

console.log('🔧 MQTT Connection Test');
console.log('======================');

const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  clientId: 'test-connection-' + Math.random().toString(36).substr(2, 9)
});

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ');
  
  // Subscribe to the same topic as ESP32
  const topic = 'vending/esp-test-1/cmd';
  client.subscribe(topic, (err) => {
    if (err) {
      console.error('❌ Subscription failed:', err);
    } else {
      console.log(`✅ Subscribed to ${topic}`);
      
      // Send a test message
      const testMessage = {
        type: 'test',
        message: 'Hello ESP32!',
        timestamp: Date.now()
      };
      
      console.log('📤 Sending test message...');
      client.publish(topic, JSON.stringify(testMessage), { qos: 1 });
    }
  });
});

client.on('message', (topic, message) => {
  console.log('📥 Received message:');
  console.log(`   Topic: ${topic}`);
  console.log(`   Message: ${message.toString()}`);
});

client.on('error', (err) => {
  console.error('❌ MQTT error:', err);
});

client.on('offline', () => {
  console.log('📴 MQTT client offline');
});

// Keep alive for 10 seconds
setTimeout(() => {
  client.end();
  console.log('🔌 Disconnected');
}, 10000);
