// test-publish.js
const mqtt = require('mqtt');

const host = process.env.MQTT_HOST || 'broker.hivemq.cloud';
const port = process.env.MQTT_PORT || '8883';
const username = process.env.MQTT_USERNAME || 'YOUR_USER';
const password = process.env.MQTT_PASSWORD || 'YOUR_PASS';
const url = `mqtts://${host}:${port}`;

const client = mqtt.connect(url, { username, password, rejectUnauthorized: false });

client.on('connect', () => {
  const deviceId = 'esp-test-1';
  const topic = `vending/${deviceId}/cmd`;
  const payload = JSON.stringify({
    type: 'unlock',
    port: 0,
    orderId: 'smoke-1',
    token: 'TEST-TOKEN-123',
    durationMs: 1000
  });
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) console.error('Publish error', err);
    else console.log('Published', topic, payload);
    client.end();
  });
});
client.on('error', (err) => console.error('MQTT error', err));