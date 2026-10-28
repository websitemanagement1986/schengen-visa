const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function normalizePem(value) {
  if (!value) return '';

  let pem = String(value).trim();
  if (pem.charCodeAt(0) === 0xfeff) pem = pem.slice(1);

  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1).trim();
  }

  pem = pem.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (pem.includes('-----BEGIN') && pem.includes('-----END')) {
    const beginMatch = pem.match(/-----BEGIN [A-Z0-9 ]+-----/);
    const endMatch = pem.match(/-----END [A-Z0-9 ]+-----/);
    if (beginMatch && endMatch) {
      const begin = beginMatch[0];
      const end = endMatch[0];
      const start = pem.indexOf(begin) + begin.length;
      const endIdx = pem.indexOf(end);
      const body = pem.slice(start, endIdx).replace(/\s+/g, '');
      if (body) {
        const lines = body.match(/.{1,64}/g) || [];
        pem = `${begin}\n${lines.join('\n')}\n${end}`;
      }
    }
  }

  return `${pem.trim()}\n`;
}

function validatePrivateKey(pem, label) {
  try {
    crypto.createPrivateKey(pem);
    return true;
  } catch (err) {
    const hasBegin = pem.includes('-----BEGIN');
    const hasEnd = pem.includes('-----END');
    throw new Error(
      `${label} is invalid. Ensure you pasted partner_private.pem (not partner_public.txt). ` +
        `BEGIN marker: ${hasBegin}, END marker: ${hasEnd}. ${err.message}`
    );
  }
}

function validateCertificate(pem, label) {
  try {
    crypto.createPublicKey(pem);
    return true;
  } catch (err) {
    throw new Error(`${label} is invalid: ${err.message}`);
  }
}

function resolveExistingPath(candidates) {
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function decodeBase64Pem(value, label) {
  if (!value) return '';
  const cleaned = String(value).trim().replace(/\s+/g, '');
  if (!cleaned) return '';
  try {
    return normalizePem(Buffer.from(cleaned, 'base64').toString('utf8'));
  } catch (err) {
    throw new Error(`${label} base64 decode failed: ${err.message}`);
  }
}

function loadPartnerPrivateKey(appRoot) {
  const b64 = process.env.PAYMATE_PARTNER_PRIVATE_KEY_B64;
  if (b64) {
    const pem = decodeBase64Pem(b64, 'Partner private key');
    validatePrivateKey(pem, 'Partner private key');
    return { pem, source: 'PAYMATE_PARTNER_PRIVATE_KEY_B64' };
  }

  const pem = loadPem({
    label: 'Partner private key',
    inlineEnv: process.env.PAYMATE_PARTNER_PRIVATE_KEY,
    pathEnv: process.env.PAYMATE_PARTNER_PRIVATE_KEY_PATH,
    defaultRelativePaths: ['ssl-pg-partner/partner_private.pem'],
    appRoot,
    kind: 'private',
  });

  const source = process.env.PAYMATE_PARTNER_PRIVATE_KEY
    ? 'PAYMATE_PARTNER_PRIVATE_KEY env'
    : process.env.PAYMATE_PARTNER_PRIVATE_KEY_PATH || 'ssl-pg-partner/partner_private.pem file';

  return { pem, source };
}

function loadPem({ label, inlineEnv, pathEnv, defaultRelativePaths, appRoot, kind = 'any' }) {
  const inline = normalizePem(inlineEnv);
  let pem = inline;

  if (!pem) {
    const candidates = [];
    if (pathEnv) {
      candidates.push(pathEnv);
      if (!path.isAbsolute(pathEnv)) {
        candidates.push(path.join(process.cwd(), pathEnv));
        candidates.push(path.join(appRoot, pathEnv));
      }
    }

    for (const relativePath of defaultRelativePaths) {
      candidates.push(path.join(appRoot, relativePath));
      candidates.push(path.join(process.cwd(), relativePath));
    }

    const resolvedPath = resolveExistingPath(candidates);
    if (!resolvedPath) {
      throw new Error(
        `${label} not found. Upload the file or set ${label} env content. Tried: ${[...new Set(candidates)].join(' | ')} | cwd=${process.cwd()} | appRoot=${appRoot}`
      );
    }

    pem = normalizePem(fs.readFileSync(resolvedPath, 'utf8'));
  }

  if (kind === 'private') validatePrivateKey(pem, label);
  if (kind === 'certificate') validateCertificate(pem, label);
  return pem;
}

function paymateV1CollectEndpoint(endpoint) {
  return endpoint.replace(/\/api\/v\d+\/CollectPayments$/i, '/api/v1/CollectPayments');
}

function paymateV2CollectEndpoint(endpoint) {
  return endpoint.replace(/\/api\/v\d+\/CollectPayments$/i, '/api/v2/CollectPayments');
}

function resolveCollectEndpoint(rawEndpoint) {
  const base = String(rawEndpoint || '').trim();
  const version = (process.env.PAYMATE_API_VERSION || '').trim().toLowerCase();
  if (version === 'v1') return paymateV1CollectEndpoint(base);
  if (version === 'v2') return paymateV2CollectEndpoint(base);
  return base;
}

function getPaymateConfig() {
  const appRoot = path.join(__dirname, '..', '..');
  const merchantId = (process.env.PAYMATE_MERCHANT_ID || '').trim();
  const terminalId = (process.env.PAYMATE_TERMINAL_ID || '').trim();
  const businessXpressId = (process.env.PAYMATE_BUSINESS_XPRESS_ID || '').trim();
  const iv = (process.env.PAYMATE_IV || '54327CD65487ECAB').trim();
  const rawEndpoint =
    process.env.PAYMATE_ENDPOINT ||
    'https://paymate.in/PaymatePartnerStack/api/v2/CollectPayments';
  const endpoint = resolveCollectEndpoint(rawEndpoint);
  const endpointV1 = paymateV1CollectEndpoint(rawEndpoint);
  const endpointV2 = paymateV2CollectEndpoint(rawEndpoint);
  const apiVersion = endpoint.includes('/api/v1/') ? 'v1' : 'v2';
  const siteUrl = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

  if (!merchantId || !terminalId || !businessXpressId) {
    throw new Error(
      'PayMate not configured. Set PAYMATE_MERCHANT_ID, PAYMATE_TERMINAL_ID, and PAYMATE_BUSINESS_XPRESS_ID.'
    );
  }

  const paymatePublicCert = loadPem({
    label: 'PayMate public certificate',
    inlineEnv: process.env.PAYMATE_PUBLIC_CERT,
    pathEnv: process.env.PAYMATE_PUBLIC_CERT_PATH,
    defaultRelativePaths: ['certs/paymate-public.cer'],
    appRoot,
    kind: 'certificate',
  });

  const partner = loadPartnerPrivateKey(appRoot);

  const referenceCodeEnv = process.env.PAYMATE_REFERENCE_CODE;
  const referenceCode =
    referenceCodeEnv === undefined ? 'FOMINO01' : referenceCodeEnv.trim();

  return {
    merchantId,
    terminalId,
    businessXpressId,
    iv,
    endpoint,
    endpointV1,
    endpointV2,
    apiVersion,
    siteUrl,
    paymatePublicCert,
    partnerPrivateKey: partner.pem,
    partnerPrivateKeySource: partner.source,
    companyName: (process.env.PAYMATE_COMPANY_NAME || 'SchengenEase').trim(),
    referenceCode,
    targetApp: (process.env.PAYMATE_TARGET_APP || 'GPAY').trim(),
    deviceOS: (process.env.PAYMATE_DEVICE_OS || 'ANDROID').trim(),
  };
}

module.exports = {
  getPaymateConfig,
  paymateV1CollectEndpoint,
  paymateV2CollectEndpoint,
  resolveCollectEndpoint,
};
