const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'paymate-pending-orders.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, '{}', 'utf8');
  }
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function savePendingOrder(orderId, data) {
  const store = readStore();
  store[orderId] = {
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  writeStore(store);
}

function getPendingOrder(orderId) {
  const store = readStore();
  return store[orderId] || null;
}

function markOrderPaid(orderId, paymentData) {
  const store = readStore();
  if (!store[orderId]) return null;
  store[orderId] = {
    ...store[orderId],
    ...paymentData,
    status: 'paid',
    paidAt: new Date().toISOString(),
  };
  writeStore(store);
  return store[orderId];
}

function markOrderFailed(orderId, reason) {
  const store = readStore();
  if (!store[orderId]) return null;
  store[orderId] = {
    ...store[orderId],
    status: 'failed',
    failureReason: reason,
    failedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store[orderId];
}

module.exports = {
  savePendingOrder,
  getPendingOrder,
  markOrderPaid,
  markOrderFailed,
};
