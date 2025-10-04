// Simple MQTT unlock test - no .env required
const mqtt = require('mqtt');
const jwt = require('jsonwebtoken');

// MQTT Configuration (replace with your HiveMQ details)
const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
const MQTT_PORT = 8883;
const MQTT_USER = 'mqttuser'; // Replace with your HiveMQ username
const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo'; // Replace with your HiveMQ password

// JWT Configuration (must match vending service)
const JWT_SECRET = 'jeg-kjorer-ford'; // Replace with your JWT secret

// Test parameters
const DEVICE_ID = 'esp-test-1';
const DOOR_NUMBER = 1;
const PORT_INDEX = 0; // Door 1 = port 0
const ORDER_ID = 'test-order-123';

console.log('🔧 MQTT Direct Unlock Test (Simple)');
console.log('===================================');

// Check if credentials are set
if (MQTT_USER === 'your-username' || MQTT_PASS === 'your-password') {
  console.error('❌ Please update the credentials in this file:');
  console.log('   - MQTT_USER: Replace with your HiveMQ username');
  console.log('   - MQTT_PASS: Replace with your HiveMQ password');
  console.log('   - JWT_SECRET: Replace with your JWT secret');
  process.exit(1);
}

console.log('✅ Credentials configured');
console.log(`📡 Host: ${MQTT_HOST}`);
console.log(`👤 User: ${MQTT_USER}`);
console.log(`🔑 JWT Secret: ${JWT_SECRET.substring(0, 8)}...`);
console.log('');

// Create JWT token
const token = jwt.sign(
  {
    orderId: ORDER_ID,
    door: DOOR_NUMBER,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes
  },
  JWT_SECRET
);

console.log('📝 Generated JWT Token:');
console.log(token);
console.log('');

// Create unlock message
const unlockMessage = {
  type: 'unlock',
  port: PORT_INDEX,
  orderId: ORDER_ID,
  token: token,
  durationMs: 1000
};

console.log('📤 Unlock Message:');
console.log(JSON.stringify(unlockMessage, null, 2));
console.log('');

// Connect to MQTT
const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  clientId: 'test-unlock-script'
});

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ');

  const topic = `vending/${DEVICE_ID}/cmd`;
  console.log(`📡 Publishing to topic: ${topic}`);

  // Publish unlock message
  client.publish(topic, JSON.stringify(unlockMessage), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Publish error:', err);
    } else {
      console.log('✅ Unlock message published successfully!');
      console.log('');
      console.log('🔍 Check your ESP32 Serial Monitor for:');
      console.log('   - MQTT RX topic: vending/esp-test-1/cmd');
      console.log('   - Command type: unlock');
      console.log('   - Unlock cmd received: port=0, orderId=test-order-123');
      console.log('   - Activating port 0 -> pin 25 for 1000ms');
    }

    // Disconnect after publishing
    setTimeout(() => {
      client.end();
      console.log('🔌 Disconnected from MQTT');
    }, 2000);
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT connection error:', err);
});

client.on('offline', () => {
  console.log('📴 MQTT client offline');
});
