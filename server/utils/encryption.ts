/**
 * Encryption Utility
 * 
 * AES-256-GCM encryption/decryption for storing sensitive values
 * (API keys, passwords) in the database.
 * 
 * Uses SESSION_SECRET (or a dedicated ENCRYPTION_KEY) to derive the key.
 * Each encrypted value includes a random IV and auth tag, stored as:
 *   "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;   // 128-bit IV for GCM
const KEY_LENGTH = 32;  // 256-bit key
const TAG_LENGTH = 16;  // 128-bit auth tag
const PREFIX = 'enc:v1:';

/**
 * Derive a 256-bit key from an arbitrary-length secret using SHA-256.
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Get the encryption secret. Checks ENCRYPTION_KEY first, then SESSION_SECRET.
 * Throws if neither is set.
 */
function getSecret(): string {
  const secret = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'No encryption key available. Set ENCRYPTION_KEY or SESSION_SECRET environment variable.'
    );
  }
  return secret;
}

/**
 * Encrypt a plaintext string.
 * Returns a prefixed string: "enc:v1:<iv>:<tag>:<ciphertext>"
 * Returns null/empty for null/empty input.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  
  const key = deriveKey(getSecret());
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a value that was encrypted with encrypt().
 * If the value doesn't start with the expected prefix, returns it as-is
 * (backward compatibility with unencrypted values).
 * Returns null for null/empty input.
 */
export function decrypt(encryptedValue: string | null | undefined): string | null {
  if (!encryptedValue) return null;
  
  // If it doesn't have our prefix, it's a plaintext/legacy value — return as-is
  if (!encryptedValue.startsWith(PREFIX)) {
    return encryptedValue;
  }
  
  try {
    const key = deriveKey(getSecret());
    const parts = encryptedValue.slice(PREFIX.length).split(':');
    
    if (parts.length !== 3) {
      console.warn('Invalid encrypted value format, returning null');
      return null;
    }
    
    const [ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', (error as Error).message);
    return null;
  }
}

/**
 * Check if a value is encrypted (starts with our prefix).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX);
}

/**
 * Encrypt a value only if it's not already encrypted.
 */
export function ensureEncrypted(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isEncrypted(value)) return value;
  return encrypt(value);
}
