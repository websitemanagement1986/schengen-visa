const { validateCart } = require('../lib/products');
const {
  callPayMate,
  extractPaymentUrl,
  extractPaymateMessage,
  isSuccessPayload,
} = require('../lib/paymate-client');
const { getPaymateConfig } = require('../lib/paymate-config');
const { resolvePaymateMethod } = require('../lib/paymate-payment-methods');
const { buildCollectPaymentsPayload } = require('../lib/paymate-payload');
const { savePendingOrder } = require('../lib/paymate-orders');

function buildOrderId() {
  return `SCE${Date.now()}`.slice(0, 20);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { cart, customer, payment_method: paymentMethod } = req.body || {};
    if (!customer?.name || !customer?.email || !customer?.phone) {
      return res.status(400).json({ error: 'Customer details are required' });
    }

    const { items, subtotal, deliveryCharge, total } = validateCart(cart);
    const config = getPaymateConfig();
    const paymateMethod = resolvePaymateMethod(paymentMethod);
    const orderId = buildOrderId();
    const returnUrl = `${config.siteUrl}/paymate-return.html?orderId=${encodeURIComponent(orderId)}`;

    const payload = buildCollectPaymentsPayload({
      orderId,
      referenceCode: config.referenceCode,
      companyName: customer.name,
      mobile: String(customer.phone).replace(/\D/g, '').slice(-10),
      email: customer.email,
      invoiceAmount: total,
      paymentMode: paymateMethod.PaymentMode,
      paymentType: paymateMethod.PaymentType,
      targetApp: config.targetApp,
      deviceOS: config.deviceOS,
      includeIntentFields: paymateMethod.PaymentType === 'Intent',
      returnUrl,
    });

    savePendingOrder(orderId, {
      customer,
      items,
      subtotal,
      deliveryCharge,
      total,
      returnUrl,
      paymentMethod: paymateMethod.key,
      paymatePaymentMode: paymateMethod.PaymentMode,
      paymatePaymentType: paymateMethod.PaymentType,
    });

    const { decrypted } = await callPayMate(payload);
    if (!isSuccessPayload(decrypted)) {
      const message = extractPaymateMessage(decrypted) || 'PayMate rejected the payment request';
      return res.status(502).json({ error: message, details: decrypted });
    }

    const paymentUrl = extractPaymentUrl(decrypted);
    if (!paymentUrl) {
      return res.status(502).json({
        error: 'PayMate did not return a payment URL',
        details: decrypted,
      });
    }

    return res.status(200).json({
      order_id: orderId,
      payment_url: paymentUrl,
      transaction_ref:
        decrypted?.Response?.TransactionRefNo ||
        decrypted?.DetailedSummary?.TransactionRefNo ||
        null,
      amount: total,
      payment_method: paymateMethod.key,
    });
  } catch (err) {
    if (err.paymateDetails) {
      return res.status(502).json({ error: err.message, details: err.paymateDetails });
    }
    return res.status(400).json({ error: err.message });
  }
};
