const { callPayMate, isSuccessPayload } = require('../lib/paymate-client');
const { getPendingOrder } = require('../lib/paymate-orders');
const { finalizePaidOrder } = require('./callback');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orderId = req.query?.orderId || req.body?.orderId;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const pending = getPendingOrder(orderId);
    if (!pending) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (pending.status === 'paid') {
      return res.status(200).json({
        success: true,
        status: 'paid',
        transaction_id: pending.transactionId || orderId,
        amount: pending.total,
        customer: pending.customer,
        items: pending.items,
      });
    }

    const inquiryPayload = {
      OrderId: orderId,
      TransactionRefNo: pending.transactionId || '',
      FromDate: '',
      ToDate: '',
    };

    let paymateStatus = null;
    try {
      const { decrypted } = await callPayMate(inquiryPayload);
      paymateStatus = decrypted;
      if (isSuccessPayload(decrypted)) {
        const paymentStatus = String(
          decrypted?.DetailedSummary?.Status ||
            decrypted?.Response?.Status ||
            decrypted?.Status ||
            ''
        ).toLowerCase();

        if (paymentStatus.includes('paid') || paymentStatus.includes('success') || paymentStatus.includes('completed')) {
          const result = await finalizePaidOrder(orderId, decrypted);
          if (result.ok) {
            const updated = getPendingOrder(orderId);
            return res.status(200).json({
              success: true,
              status: 'paid',
              transaction_id: result.transactionId,
              amount: updated.total,
              customer: updated.customer,
              items: updated.items,
            });
          }
        }
      }
    } catch {
      // Inquiry shape may differ on production; fall back to local pending state.
    }

    return res.status(200).json({
      success: false,
      status: pending.status,
      order_id: orderId,
      amount: pending.total,
      paymate_status: paymateStatus,
      message:
        pending.status === 'failed'
          ? pending.failureReason || 'Payment failed'
          : 'Payment is still pending. If you completed payment, please wait a moment and refresh.',
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
