const crypto = require('crypto');

const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateRandomKey(length = 32) {
  const bytes = crypto.randomBytes(length);
  let key = '';
  for (let i = 0; i < length; i += 1) {
    key += KEY_CHARS[bytes[i] % KEY_CHARS.length];
  }
  return key;
}

function getIvBuffer(ivValue) {
  const iv = Buffer.from(ivValue, 'utf8');
  if (iv.length !== 16) {
    throw new Error('PayMate IV must be exactly 16 bytes');
  }
  return iv;
}

function encryptRequest(plainObject, paymatePublicCertPem, ivValue) {
  const iv = getIvBuffer(ivValue);
  const randomKey = generateRandomKey(32);
  const plainJson = JSON.stringify(plainObject);

  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(randomKey, 'utf8'), iv);
  const encrypted = Buffer.concat([cipher.update(plainJson, 'utf8'), cipher.final()]);
  const encryptedData = encrypted.toString('hex').toUpperCase();

  const encryptedRandomKey = crypto
    .publicEncrypt(
      {
        key: paymatePublicCertPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(randomKey, 'utf8')
    )
    .toString('base64');

  return { EncryptedRandomKey: encryptedRandomKey, EncryptedData: encryptedData };
}

function normalizeEncryptedFields(body) {
  if (!body || typeof body !== 'object') {
    return { EncryptedRandomKey: null, EncryptedData: null };
  }

  const entries = Object.entries(body);
  const find = (name) => {
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return match ? match[1] : null;
  };

  return {
    EncryptedRandomKey: find('EncryptedRandomKey'),
    EncryptedData: find('EncryptedData'),
  };
}

function decryptPayload(body, partnerPrivateKeyPem, ivValue) {
  const { EncryptedRandomKey, EncryptedData } = normalizeEncryptedFields(body);
  if (!EncryptedRandomKey || !EncryptedData) {
    return null;
  }

  const iv = getIvBuffer(ivValue);
  const randomKey = crypto
    .privateDecrypt(
      {
        key: partnerPrivateKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(EncryptedRandomKey, 'base64')
    )
    .toString('utf8');

  const encryptedBuffer = Buffer.from(EncryptedData, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(randomKey, 'utf8'), iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = {
  generateRandomKey,
  encryptRequest,
  decryptPayload,
};
