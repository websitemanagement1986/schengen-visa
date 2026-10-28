function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function renderSuccess(order) {
  const el = document.getElementById('paymate-return-content');
  if (!el) return;

  clearCart();
  sessionStorage.removeItem('schengenease_pending');

  el.innerHTML = `
    <div class="success-icon">✓</div>
    <h1>Payment successful</h1>
    <p class="txn-id">Reference: <strong>${order.transaction_id}</strong></p>
    <p>Thank you, ${order.customer.name}! Confirmation sent to <strong>${order.customer.email}</strong>.</p>
    <div class="about-card" style="text-align:left;margin:24px 0;">
      ${order.items.map((i) => `<p>${i.name} — ₹${i.lineTotal.toLocaleString('en-IN')}</p>`).join('')}
      <p><strong>Total: ₹${Number(order.amount).toLocaleString('en-IN')}</strong></p>
    </div>
    <p>For support: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
    <a href="index.html" class="btn btn-primary">Back to home</a>`;
}

function renderPending(message) {
  const el = document.getElementById('paymate-return-content');
  if (!el) return;
  el.innerHTML = `
    <h1>Payment pending</h1>
    <p>${message}</p>
    <button id="retry-status" class="btn btn-primary">Check again</button>
    <a href="checkout.html" class="btn btn-outline" style="margin-left:12px;">Checkout</a>`;
  document.getElementById('retry-status')?.addEventListener('click', checkPaymentStatus);
}

function renderFailure(message) {
  const el = document.getElementById('paymate-return-content');
  if (!el) return;
  el.innerHTML = `
    <h1>Payment failed</h1>
    <p>${message}</p>
    <a href="checkout.html" class="btn btn-primary">Try again</a>`;
}

async function checkPaymentStatus() {
  const orderId = getQueryParam('orderId');
  const el = document.getElementById('paymate-return-content');
  if (!orderId) {
    renderFailure('Missing order reference in return URL.');
    return;
  }

  if (el) el.innerHTML = '<p>Checking your payment status...</p>';

  try {
    const res = await fetch(`/api/paymate/status?orderId=${encodeURIComponent(orderId)}`);
    const data = await res.json();

    if (res.ok && data.success && data.status === 'paid') {
      const pendingRaw = sessionStorage.getItem('schengenease_pending');
      const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
      renderSuccess({
        transaction_id: data.transaction_id,
        amount: data.amount,
        customer: data.customer || pending?.customer,
        items: data.items || pending?.items || [],
      });
      return;
    }

    if (data.status === 'failed') {
      renderFailure(data.message || 'Payment could not be completed.');
      return;
    }

    renderPending(data.message || 'Payment is still processing.');
  } catch (err) {
    renderFailure(err.message || 'Unable to verify payment status.');
  }
}

document.addEventListener('DOMContentLoaded', checkPaymentStatus);
