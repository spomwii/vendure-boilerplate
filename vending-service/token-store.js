// vending-service/token-store.js
// Simple JSON-backed token store (synchronous, OK for POC)

const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'token-store.json');

function readStore() {
  try {
    if (!fs.existsSync(FILE)) return {};
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('Failed to read token-store file', err);
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write token-store file', err);
  }
}

const store = readStore(); // { token: { orderId, door, email, used, exp } }

module.exports = {
  has(token) {
    return Object.prototype.hasOwnProperty.call(store, token);
  },
  get(token) {
    return store[token];
  },
  set(token, info) {
    store[token] = info;
    writeStore(store);
  },
  markUsed(token) {
    if (store[token]) {
      store[token].used = true;
      writeStore(store);
    }
  },
  delete(token) {
    if (store[token]) {
      delete store[token];
      writeStore(store);
    }
  },
  cleanupExpired() {
    const now = Math.floor(Date.now() / 1000);
    let changed = false;
    for (const [t, info] of Object.entries(store)) {
      if (info.exp && info.exp < now) {
        delete store[t];
        changed = true;
      }
    }
    if (changed) writeStore(store);
  }
};