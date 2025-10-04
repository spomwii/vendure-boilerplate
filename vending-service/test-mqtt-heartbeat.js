// Test MQTT heartbeat to see if ESP32 is alive
const mqtt = require('mqtt');

const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
const MQTT_PORT = 8883;
const MQTT_USER = 'mqttuser';
const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';

console.log('🔧 MQTT Heartbeat Test');
console.log('=====================');

const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  clientId: 'test-heartbeat-' + Math.random().toString(36).substr(2, 9)
});

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ');
  
  // Subscribe to ESP32 events topic to see if it's alive
  const eventsTopic = 'vending/esp-test-1/events';
  client.subscribe(eventsTopic, (err) => {
    if (err) {
      console.error('❌ Subscription failed:', err);
    } else {
      console.log(`✅ Subscribed to ${eventsTopic}`);
      console.log('🔍 Listening for ESP32 heartbeat...');
      console.log('   (ESP32 should send heartbeat every 30 seconds)');
    }
  });
});

client.on('message', (topic, message) => {
  console.log('📥 Received from ESP32:');
  console.log(`   Topic: ${topic}`);
  console.log(`   Message: ${message.toString()}`);
  
  try {
    const data = JSON.parse(message.toString());
    if (data.type === 'heartbeat') {
      console.log('💓 ESP32 heartbeat received!');
      console.log(`   Device ID: ${data.deviceId}`);
      console.log(`   Timestamp: ${data.ts}`);
    } else if (data.type === 'door_open' || data.type === 'door_closed') {
      console.log(`🚪 Door event: ${data.type} for door ${data.door}`);
    }
  } catch (e) {
    console.log('   (Non-JSON message)');
  }
});

client.on('error', (err) => {
  console.error('❌ MQTT error:', err);
});

// Listen for 60 seconds
setTimeout(() => {
  client.end();
  console.log('🔌 Disconnected');
}, 60000);
