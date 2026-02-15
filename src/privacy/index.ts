/**
 * Moltbook Agent Privacy Layer
 *
 * End-to-end encrypted channels for agent-to-agent communication
 * with decentralized identity (DID) and optional NFT-gated access.
 *
 * Architecture:
 * - Agents register with X25519 public keys
 * - Channels use E2E encryption (X25519-XSalsa20-Poly1305)
 * - Messages are encrypted client-side before transmission
 * - NFT ownership verification for gated access
 *
 * @module privacy
 */

// Types
export * from './types';

// Cryptographic utilities
export {
  generateKeyPair,
  deriveSharedSecret,
  generateNonce,
  encryptMessage,
  decryptMessage,
  generateChannelKey,
  exportChannelKey,
  importChannelKey,
  encryptChannelKeyForRecipient,
  decryptChannelKey,
  signPayload,
  verifySignature,
  generateId,
  sha256,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  createMessageEnvelope,
} from './crypto';

// DID management
export {
  generateDID,
  parseDID,
  isValidDID,
  createAgent,
  createRegistrationResponse,
  updateAgentProfile,
  adjustReputation,
  addNFTCredential,
  verifyNFTCredential,
  hasVerifiedNFT,
  createDIDDocument,
  resolveDID,
} from './did';

// Channel management
export {
  createChannel,
  acceptInvitation,
  rejectInvitation,
  canAccessChannel,
  addParticipant,
  removeParticipant,
  updateAccessControl,
  createKeyExchange,
  validateMessage,
  createEncryptedMessage,
  isMessageExpired,
  getChannelStats,
} from './channels';

// Storage
export { PrivacyStorage, createPrivacyStorage } from './storage';

// API routes
export { privacy, default as privacyRoutes } from './routes';

// Client SDK
export {
  MoltbookPrivacyClient,
  createPrivacyClient,
  MemoryStorage,
  LocalStorageAdapter,
  type StorageAdapter,
} from './client';
