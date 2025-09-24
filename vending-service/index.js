// index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');

const app = express();
app.use(bodyParser.json());

const {
  MQTT_HOST,
  MQTT_PORT,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TLS = 'true',
  JWT_SECRET,
  JWT_EXPIRES_IN = '30s',
  SENDGRID_API_KEY,
  FROM_EMAIL = 'no-reply@example.com',
  PORT = 4000
} = process.env;

if (!MQTT_HOST || !MQTT_PORT) {
  console.error('Please set MQTT_HOST and MQTT_PORT in env');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('Please set JWT_SECRET in env');
  process.exit(1);
}
if (!SENDGRID_API_KEY) {
  console.warn('No SENDGRID_API_KEY set - emails will not be sent');
}

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const mqttProtocol = (MQTT_TLS === 'true' || MQTT_TLS === '1') ? 'mqtts' : 'mqtt';
const mqttUrl = `${mqttProtocol}://${MQTT_HOST}:${MQTT_PORT}`;
const mqttOptions = {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  rejectUnauthorized: false,
};

const client = mqtt.connect(mqttUrl, mqttOptions);

client.on('connect', () => {
  console.log('MQTT connected to', mqttUrl);
  client.subscribe('vending/+/events', { qos: 1 }, (err) => {
    if (err) console.error('Subscribe error', err);
    else console.log('Subscribed to vending/+/events');
  });
});

client.on('error', (err) => console.error('MQTT error', err));

function publishUnlock(deviceId, portIndex, orderId, token, durationMs = 1000) {
  const topic = `vending/${deviceId}/cmd`;
  const payload = { type: 'unlock', port: portIndex, orderId, token, durationMs };
  const str = JSON.stringify(payload);
  client.publish(topic, str, { qos: 1 }, (err) => {
    if (err) console.error('Publish error', err);
    else console.log('Published unlock to', topic, str);
  });
}

const doorMap = {
  1: { deviceId: 'esp-test-1', portIndex: 0, productSku: 'SKU-ABC' },
  2: { deviceId: 'esp-test-1', portIndex: 1, productSku: 'SKU-XYZ' }
};

const tokenStore = new Map();

function storeToken(token, info) {
  tokenStore.set(token, { ...info, used: false });
}

setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [token, info] of tokenStore.entries()) {
    if (info.exp && info.exp < now) tokenStore.delete(token);
  }
}, 60 * 1000);

app.post('/unlock', async (req, res) => {
  try {
    const { orderId, door, email } = req.body;
    if (!orderId || !door) return res.status(400).json({ error: 'orderId and door are required' });

    const map = doorMap[door];
    if (!map) return res.status(400).json({ error: `No mapping for door ${door}` });

    const payload = { orderId, door };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const decoded = jwt.decode(token);
    storeToken(token, { orderId, door, email, exp: decoded.exp });

    publishUnlock(map.deviceId, map.portIndex, orderId, token, 1000);

    return res.json({ ok: true, token });
  } catch (err) {
    console.error('unlock error', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log('MQTT message', topic, payload);

    const parts = topic.split('/');
    const deviceId = parts[1];

    if (payload.type === 'door_open') {
      const { door, orderId, token, timestamp } = payload;
      if (!token) {
        console.warn('door_open missing token; ignoring');
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        console.warn('Invalid/expired token in door_open', err.message);
        return;
      }

      if (decoded.orderId !== orderId || decoded.door !== door) {
        console.warn('Token payload mismatch vs event', { decoded, payload });
        return;
      }

      const record = tokenStore.get(token);
      if (!record) {
        console.warn('Token not found (maybe expired or not issued by us)');
        return;
      }
      if (record.used) {
        console.warn('Token already used; ignoring');
        return;
      }
      record.used = true;
      tokenStore.set(token, record);

      console.log(`Door ${door} opened for order ${orderId} on device ${deviceId} at ${timestamp}`);

      if (record.email) {
        try {
          await sendReceiptEmail(record.email, orderId, door);
          console.log('Receipt email sent to', record.email);
        } catch (err) {
          console.error('Failed to send receipt email', err);
        }
      } else {
        console.log('No email provided for order', orderId);
      }
    }
  } catch (err) {
    console.error('Error handling MQTT message', err);
  }
});

async function sendReceiptEmail(toEmail, orderId, door) {
  if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not set; skipping email');
    return;
  }

  const msg = {
    to: toEmail,
    from: FROM_EMAIL,
    subject: `Your receipt for order ${orderId}`,
    text: `Thank you for your purchase. Your order ${orderId} unlocked door ${door}.`,
    html: `<p>Thank you for your purchase.</p><p>Your order <strong>${orderId}</strong> unlocked door <strong>${door}</strong>.</p>`,
  };
  return sgMail.send(msg);
}

app.get('/', (req, res) => res.send('Vending service running'));

app.listen(PORT, () => console.log(`Vending microservice listening on port ${PORT}`));