const PAYMATE_METHODS = {
  upi: {
    label: 'UPI',
    PaymentMode: 'UPI',
    PaymentType: 'Intent',
  },
  debit: {
    label: 'Debit Card',
    PaymentMode: 'DebitCard',
    PaymentType: 'Card',
  },
  netbanking: {
    label: 'Net Banking',
    PaymentMode: 'NetBanking',
    PaymentType: 'Banking',
  },
};

const DEFAULT_METHOD = 'upi';

function resolvePaymateMethod(method) {
  const key = String(method || DEFAULT_METHOD).toLowerCase();
  const entry = PAYMATE_METHODS[key];
  if (!entry) {
    throw new Error(`Unsupported payment method: ${method}`);
  }
  return { key, ...entry };
}

module.exports = {
  PAYMATE_METHODS,
  DEFAULT_METHOD,
  resolvePaymateMethod,
};
