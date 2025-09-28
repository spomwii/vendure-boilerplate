// node test-publish-retain.js
const mqtt = require('mqtt');
const url = `mqtts://${process.env.MQTT_HOST || 'broker.hivemq.cloud'}:${process.env.MQTT_PORT || 8883}`;
const client = mqtt.connect(url, { username: process.env.MQTT_USERNAME, password: process.env.MQTT_PASSWORD, rejectUnauthorized:false });
client.on('connect', () => {
  const topic = 'vending/esp-test-1/cmd';
  const payload = JSON.stringify({ type:'unlock', port:0, orderId:'smoke-1', token:'TEST-TOKEN', durationMs:1000 });
  client.publish(topic, payload, { qos:1, retain:true }, (err) => {
    console.log('published', err || 'ok');
    client.end();
  });
});