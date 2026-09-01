import * as crypto from 'crypto';

/**
 * ============================================================================
 * SECURE ENVIRONMENT VARIABLE ENCRYPTION & DECRYPTION UTILITY
 * ============================================================================
 * Uses standard AES-256-GCM authenticated encryption.
 * Encrypted strings format: "enc:iv:authTag:encryptedHex"
 * 
 * If a plain text password is provided, it automatically falls back cleanly.
 * ============================================================================
 */

// Fallback application encryption key (Can be overridden via APP_ENCRYPTION_KEY env var)
const DEFAULT_KEY_SEED = 'app_secret_aes256_encryption_master_key_2025_workflow';
const ALGORITHM = 'aes-256-gcm';

function getDerivedKey(customKey?: string): Buffer {
  const secret = customKey || process.env.APP_ENCRYPTION_KEY || DEFAULT_KEY_SEED;
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plain text string to an encrypted token: "enc:iv:authTag:ciphertext"
 */
export function encryptValue(plainText: string, customKey?: string): string {
  if (!plainText) return plainText;
  const key = getDerivedKey(customKey);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted token or return value as-is if plain text.
 */
export function decryptValue(val: string | undefined, customKey?: string): string {
  if (!val) return '';
  if (!val.startsWith('enc:')) {
    // If not encrypted, return plain text directly
    return val;
  }

  try {
    const parts = val.split(':');
    if (parts.length !== 4) return val;

    const [, ivHex, authTagHex, encryptedHex] = parts;
    const key = getDerivedKey(customKey);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err: any) {
    console.error('Failed to decrypt environment variable, falling back to original value:', err.message);
    return val;
  }
}
