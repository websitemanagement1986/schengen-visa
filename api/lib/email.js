async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || 'hello@schengenease.in';

  if (!apiKey) {
    console.log(`[EMAIL SKIPPED - no RESEND_API_KEY] To: ${to}, Subject: ${subject}`);
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: `SchengenEase <${from}>`, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to send email');
  }
  return res.json();
}

function buildOrderHtml({ transactionId, customer, items, total, paymentMethod, isAdmin }) {
  const itemRows = items
    .map((i) => `<tr><td>${i.name}</td><td>${i.qty}</td><td>₹${i.lineTotal.toLocaleString('en-IN')}</td></tr>`)
    .join('');

  const payLabel =
    paymentMethod === 'pay_later'
      ? 'Pay later (UPI/bank — instructions sent by email)'
      : paymentMethod === 'paymate'
        ? 'Paid online via PayMate'
        : 'Online payment';

  const title = isAdmin ? 'New SchengenEase enquiry' : 'SchengenEase — request received';
  const greeting = isAdmin
    ? '<p>A new service request was submitted on SchengenEase.</p>'
    : `<p>Dear ${customer.name},</p><p>Thank you for choosing SchengenEase. Our team will contact you within 4 working days to begin your assisted service.</p><p><em>Embassy visa fees (e.g. €80) are paid separately to the mission and are not included in our consultancy fee.</em></p>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1a237e;">${title}</h2>
      ${greeting}
      <p><strong>Reference:</strong> ${transactionId}</p>
      <p><strong>Payment:</strong> ${payLabel}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead><tr style="background:#1a237e;color:#fff;">
          <th style="padding:8px;text-align:left;">Service</th>
          <th style="padding:8px;">Qty</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr><td colspan="2" style="padding:8px;font-weight:bold;">Total consultancy fee</td>
          <td style="padding:8px;text-align:right;font-weight:bold;">₹${total.toLocaleString('en-IN')}</td></tr></tfoot>
      </table>
      <p><strong>Customer:</strong> ${customer.name}<br>
         <strong>Email:</strong> ${customer.email}<br>
         <strong>Phone:</strong> ${customer.phone}<br>
         ${customer.city ? `<strong>City:</strong> ${customer.city}<br>` : ''}
         ${customer.notes ? `<strong>Notes:</strong> ${customer.notes}` : ''}</p>
      <p style="color:#64748b;font-size:12px;">SchengenEase | Greater Noida, India | hello@schengenease.in</p>
    </div>`;
}

async function sendOrderEmails({ transactionId, customer, items, total, paymentMethod = 'pay_later' }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const buyerHtml = buildOrderHtml({ transactionId, customer, items, total, paymentMethod, isAdmin: false });
  const adminHtml = buildOrderHtml({ transactionId, customer, items, total, paymentMethod, isAdmin: true });

  await sendViaResend({
    to: customer.email,
    subject: `SchengenEase — ${transactionId}`,
    html: buyerHtml,
  });

  if (adminEmail) {
    await sendViaResend({
      to: adminEmail,
      subject: `[SchengenEase] New request — ${transactionId}`,
      html: adminHtml,
    });
  }
}

async function sendContactEmail({ name, email, phone, message }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log(`[CONTACT] From: ${name} <${email}>: ${message}`);
    return;
  }

  await sendViaResend({
    to: adminEmail,
    subject: `[SchengenEase Contact] ${name}`,
    html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone || 'N/A'}</p><p><strong>Message:</strong></p><p>${message}</p>`,
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendAssistRequestEmail({ type, customer, fields }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const rows = Object.entries(fields || {})
    .map(([k, v]) => `<tr><td style="padding:6px;font-weight:600;">${escapeHtml(k)}</td><td style="padding:6px;">${escapeHtml(v)}</td></tr>`)
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;">
      <h2 style="color:#1a237e;">SchengenEase assisted request — ${escapeHtml(type)}</h2>
      <p><strong>Name:</strong> ${escapeHtml(customer.name)}<br>
         <strong>Email:</strong> ${escapeHtml(customer.email)}<br>
         <strong>Phone:</strong> ${escapeHtml(customer.phone)}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;">${rows}</table>
    </div>`;

  if (adminEmail) {
    await sendViaResend({
      to: adminEmail,
      subject: `[SchengenEase] ${type} request from ${customer.name}`,
      html,
    });
  } else {
    console.log(`[ASSIST ${type}]`, customer, fields);
  }

  if (customer.email) {
    await sendViaResend({
      to: customer.email,
      subject: `SchengenEase — we received your ${type} request`,
      html: `<p>Dear ${escapeHtml(customer.name)},</p><p>Thank you. Our travel advisors will email you a tailored response within 4 working days.</p><p>— SchengenEase</p>`,
    });
  }
}

module.exports = { sendOrderEmails, sendContactEmail, sendAssistRequestEmail };
