// send-event.js
const mqtt = require('mqtt');

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

const client = mqtt.connect(url, { username, password, rejectUnauthorized: false });

client.on('connect', () => {
  const deviceId = 'esp-test-1';
  const topic = `vending/${deviceId}/events`;
  const payload = JSON.stringify({
    type: 'door_open',
    door: 1,
    orderId: 'test-order-123',
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