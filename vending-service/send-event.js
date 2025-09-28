// send-event.js (decode token and publish event with token.orderId)
const mqtt = require('mqtt');
const jwt = require('jsonwebtoken');

const host = process.env.MQTT_HOST || 'broker.hivemq.cloud';
const port = process.env.MQTT_PORT || '8883';
const username = process.env.MQTT_USERNAME || 'YOUR_USER';
const password = process.env.MQTT_PASSWORD || 'YOUR_PASS';
const url = `mqtts://${host}:${port}`;

const token = process.argv[2];
if (!token) {
  console.error('Usage: node send-event.js <TOKEN>');
  process.exit(1);
}

// decode token (no verification needed for simulation; you can verify if you have JWT_SECRET)
const decoded = jwt.decode(token);
if (!decoded || !decoded.orderId || !decoded.door) {
  // if your token doesn't include door, fall back to door arg or 1
  const door = process.argv[3] ? Number(process.argv[3]) : 1;
  decoded.orderId = decoded.orderId || process.argv[4] || 'sim-order';
  decoded.door = decoded.door || door;
}

const client = mqtt.connect(url, { username, password, rejectUnauthorized: false });

client.on('connect', () => {
  const deviceId = 'esp-test-1';
  const topic = `vending/${deviceId}/events`;
  const payload = JSON.stringify({
    type: 'door_open',
    door: decoded.door,
    orderId: decoded.orderId,
    token,
    timestamp: new Date().toISOString()
  });
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) console.error('Publish error', err);
    else console.log('Published event', topic, payload);
    client.end();
  });
});

client.on('error', (err) => console.error('MQTT error', err));