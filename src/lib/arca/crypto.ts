import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ARCA_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ARCA_ENCRYPTION_KEY environment variable is not set');
  }
  if (keyHex.length !== 64) {
    throw new Error('ARCA_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts data using AES-256-CBC.
 * Returns base64-encoded string containing IV + encrypted data.
 */
export function encryptData(data: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Prepend IV to encrypted data and encode as base64
  const result = Buffer.concat([iv, encrypted]);
  return result.toString('base64');
}

/**
 * Decrypts data previously encrypted with encryptData.
 * Expects base64-encoded string containing IV + encrypted data.
 */
export function decryptData(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');

  if (combined.length < IV_LENGTH + 1) {
    throw new Error('Invalid encrypted data: too short');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}
