// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');

const app = express();

// Save raw request body on parse errors to help debug malformed JSON
const rawBodySaver = function (req, res, buf, encoding) {
  try {
    req.rawBody = buf.toString(encoding || 'utf8');
  } catch (e) {
    req.rawBody = '';
  }
};
app.use(bodyParser.json({ verify: rawBodySaver }));

// Load configuration from environment (Railway service variables recommended)
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

// Basic required env checks (fail early to avoid unclear behavior)
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
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Token store (persistent) - expects vending-service/token-store.json to be created/managed by module
const tokenStorePath = path.join(__dirname, 'token-store.json');
function readTokenStore() {
  try {
    if (!fs.existsSync(tokenStorePath)) return {};
    const raw = fs.readFileSync(tokenStorePath, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('Failed to read token-store file', err);
    return {};
  }
}
function writeTokenStore(store) {
  try {
    fs.writeFileSync(tokenStorePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write token-store file', err);
  }
}
const tokenStore = readTokenStore();
// helpers for token store
function tokenSet(token, info) {
  tokenStore[token] = info;
  writeTokenStore(tokenStore);
}
function tokenGet(token) {
  return tokenStore[token];
}
function tokenMarkUsed(token) {
  if (tokenStore[token]) {
    tokenStore[token].used = true;
    writeTokenStore(tokenStore);
  }
}
function tokenCleanupExpired() {
  const now = Math.floor(Date.now() / 1000);
  let changed = false;
  for (const t of Object.keys(tokenStore)) {
    const info = tokenStore[t];
    if (info && info.exp && info.exp < now) {
      delete tokenStore[t];
      changed = true;
    }
  }
  if (changed) writeTokenStore(tokenStore);
}
setInterval(tokenCleanupExpired, 60 * 1000);

// MQTT client setup
const mqttProtocol = (MQTT_TLS === 'true' || MQTT_TLS === '1') ? 'mqtts' : 'mqtt';
const mqttUrl = `${mqttProtocol}://${MQTT_HOST}:${MQTT_PORT}`;

// For POC allow insecure TLS (no cert validation). In production replace with setCACert(...) and remove setInsecure().
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

client.on('error', (err) => {
  console.error('MQTT error', err);
});

// Simple door mapping (for POC). Replace with DB or file later.
const doorMap = {
  1: { deviceId: 'esp-test-1', portIndex: 0, productSku: 'SKU-ABC' },
  2: { deviceId: 'esp-test-1', portIndex: 1, productSku: 'SKU-XYZ' }
};

// Publish unlock command to device
function publishUnlock(deviceId, portIndex, orderId, token, durationMs = 1000) {
  const topic = `vending/${deviceId}/cmd`;
  const payload = { type: 'unlock', port: portIndex, orderId, token, durationMs };
  const str = JSON.stringify(payload);
  client.publish(topic, str, { qos: 1 }, (err) => {
    if (err) console.error('Publish error', err);
    else console.log('Published unlock to', topic, str);
  });
}

// API: issue token and publish unlock
app.post('/unlock', async (req, res) => {
  try {
    const { orderId, door, email } = req.body;
    if (!orderId || !door) return res.status(400).json({ error: 'orderId and door are required' });
    const map = doorMap[door];
    if (!map) return res.status(400).json({ error: `No mapping for door ${door}` });

    const payload = { orderId, door };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const decoded = jwt.decode(token);
    tokenSet(token, { orderId, door, email, used: false, exp: decoded.exp });

    publishUnlock(map.deviceId, map.portIndex, orderId, token, 1000);

    return res.json({ ok: true, token });
  } catch (err) {
    console.error('unlock error', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// Error handler to show helpful message when JSON parse fails
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.error('JSON parse error, raw body was:', req.rawBody);
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next(err);
});

// Handle incoming MQTT device events
client.on('message', async (topic, message) => {
  try {
    const text = message.toString();
    const payload = JSON.parse(text);
    console.log('MQTT message', topic, payload);

    // topic format: vending/{deviceId}/events
    const parts = topic.split('/');
    const deviceId = parts[1];

    if (payload.type === 'door_open') {
      const { door, orderId, token, timestamp } = payload;
      if (!token) {
        console.warn('door_open missing token; ignoring');
        return;
      }

      // Verify token signature and payload
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        console.warn('Invalid/expired token in door_open', err.message);
        return;
      }

      // Check that token/order match
      if (decoded.orderId !== orderId || decoded.door !== door) {
        console.warn('Token payload mismatch vs event', { decoded, payload });
        return;
      }

      // Check persisted token store (single-use)
      const record = tokenGet(token);
      if (!record) {
        console.warn('Token not found (maybe expired or not issued by us)');
        return;
      }
      if (record.used) {
        console.warn('Token already used; ignoring');
        return;
      }
      tokenMarkUsed(token);

      console.log(`Door ${door} opened for order ${orderId} on device ${deviceId} at ${timestamp}`);

      // Send receipt email if present
      if (record.email && SENDGRID_API_KEY) {
        try {
          await sendReceiptEmail(record.email, orderId, door);
          console.log('Receipt email sent to', record.email);
        } catch (err) {
          console.error('Failed to send receipt email', err);
        }
      } else {
        console.log('No email provided for order', orderId);
      }

      // TODO: integrate with Vendure Admin API to mark fulfillment
    }
  } catch (err) {
    console.error('Error handling MQTT message', err);
  }
});

// Email helper using SendGrid
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

// health endpoint
app.get('/', (req, res) => res.send('Vending service running'));

// GET /door/:doorId  -> returns { door: 1, deviceId: 'esp-test-1', portIndex: 0, productSku: 'SKU-ABC' }
app.get('/door/:doorId', (req, res) => {
  const door = Number(req.params.doorId);
  const map = doorMap[door];
  if (!map) return res.status(404).json({ error: 'No mapping' });
  return res.json({ door, ...map });
});

// Start HTTP server
app.listen(PORT, () => console.log(`Vending microservice listening on port ${PORT}`));