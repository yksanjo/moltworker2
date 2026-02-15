/**
 * Tests for Moltbook Agent Privacy Layer - Cryptographic Utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateKeyPair,
  deriveSharedSecret,
  generateNonce,
  encryptMessage,
  decryptMessage,
  generateChannelKey,
  exportChannelKey,
  importChannelKey,
  generateId,
  sha256,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  createMessageEnvelope,
} from './crypto';
import type { MessageContent } from './types';

describe('crypto utilities', () => {
  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('applies prefix when provided', () => {
      const id = generateId('test');

      expect(id).toMatch(/^test-[a-f0-9]{32}$/);
    });
  });

  describe('sha256', () => {
    it('hashes strings consistently', async () => {
      const hash1 = await sha256('hello');
      const hash2 = await sha256('hello');

      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', async () => {
      const hash1 = await sha256('hello');
      const hash2 = await sha256('world');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('base64 encoding', () => {
    it('roundtrips correctly', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]);
      const encoded = arrayBufferToBase64(original.buffer);
      const decoded = new Uint8Array(base64ToArrayBuffer(encoded));

      expect(decoded).toEqual(original);
    });

    it('handles empty arrays', () => {
      const original = new Uint8Array([]);
      const encoded = arrayBufferToBase64(original.buffer);
      const decoded = new Uint8Array(base64ToArrayBuffer(encoded));

      expect(decoded).toEqual(original);
    });
  });

  describe('generateNonce', () => {
    it('generates 12-byte nonces', () => {
      const nonce = generateNonce();

      expect(nonce).toBeInstanceOf(Uint8Array);
      expect(nonce.length).toBe(12);
    });

    it('generates unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      expect(arrayBufferToBase64(nonce1.buffer)).not.toBe(
        arrayBufferToBase64(nonce2.buffer)
      );
    });
  });

  describe('createMessageEnvelope', () => {
    it('creates valid message envelope', () => {
      const envelope = createMessageEnvelope(
        'channel-123',
        'did:moltbook:abc123',
        'encrypted-data',
        'nonce-base64'
      );

      expect(envelope.id).toMatch(/^msg-[a-f0-9]{32}$/);
      expect(envelope.channelId).toBe('channel-123');
      expect(envelope.sender).toBe('did:moltbook:abc123');
      expect(envelope.ciphertext).toBe('encrypted-data');
      expect(envelope.nonce).toBe('nonce-base64');
      expect(envelope.timestamp).toBeGreaterThan(0);
    });

    it('includes ephemeral public key when provided', () => {
      const envelope = createMessageEnvelope(
        'channel-123',
        'did:moltbook:abc123',
        'encrypted-data',
        'nonce-base64',
        'ephemeral-key'
      );

      expect(envelope.ephemeralPubKey).toBe('ephemeral-key');
    });
  });
});

describe('key generation and encryption (requires Web Crypto)', () => {
  // Note: These tests require a runtime with Web Crypto API
  // They may be skipped in some test environments

  describe('generateKeyPair', () => {
    it('generates valid key pair', async () => {
      // Skip if X25519 not available
      try {
        const keyPair = await generateKeyPair();

        expect(keyPair.publicKey).toBeDefined();
        expect(keyPair.privateKey).toBeDefined();
        expect(typeof keyPair.publicKey).toBe('string');
        expect(typeof keyPair.privateKey).toBe('string');
      } catch (e: any) {
        if (e.message?.includes('X25519') || e.name === 'NotSupportedError') {
          console.log('X25519 not available, skipping test');
          return;
        }
        throw e;
      }
    });
  });

  describe('channel key operations', () => {
    it('generates and exports channel key', async () => {
      const key = await generateChannelKey();
      const exported = await exportChannelKey(key);

      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);
    });

    it('imports channel key correctly', async () => {
      const key = await generateChannelKey();
      const exported = await exportChannelKey(key);
      const imported = await importChannelKey(exported);

      expect(imported).toBeDefined();
    });

    it('encrypts and decrypts with channel key', async () => {
      const key = await generateChannelKey();
      const nonce = generateNonce();
      const content: MessageContent = {
        type: 'text',
        text: 'Hello, encrypted world!',
      };

      const { ciphertext, nonce: nonceBase64 } = await encryptMessage(
        content,
        key,
        nonce
      );

      expect(ciphertext).toBeDefined();
      expect(nonceBase64).toBe(arrayBufferToBase64(nonce.buffer));

      const decrypted = await decryptMessage(ciphertext, nonceBase64, key);

      expect(decrypted).toEqual(content);
    });
  });
});
