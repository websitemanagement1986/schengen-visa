const CART_KEY = 'schengenease_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(packageId, qty = 1) {
  const pkg = getPackage(packageId);
  if (!pkg) {
    alert('Service not found.');
    return false;
  }
  const cart = getCart();
  const existing = cart.find((i) => i.id === packageId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: packageId, qty });
  }
  saveCart(cart);
  return true;
}

function removeFromCart(packageId) {
  saveCart(getCart().filter((i) => i.id !== packageId));
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function getCartTotal() {
  return getCart().reduce((sum, item) => {
    const p = getPackage(item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function getCartDetails() {
  return getCart().map((item) => {
    const pkg = getPackage(item.id);
    return {
      id: item.id,
      name: pkg.name,
      price: pkg.price,
      qty: item.qty,
      lineTotal: pkg.price * item.qty,
    };
  });
}

function updateCartBadge() {
  document.querySelectorAll('.cart-badge').forEach((el) => {
    const count = getCartCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
