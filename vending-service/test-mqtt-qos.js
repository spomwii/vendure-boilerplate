// Test different QoS levels
const mqtt = require('mqtt');

const MQTT_HOST = 'b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud';
const MQTT_PORT = 8883;
const MQTT_USER = 'mqttuser';
const MQTT_PASS = '4P1VQ7Z2jRItKCLgyI0MagNo';

console.log('🔧 MQTT QoS Test');
console.log('================');

const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  clientId: 'test-qos-' + Math.random().toString(36).substr(2, 9)
});

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ');
  
  const topic = 'vending/esp-test-1/cmd';
  const testMessage = {
    type: 'unlock',
    port: 0,
    orderId: 'qos-test-123',
    token: 'qos-token-123',
    durationMs: 2000
  };
  
  console.log(`📤 Publishing to ${topic} with QoS 0...`);
  client.publish(topic, JSON.stringify(testMessage), { qos: 0 }, (err) => {
    if (err) {
      console.error('❌ QoS 0 publish failed:', err);
    } else {
      console.log('✅ QoS 0 message published!');
    }
    
    setTimeout(() => {
      console.log(`📤 Publishing to ${topic} with QoS 1...`);
      client.publish(topic, JSON.stringify(testMessage), { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ QoS 1 publish failed:', err);
        } else {
          console.log('✅ QoS 1 message published!');
        }
        
        setTimeout(() => {
          console.log(`📤 Publishing to ${topic} with QoS 2...`);
          client.publish(topic, JSON.stringify(testMessage), { qos: 2 }, (err) => {
            if (err) {
              console.error('❌ QoS 2 publish failed:', err);
            } else {
              console.log('✅ QoS 2 message published!');
            }
            
            setTimeout(() => {
              client.end();
              console.log('🔌 Disconnected');
            }, 2000);
          });
        }, 2000);
      });
    });
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT error:', err);
});
