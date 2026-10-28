function renderHeader() {
  const nav = [
    { href: 'index.html', label: 'Home' },
    { href: 'visa.html', label: 'Schengen Visa' },
    { href: 'itinerary.html', label: 'Itinerary' },
    { href: 'tickets.html', label: 'Flights' },
    { href: 'stay.html', label: 'Stay' },
    { href: 'faq.html', label: 'FAQ' },
    { href: 'about.html', label: 'About' },
    { href: 'contact.html', label: 'Contact' },
  ];
  const links = nav.map((n) => `<a href="${n.href}" class="nav-link">${n.label}</a>`).join('');

  return `
  <header class="site-header">
    <div class="header-top">
      <div class="container header-top-inner">
        <span>📞 <a href="tel:${SITE.phone}">${SITE.phoneDisplay}</a></span>
        <span>✉️ <a href="mailto:${SITE.email}">${SITE.email}</a></span>
        <span>🌍 One visa · 27 Schengen countries</span>
      </div>
    </div>
    <div class="container header-main">
      <a href="index.html" class="logo">Schengen<span>Ease</span></a>
      <nav class="main-nav" id="main-nav">${links}</nav>
      <div class="header-actions">
        <a href="checkout.html" class="cart-link">Services <span class="cart-badge">0</span></a>
        <button class="menu-toggle" id="menu-toggle" aria-label="Menu">☰</button>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-col">
        <a href="index.html" class="logo footer-logo">Schengen<span>Ease</span></a>
        <p>${SITE.tagline}. We are an independent consultancy — not a government website. Embassy fees are paid separately.</p>
        <p class="footer-contact">
          <strong>Email:</strong> <a href="mailto:${SITE.email}">${SITE.email}</a><br>
          <strong>Phone:</strong> <a href="tel:${SITE.phone}">${SITE.phoneDisplay}</a><br>
          <strong>Address:</strong> ${SITE.address}
        </p>
      </div>
      <div class="footer-col">
        <h4>Services</h4>
        <ul>
          <li><a href="visa.html">Visa assistance</a></li>
          <li><a href="itinerary.html">Itinerary planning</a></li>
          <li><a href="tickets.html">Flight guidance</a></li>
          <li><a href="stay.html">Accommodation</a></li>
          <li><a href="checkout.html">Pay consultancy fee</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="about.html">About</a></li>
          <li><a href="faq.html">FAQ</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <ul>
          <li><a href="terms.html">Terms</a></li>
          <li><a href="privacy.html">Privacy</a></li>
          <li><a href="refund.html">Refund policy</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container">
        <p>© ${new Date().getFullYear()} ${SITE.name}. All rights reserved.</p>
      </div>
    </div>
  </footer>`;
}

function injectLayout() {
  const headerSlot = document.getElementById('site-header');
  const footerSlot = document.getElementById('site-footer');
  if (headerSlot) headerSlot.innerHTML = renderHeader();
  if (footerSlot) footerSlot.innerHTML = renderFooter();

  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
  updateCartBadge();
}

function initFAQ() {
  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

function renderPackageCards(containerId, options = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = PACKAGES.map((pkg) => `
    <article class="package-card ${pkg.featured ? 'featured' : ''}">
      ${pkg.featured ? '<span class="package-badge">Best value</span>' : ''}
      <h3>${pkg.name}</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);">${pkg.duration}</p>
      <div class="price">${formatPrice(pkg.price)}</div>
      <ul>${pkg.tasks.map((t) => `<li>${t}</li>`).join('')}</ul>
      <button type="button" class="btn btn-primary" data-add="${pkg.id}">Add to checkout</button>
      ${options.showLinks ? `<a href="${linkForPackage(pkg.id)}" class="btn btn-outline btn-sm" style="margin-top:8px;">Learn more</a>` : ''}
    </article>`).join('');

  el.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (addToCart(btn.dataset.add)) {
        btn.textContent = 'Added ✓';
        setTimeout(() => { btn.textContent = 'Add to checkout'; }, 1500);
      }
    });
  });
}

function linkForPackage(id) {
  const map = { 'visa-assist': 'visa.html', itinerary: 'itinerary.html', tickets: 'tickets.html', stay: 'stay.html', bundle: 'checkout.html' };
  return map[id] || 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  injectLayout();
  initFAQ();
  if (document.getElementById('home-packages')) renderPackageCards('home-packages');
});
