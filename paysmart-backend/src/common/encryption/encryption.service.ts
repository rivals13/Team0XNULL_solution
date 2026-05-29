import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM  = 'aes-256-gcm';
const IV_LENGTH  = 12;   // 96-bit IV recommended for GCM
const KEY_BYTES  = 32;   // 256-bit key

/**
 * EncryptionService — AES-256-GCM field-level encryption.
 *
 * Encrypted format:  {iv_hex}:{authTag_hex}:{ciphertext_hex}
 *
 * Backwards-compatible: decrypt() returns plaintext unchanged
 * if the value doesn't match the encrypted format.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly logger = new Logger(EncryptionService.name);
  private readonly ready: boolean;

  constructor() {
    const raw = process.env.ENCRYPTION_KEY ?? '';
    if (!raw || raw.length < KEY_BYTES * 2) {
      this.logger.warn(
        '[Encryption] ENCRYPTION_KEY missing or too short — field encryption disabled',
      );
      this.key   = crypto.randomBytes(KEY_BYTES); // ephemeral fallback (won't persist)
      this.ready = false;
    } else {
      this.key   = Buffer.from(raw, 'hex');
      this.ready = true;
      this.logger.log('[Encryption] AES-256-GCM field encryption initialised');
    }
  }

  get isReady(): boolean { return this.ready; }

  // ─── Encrypt ─────────────────────────────────────────────────────────────────

  encrypt(text: string): string {
    if (!text || !this.ready) return text;

    const iv     = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    let encrypted  = cipher.update(text, 'utf8', 'hex');
    encrypted     += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  // ─── Decrypt ─────────────────────────────────────────────────────────────────

  decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;

    // Backwards-compatible: plain-text values (not in encrypted format) pass through
    if (!encryptedData.includes(':')) return encryptedData;

    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData;   // not our format

    try {
      const iv        = Buffer.from(parts[0], 'hex');
      const authTag   = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted  = decipher.update(encrypted, 'hex', 'utf8');
      decrypted     += decipher.final('utf8');
      return decrypted;
    } catch {
      // Decryption failed — return original (backwards-compatible path)
      return encryptedData;
    }
  }

  // ─── Nullable helpers ─────────────────────────────────────────────────────────

  encryptNullable(text: string | null | undefined): string | null {
    if (text == null) return null;
    return this.encrypt(text);
  }

  decryptNullable(text: string | null | undefined): string | null {
    if (text == null) return null;
    return this.decrypt(text);
  }
}
