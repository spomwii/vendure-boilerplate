// Test script for the new improved ESP32 code
const mqtt = require('mqtt');

const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
const MQTT_PORT = 8883;
const MQTT_USER = 'mqttuser';
const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';

console.log('🔧 Testing New Improved ESP32 Code');
console.log('==================================');

const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  clientId: 'test-new-esp32-' + Math.random().toString(36).substr(2, 9)
});

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ');
  
  // Subscribe to events to see ESP32 status
  const eventsTopic = 'vending/esp-test-1/events';
  client.subscribe(eventsTopic, (err) => {
    if (err) {
      console.error('❌ Subscription failed:', err);
    } else {
      console.log(`✅ Subscribed to ${eventsTopic}`);
      console.log('🔍 Listening for ESP32 events...');
    }
  });
  
  // Send unlock command
  const cmdTopic = 'vending/esp-test-1/cmd';
  const unlockMessage = {
    type: 'unlock',
    port: 0,
    orderId: 'new-esp32-test-123',
    token: 'NEW-ESP32-TOKEN-123',
    durationMs: 600
  };
  
  console.log(`📤 Sending unlock command to ${cmdTopic}`);
  client.publish(cmdTopic, JSON.stringify(unlockMessage), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Publish failed:', err);
    } else {
      console.log('✅ Unlock command sent!');
      console.log('');
      console.log('🔍 Expected ESP32 output:');
      console.log('   - MQTT RX topic: vending/esp-test-1/cmd');
      console.log('   - Command type: unlock');
      console.log('   - Unlock cmd received: port=0, orderId=new-esp32-test-123');
      console.log('   - Activating port 0 -> pin 25 for 600ms');
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
      console.log('💓 ESP32 heartbeat:');
      console.log(`   Device ID: ${data.deviceId}`);
      console.log(`   MQTT Connected: ${data.mqttConnected}`);
      console.log(`   WiFi Connected: ${data.wifiConnected}`);
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

// Keep alive for 30 seconds
setTimeout(() => {
  client.end();
  console.log('🔌 Disconnected');
}, 30000);
