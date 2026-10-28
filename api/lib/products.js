const PACKAGES = [
  { id: 'visa-assist', name: 'Visa file assistance', price: 2999 },
  { id: 'itinerary', name: 'Itinerary planning', price: 999 },
  { id: 'tickets', name: 'Ticket booking guidance', price: 499 },
  { id: 'stay', name: 'Accommodation guidance', price: 499 },
  { id: 'bundle', name: 'Complete Europe bundle (all four services)', price: 3999 },
];

function validateCart(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error('No service selected');
  }

  const items = [];
  let subtotal = 0;

  for (const entry of cart) {
    const pkg = PACKAGES.find((p) => p.id === entry.id);
    if (!pkg) throw new Error(`Unknown service: ${entry.id}`);
    const qty = Number(entry.qty);
    if (!qty || qty < 1 || qty > 5) throw new Error(`Invalid quantity for ${pkg.name}`);
    const lineTotal = pkg.price * qty;
    items.push({ id: pkg.id, name: pkg.name, price: pkg.price, qty, lineTotal });
    subtotal += lineTotal;
  }

  if (subtotal <= 0) throw new Error('Invalid order total');

  const deliveryCharge = 0;
  const total = subtotal;

  return { items, subtotal, deliveryCharge, total, amountPaise: Math.round(total * 100) };
}

module.exports = { PACKAGES, validateCart };
