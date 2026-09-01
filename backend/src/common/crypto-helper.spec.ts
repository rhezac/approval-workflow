import { encryptValue, decryptValue } from './crypto-helper';

describe('CryptoHelper (AES-256-GCM Environment Encryption)', () => {
  const plainText = 'super_secret_database_password_123';

  it('should encrypt a plaintext string to an enc: format token', () => {
    const encrypted = encryptValue(plainText);
    expect(encrypted).toBeDefined();
    expect(encrypted.startsWith('enc:')).toBe(true);

    const parts = encrypted.split(':');
    expect(parts).toHaveLength(4); // 'enc', iv, authTag, ciphertext
  });

  it('should successfully decrypt an enc: formatted token back to original plaintext', () => {
    const encrypted = encryptValue(plainText);
    const decrypted = decryptValue(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should return plaintext as-is if the input is not encrypted', () => {
    const raw = 'ordinary_unencrypted_password';
    const result = decryptValue(raw);
    expect(result).toBe(raw);
  });

  it('should handle empty or undefined inputs gracefully', () => {
    expect(decryptValue(undefined)).toBe('');
    expect(decryptValue('')).toBe('');
    expect(encryptValue('')).toBe('');
  });

  it('should work with custom encryption keys', () => {
    const customKey = 'custom_company_rotation_master_key_9999';
    const encrypted = encryptValue(plainText, customKey);
    const decrypted = decryptValue(encrypted, customKey);
    expect(decrypted).toBe(plainText);
  });
});
