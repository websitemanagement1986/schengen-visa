const { sendContactEmail } = require('./lib/email');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, phone, message } = req.body || {};
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    await sendContactEmail({ name: name.trim(), email: email.trim(), phone: phone?.trim(), message: message.trim() });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
