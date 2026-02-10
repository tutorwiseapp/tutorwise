/**
 * Filename: apps/web/src/lib/calendar/encryption.ts
 * Purpose: Encrypt/decrypt calendar tokens for secure storage
 * Created: 2026-02-06
 *
 * Uses AES-256-GCM encryption to protect OAuth tokens in the database.
 * Requires CALENDAR_ENCRYPTION_KEY environment variable (32-byte hex string).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const _AUTH_TAG_LENGTH = 16; // GCM authentication tag length

/**
 * Get encryption key from environment variable
 * The key should be a 32-byte (64 hex characters) string
 *
 * To generate a new key, run:
 * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CALENDAR_ENCRYPTION_KEY;

  if (!key) {
    // In development, allow unencrypted storage with warning
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Calendar Encryption] WARNING: CALENDAR_ENCRYPTION_KEY not set. ' +
        'Tokens will be stored UNENCRYPTED. This is only acceptable in development.'
      );
      return Buffer.alloc(32); // Zero-filled key for dev (insecure but functional)
    }

    throw new Error(
      'CALENDAR_ENCRYPTION_KEY environment variable is required for production. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  const keyBuffer = Buffer.from(key, 'hex');

  if (keyBuffer.length !== 32) {
    throw new Error(
      'CALENDAR_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters). ' +
      'Current length: ' + keyBuffer.length + ' bytes'
    );
  }

  return keyBuffer;
}

/**
 * Encrypt a token for storage
 *
 * Format: iv:authTag:encryptedData (all hex-encoded)
 * Example: "a1b2c3...d4e5:f6g7h8...i9j0:k1l2m3...n4o5"
 */
export function encryptToken(token: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[Calendar Encryption] Encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a token from storage
 *
 * @param encryptedToken - Format: "iv:authTag:encryptedData"
 * @returns Decrypted token string
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const key = getEncryptionKey();

    // Parse the encrypted token format
    const parts = encryptedToken.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, authTagHex, encryptedData] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Calendar Encryption] Decryption failed:', error);
    throw new Error('Failed to decrypt token. Token may be corrupted or encryption key changed.');
  }
}

/**
 * Check if a token is encrypted (contains colons in the expected format)
 */
export function isTokenEncrypted(token: string): boolean {
  const parts = token.split(':');
  return parts.length === 3 && parts.every(part => /^[a-f0-9]+$/i.test(part));
}

/**
 * Safely encrypt a token, returning original if already encrypted
 */
export function safeEncrypt(token: string): string {
  if (isTokenEncrypted(token)) {
    return token; // Already encrypted
  }
  return encryptToken(token);
}

/**
 * Safely decrypt a token, returning original if not encrypted
 * Useful for backwards compatibility during migration
 */
export function safeDecrypt(token: string): string {
  if (!isTokenEncrypted(token)) {
    console.warn('[Calendar Encryption] Token is not encrypted. This is only acceptable during migration.');
    return token; // Not encrypted - return as-is
  }
  return decryptToken(token);
}
