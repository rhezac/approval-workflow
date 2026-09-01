/**
 * ============================================================================
 * CLI SCRIPT: Encrypt or Decrypt values for .env configuration
 * ============================================================================
 * Usage:
 *   node scripts/crypto-cli.js encrypt <plainText>
 *   node scripts/crypto-cli.js decrypt <enc:...>
 * ============================================================================
 */
const crypto = require('crypto');

const DEFAULT_KEY_SEED = process.env.APP_ENCRYPTION_KEY || 'app_secret_aes256_encryption_master_key_2025_workflow';
const ALGORITHM = 'aes-256-gcm';

function getDerivedKey(customKey) {
  const secret = customKey || DEFAULT_KEY_SEED;
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptValue(plainText) {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptValue(val) {
  if (!val || !val.startsWith('enc:')) return val;
  const parts = val.split(':');
  if (parts.length !== 4) return val;

  const [, ivHex, authTagHex, encryptedHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

const action = process.argv[2];
const text = process.argv[3];

if (action === 'encrypt' && text) {
  console.log('\n--- ENCRYPTION RESULT ---');
  console.log('Encrypted Value:');
  console.log(encryptValue(text));
  console.log('-------------------------\n');
} else if (action === 'decrypt' && text) {
  console.log('\n--- DECRYPTION RESULT ---');
  console.log('Decrypted Value:');
  console.log(decryptValue(text));
  console.log('-------------------------\n');
} else {
  console.log('\nUsage:');
  console.log('  node scripts/crypto-cli.js encrypt <secretText>');
  console.log('  node scripts/crypto-cli.js decrypt <enc:...>\n');
}
