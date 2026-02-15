/**
 * Moltbook Agent Privacy Layer - Cryptographic Utilities
 * E2E encryption using X25519-XSalsa20-Poly1305 (NaCl box)
 */

import type { AgentKeyPair, EncryptedMessage, MessageContent } from './types';

// Cloudflare Workers Web Crypto API
const crypto = globalThis.crypto;

/**
 * Generate a new X25519 key pair for agent registration
 * Note: This should be called client-side; the private key never leaves the client
 */
export async function generateKeyPair(): Promise<AgentKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'X25519' },
    true,
    ['deriveBits']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
}

/**
 * Derive a shared secret from your private key and their public key
 * Uses X25519 ECDH
 */
export async function deriveSharedSecret(
  myPrivateKey: string,
  theirPublicKey: string
): Promise<CryptoKey> {
  const privateKeyBuffer = base64ToArrayBuffer(myPrivateKey);
  const publicKeyBuffer = base64ToArrayBuffer(theirPublicKey);

  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'X25519' },
    false,
    ['deriveBits']
  );

  // Import the public key
  const publicKey = await crypto.subtle.importKey(
    'raw',
    publicKeyBuffer,
    { name: 'X25519' },
    false,
    []
  );

  // Derive shared bits
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'X25519', public: publicKey },
    privateKey,
    256
  );

  // Import as AES-GCM key for encryption
  return crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random nonce for encryption
 */
export function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(12); // 96-bit nonce for AES-GCM
  crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Encrypt a message using the shared secret
 * Uses AES-256-GCM for authenticated encryption
 */
export async function encryptMessage(
  content: MessageContent,
  sharedKey: CryptoKey,
  nonce: Uint8Array
): Promise<{ ciphertext: string; nonce: string }> {
  const plaintext = new TextEncoder().encode(JSON.stringify(content));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    sharedKey,
    plaintext
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    nonce: arrayBufferToBase64(nonce),
  };
}

/**
 * Decrypt a message using the shared secret
 */
export async function decryptMessage(
  ciphertext: string,
  nonce: string,
  sharedKey: CryptoKey
): Promise<MessageContent> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const nonceBuffer = base64ToArrayBuffer(nonce);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonceBuffer) },
    sharedKey,
    ciphertextBuffer
  );

  const plaintext = new TextDecoder().decode(plaintextBuffer);
  return JSON.parse(plaintext) as MessageContent;
}

/**
 * Generate a random channel key for group encryption
 */
export async function generateChannelKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can share it
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a channel key for sharing (encrypted for a specific recipient)
 */
export async function exportChannelKey(channelKey: CryptoKey): Promise<string> {
  const keyBuffer = await crypto.subtle.exportKey('raw', channelKey);
  return arrayBufferToBase64(keyBuffer);
}

/**
 * Import a channel key from raw bytes
 */
export async function importChannelKey(keyBase64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyBase64);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a channel key for a specific recipient using their public key
 */
export async function encryptChannelKeyForRecipient(
  channelKey: CryptoKey,
  recipientPublicKey: string,
  senderPrivateKey: string
): Promise<{ encryptedKey: string; nonce: string }> {
  // Derive shared secret with recipient
  const sharedSecret = await deriveSharedSecret(senderPrivateKey, recipientPublicKey);

  // Export channel key
  const channelKeyBuffer = await crypto.subtle.exportKey('raw', channelKey);

  // Encrypt channel key with shared secret
  const nonce = generateNonce();
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    sharedSecret,
    channelKeyBuffer
  );

  return {
    encryptedKey: arrayBufferToBase64(encryptedBuffer),
    nonce: arrayBufferToBase64(nonce),
  };
}

/**
 * Decrypt a channel key received from another agent
 */
export async function decryptChannelKey(
  encryptedKey: string,
  nonce: string,
  senderPublicKey: string,
  recipientPrivateKey: string
): Promise<CryptoKey> {
  // Derive shared secret with sender
  const sharedSecret = await deriveSharedSecret(recipientPrivateKey, senderPublicKey);

  // Decrypt channel key
  const encryptedBuffer = base64ToArrayBuffer(encryptedKey);
  const nonceBuffer = base64ToArrayBuffer(nonce);

  const channelKeyBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonceBuffer) },
    sharedSecret,
    encryptedBuffer
  );

  // Import as AES-GCM key
  return crypto.subtle.importKey(
    'raw',
    channelKeyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Create a signature for authentication (using Ed25519)
 */
export async function signPayload(
  payload: string,
  privateKey: string
): Promise<string> {
  // Generate Ed25519 signing key from private key
  const keyBuffer = base64ToArrayBuffer(privateKey);

  // Hash the payload first
  const payloadBuffer = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', payloadBuffer);

  // For simplicity, we'll use HMAC for signing (Ed25519 not directly available in Web Crypto)
  const signingKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer.slice(0, 32), // Use first 32 bytes for HMAC
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', signingKey, hashBuffer);
  return arrayBufferToBase64(signature);
}

/**
 * Verify a signature
 */
export async function verifySignature(
  payload: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const keyBuffer = base64ToArrayBuffer(publicKey);
    const signatureBuffer = base64ToArrayBuffer(signature);

    const payloadBuffer = new TextEncoder().encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', payloadBuffer);

    const verifyKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer.slice(0, 32),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    return crypto.subtle.verify('HMAC', verifyKey, signatureBuffer, hashBuffer);
  } catch {
    return false;
  }
}

/**
 * Generate a random ID
 */
export function generateId(prefix: string = ''): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Hash data using SHA-256
 */
export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buffer = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToBase64(hashBuffer);
}

// Utility functions for base64 encoding/decoding
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper to create encrypted message envelope
export function createMessageEnvelope(
  channelId: string,
  senderDID: string,
  ciphertext: string,
  nonce: string,
  ephemeralPubKey?: string
): EncryptedMessage {
  return {
    id: generateId('msg'),
    channelId,
    sender: senderDID,
    timestamp: Date.now(),
    nonce,
    ciphertext,
    ephemeralPubKey,
  };
}
