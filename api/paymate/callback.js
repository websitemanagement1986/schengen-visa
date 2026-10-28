const { decryptPayload } = require('../lib/paymate-crypto');
const { getPaymateConfig } = require('../lib/paymate-config');
const { isSuccessPayload } = require('../lib/paymate-client');
const { getPendingOrder, markOrderPaid, markOrderFailed } = require('../lib/paymate-orders');
const { sendOrderEmails } = require('../lib/email');

function extractOrderId(payload) {
  return (
    payload?.DetailedSummary?.OrderID ||
    payload?.Response?.OrderID ||
    payload?.OrderID ||
    payload?.OrderId ||
    null
  );
}

function extractTransactionId(payload) {
  return (
    payload?.DetailedSummary?.TransactionRefNo ||
    payload?.Response?.TransactionRefNo ||
    payload?.TransactionRefNo ||
    payload?.transactionRefNo ||
    extractOrderId(payload)
  );
}

async function finalizePaidOrder(orderId, payload) {
  const pending = getPendingOrder(orderId);
  if (!pending) {
    return { ok: false, error: 'Unknown order' };
  }
  if (pending.status === 'paid') {
    return { ok: true, alreadyProcessed: true, order: pending };
  }

  const transactionId = extractTransactionId(payload) || orderId;
  markOrderPaid(orderId, {
    transactionId,
    paymatePayload: payload,
  });

  await sendOrderEmails({
    transactionId,
    orderId,
    customer: pending.customer,
    items: pending.items,
    subtotal: pending.subtotal,
    deliveryCharge: pending.deliveryCharge,
    total: pending.total,
    paymentMethod: 'online',
    paymentProvider: 'paymate',
  });

  return {
    ok: true,
    transactionId,
    order: getPendingOrder(orderId),
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const config = getPaymateConfig();
    const body = req.body || {};

    let payload = body;
    if (body.EncryptedRandomKey || body.encryptedRandomKey) {
      const decrypted = decryptPayload(body, config.partnerPrivateKey, config.iv);
      if (decrypted) payload = decrypted;
    }

    const orderId = extractOrderId(payload);
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID missing in PayMate callback' });
    }

    if (!isSuccessPayload(payload)) {
      markOrderFailed(
        orderId,
        payload?.Description || payload?.ErrorDescription || 'Payment failed'
      );
      return res.status(400).json({ error: 'Payment not successful', details: payload });
    }

    const result = await finalizePaidOrder(orderId, payload);
    if (!result.ok) {
      return res.status(404).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      transaction_id: result.transactionId,
      already_processed: Boolean(result.alreadyProcessed),
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

module.exports.finalizePaidOrder = finalizePaidOrder;
module.exports.extractOrderId = extractOrderId;
module.exports.extractTransactionId = extractTransactionId;
