const { encryptRequest, decryptPayload } = require('./paymate-crypto');
const { getPaymateConfig } = require('./paymate-config');

function getDetailedSummary(payload) {
  if (Array.isArray(payload?.DetailedSummary)) {
    return payload.DetailedSummary[0] || null;
  }
  return payload?.DetailedSummary || payload?.Response || null;
}

function extractPaymateMessage(payload) {
  const summary = getDetailedSummary(payload);
  const detail = summary?.StatusMessage || summary?.Message;
  const generic = payload?.Description || payload?.ErrorDescription;
  if (detail && generic && /invalid input/i.test(generic)) {
    return detail;
  }
  return (
    generic ||
    detail ||
    payload?.message ||
    payload?.error ||
    null
  );
}

function extractPaymentUrl(payload) {
  const summary = getDetailedSummary(payload);
  const candidates = [
    payload?.Response?.PaymentURL,
    payload?.Response?.PaymentUrl,
    summary?.PaymentURL,
    summary?.PaymentUrl,
    payload?.DetailedSummary?.PaymentURL,
    payload?.DetailedSummary?.PaymentUrl,
    payload?.PaymentURL,
    payload?.PaymentUrl,
    payload?.CheckoutURL,
    payload?.checkoutUrl,
  ];
  return candidates.find((value) => typeof value === 'string' && value.length > 0) || null;
}

function isSuccessPayload(payload) {
  const code = String(
    payload?.StatusCode || payload?.ErrorCode || payload?.statusCode || payload?.errorCode || ''
  );
  if (code === '000' || code === '0') return true;
  if (extractPaymentUrl(payload)) return true;
  const description = String(payload?.Description || payload?.ErrorDescription || '').toLowerCase();
  return description.includes('success');
}

function parsePayMateResponse(rawResponse, config) {
  const decrypted = decryptPayload(rawResponse, config.partnerPrivateKey, config.iv);
  if (decrypted) {
    return decrypted;
  }

  if (rawResponse && typeof rawResponse === 'object') {
    return rawResponse;
  }

  throw new Error('Unexpected PayMate response format');
}

async function callPayMate(plainPayload) {
  const config = getPaymateConfig();
  const encryptedBody = encryptRequest(plainPayload, config.paymatePublicCert, config.iv);

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      MerchantId: config.merchantId,
      TerminalId: config.terminalId,
      BusinessXpressID: config.businessXpressId,
    },
    body: JSON.stringify(encryptedBody),
  });

  const rawText = await response.text();
  let encryptedResponse;
  try {
    encryptedResponse = JSON.parse(rawText);
  } catch {
    throw new Error(`PayMate returned non-JSON response (${response.status})`);
  }

  if (!response.ok && !encryptedResponse.EncryptedData && !encryptedResponse.StatusCode) {
    throw new Error(extractPaymateMessage(encryptedResponse) || `PayMate HTTP ${response.status}`);
  }

  const decrypted = parsePayMateResponse(encryptedResponse, config);
  if (!isSuccessPayload(decrypted)) {
    const message = extractPaymateMessage(decrypted) || 'PayMate rejected the payment request';
    const err = new Error(message);
    err.paymateDetails = decrypted;
    throw err;
  }

  return { decrypted, config };
}

module.exports = {
  callPayMate,
  extractPaymentUrl,
  extractPaymateMessage,
  isSuccessPayload,
  parsePayMateResponse,
};
