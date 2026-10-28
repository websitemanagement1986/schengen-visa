const { sendAssistRequestEmail } = require('./lib/email');

const ALLOWED_TYPES = new Set(['itinerary', 'tickets', 'stay', 'visa']);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, customer, fields } = req.body || {};
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }
    if (!customer?.name?.trim() || !customer?.email?.trim() || !customer?.phone?.trim()) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }
    if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'Trip details are required' });
    }

    await sendAssistRequestEmail({
      type,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
      },
      fields,
    });

    return res.status(200).json({ success: true, reference: `SCE-${type.toUpperCase()}-${Date.now()}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
