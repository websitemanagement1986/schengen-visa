function validateCheckoutForm(data) {
  const errors = [];
  if (!data.name?.trim()) errors.push('Full name is required');
  if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Valid email is required');
  if (!data.phone?.trim() || !/^[6-9]\d{9}$/.test(data.phone.replace(/\D/g, '').slice(-10))) {
    errors.push('Valid 10-digit Indian mobile number is required');
  }
  if (getCart().length === 0) errors.push('Select at least one service on the home page or add a package below');
  return errors;
}

function getCheckoutData() {
  return {
    name: document.getElementById('name')?.value.trim(),
    email: document.getElementById('email')?.value.trim(),
    phone: document.getElementById('phone')?.value.trim(),
    city: document.getElementById('city')?.value.trim(),
    notes: document.getElementById('notes')?.value.trim(),
  };
}

function getPaymentMethod() {
  return document.querySelector('input[name="payment"]:checked')?.value || 'upi';
}

function updateCheckoutButton() {
  const btn = document.getElementById('pay-btn');
  if (!btn) return;
  const method = getPaymentMethod();
  btn.textContent = method === 'pay_later' ? 'Submit — pay via UPI/bank link' : 'Pay now via UPI';
}

function renderCheckoutSummary() {
  const el = document.getElementById('checkout-summary');
  if (!el) return;
  const items = getCartDetails();
  const total = getCartTotal();
  const method = getPaymentMethod();
  if (!items.length) {
    el.innerHTML = `<h3>Your services</h3><p>No services selected. <a href="index.html#packages">Browse packages</a></p>`;
    return;
  }
  el.innerHTML = `
    <h3>Service summary</h3>
    ${items.map((i) => `<div class="summary-row"><span>${i.name}</span><span>${formatPrice(i.lineTotal)}</span></div>`).join('')}
    <div class="summary-row total"><span>Consultancy fee</span><span>${formatPrice(total)}</span></div>
    <p class="disclaimer">Embassy visa fee (e.g. €80/adult) is <strong>not</strong> included.</p>
    <p class="payment-note">${method === 'pay_later'
      ? 'We will email UPI/bank details after you submit.'
      : 'Secure UPI payment via PayMate when configured on the server.'}</p>`;
}

function saveOrderAndRedirect(order) {
  sessionStorage.setItem('schengenease_order', JSON.stringify(order));
  clearCart();
  window.location.href = 'success.html';
}

async function placePayLaterOrder() {
  const data = getCheckoutData();
  const errors = validateCheckoutForm(data);
  const errEl = document.getElementById('checkout-errors');
  if (errors.length) {
    if (errEl) errEl.innerHTML = errors.map((e) => `<p>${e}</p>`).join('');
    return;
  }
  if (errEl) errEl.innerHTML = '';

  const btn = document.getElementById('pay-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  try {
    const res = await fetch('/api/place-pay-later-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: getCart(), customer: data }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Request failed');

    saveOrderAndRedirect({
      transactionId: result.transaction_id,
      amount: getCartTotal(),
      paymentMethod: 'pay_later',
      customer: data,
      items: getCartDetails(),
    });
  } catch (err) {
    alert(err.message);
    if (btn) { btn.disabled = false; updateCheckoutButton(); }
  }
}

async function initiatePaymate() {
  const data = getCheckoutData();
  const errors = validateCheckoutForm(data);
  const errEl = document.getElementById('checkout-errors');
  if (errors.length) {
    if (errEl) errEl.innerHTML = errors.map((e) => `<p>${e}</p>`).join('');
    return;
  }
  if (errEl) errEl.innerHTML = '';

  const btn = document.getElementById('pay-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting to payment...'; }

  try {
    const res = await fetch('/api/paymate/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: getCart(),
        customer: { ...data, address: data.city || 'India', state: 'India', pincode: '201318' },
        payment_method: getPaymentMethod(),
      }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Payment could not be started');

    sessionStorage.setItem('schengenease_pending', JSON.stringify({
      orderId: result.order_id,
      customer: data,
      items: getCartDetails(),
      total: getCartTotal(),
    }));
    window.location.href = result.payment_url;
  } catch (err) {
    alert(err.message + '\n\nTip: choose "Pay later" or configure PayMate keys on the server.');
    if (btn) { btn.disabled = false; updateCheckoutButton(); }
  }
}

function initiatePayment() {
  if (getPaymentMethod() === 'pay_later') return placePayLaterOrder();
  return initiatePaymate();
}

function renderSuccessPage() {
  const raw = sessionStorage.getItem('schengenease_order');
  const el = document.getElementById('success-content');
  if (!el) return;
  if (!raw) {
    el.innerHTML = '<p>No request found. <a href="index.html">Go home</a></p>';
    return;
  }
  const order = JSON.parse(raw);
  const isLater = order.paymentMethod === 'pay_later';
  el.innerHTML = `
    <div class="success-box">
      <div class="success-icon">✓</div>
      <h1>${isLater ? 'Request submitted!' : 'Payment successful!'}</h1>
      <p class="txn-id">Reference: <strong>${order.transactionId}</strong></p>
      <p>Thank you, ${order.customer.name}. We will email you at <strong>${order.customer.email}</strong> within 4 working days.</p>
      <div class="about-card" style="text-align:left;margin:24px 0;">
        ${order.items.map((i) => `<p>${i.name} — ${formatPrice(i.lineTotal)}</p>`).join('')}
        <p><strong>Total consultancy fee: ${formatPrice(order.amount)}</strong></p>
      </div>
      <a href="index.html" class="btn btn-primary">Back to home</a>
    </div>`;
  sessionStorage.removeItem('schengenease_order');
}

function renderInlinePackages() {
  const el = document.getElementById('checkout-packages');
  if (!el) return;
  el.innerHTML = PACKAGES.map((p) => `
    <label class="payment-option" style="cursor:pointer;">
      <input type="checkbox" data-pkg="${p.id}" ${getCart().some((c) => c.id === p.id) ? 'checked' : ''}>
      <span>${p.name} — ${formatPrice(p.price)}</span>
    </label>`).join('');

  el.querySelectorAll('input[data-pkg]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) addToCart(input.dataset.pkg);
      else removeFromCart(input.dataset.pkg);
      renderCheckoutSummary();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderInlinePackages();
  renderCheckoutSummary();
  if (document.getElementById('success-content')) renderSuccessPage();
  document.querySelectorAll('input[name="payment"]').forEach((r) => {
    r.addEventListener('change', () => { updateCheckoutButton(); renderCheckoutSummary(); });
  });
  updateCheckoutButton();
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) payBtn.addEventListener('click', initiatePayment);
});

async function submitAssistForm(formId, type, fieldIds) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById(`${formId}-msg`);
    const customer = {
      name: document.getElementById(`${formId}-name`).value.trim(),
      email: document.getElementById(`${formId}-email`).value.trim(),
      phone: document.getElementById(`${formId}-phone`).value.trim(),
    };
    const fields = {};
    fieldIds.forEach((id) => {
      const el = document.getElementById(`${formId}-${id}`);
      if (el) fields[id.replace(/-/g, ' ')] = el.value.trim();
    });
    try {
      const res = await fetch('/api/assist-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, customer, fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (msg) msg.innerHTML = `<p class="form-msg success">Request received (${data.reference}). We will email you soon.</p>`;
      form.reset();
    } catch (err) {
      if (msg) msg.innerHTML = `<p class="form-msg error">${err.message}</p>`;
    }
  });
}
