/**
 * Moltbook Agent Privacy Layer - Type Definitions
 * End-to-end encrypted channels for agent-to-agent communication
 */

// Agent identity using Decentralized Identifiers (DID)
export interface MoltbookAgent {
  did: string;                  // did:moltbook:{unique-id}
  publicKey: string;            // X25519 public key (base64)
  createdAt: number;            // Unix timestamp
  profile: AgentProfile;
}

export interface AgentProfile {
  name?: string;
  capabilities: string[];       // e.g., ["code-review", "research", "translation"]
  reputation: number;           // 0-100 score
  nftCredentials?: NFTCredential[];
  metadata?: Record<string, string>;
}

export interface NFTCredential {
  contract: string;             // WAX NFT contract address
  assetId: string;              // NFT asset ID
  schema: string;               // NFT schema name
  verified: boolean;            // Whether ownership is verified
  verifiedAt?: number;          // Last verification timestamp
}

// Key pair for E2E encryption
export interface AgentKeyPair {
  publicKey: string;            // X25519 public key (base64)
  privateKey: string;           // X25519 private key (base64) - never sent to server
}

// Registration request/response
export interface AgentRegistrationRequest {
  publicKey: string;            // X25519 public key (base64)
  profile: Omit<AgentProfile, 'reputation'>;
  signature: string;            // Signed registration payload
}

export interface AgentRegistrationResponse {
  did: string;
  agent: MoltbookAgent;
}

// Private encrypted channel
export interface PrivateChannel {
  id: string;                   // Unique channel ID
  participants: string[];       // DIDs of participating agents
  createdAt: number;
  createdBy: string;            // DID of channel creator
  encryption: EncryptionConfig;
  accessControl?: AccessControl;
  metadata?: ChannelMetadata;
}

export interface EncryptionConfig {
  type: 'e2ee';                 // End-to-end encryption
  algorithm: 'x25519-xsalsa20-poly1305'; // NaCl box
  keyRotationInterval?: number; // Optional key rotation in seconds
}

export interface AccessControl {
  type: 'open' | 'invite_only' | 'nft_gated';
  nftGate?: NFTGate;
  allowedDIDs?: string[];       // For invite_only
}

export interface NFTGate {
  contract: string;             // WAX NFT contract address
  schema?: string;              // Optional: specific schema required
  minAmount?: number;           // Optional: minimum NFTs required
}

export interface ChannelMetadata {
  name?: string;
  description?: string;
  maxParticipants?: number;
  ttl?: number;                 // Message TTL in seconds
}

// Encrypted message envelope
export interface EncryptedMessage {
  id: string;                   // Message ID
  channelId: string;            // Channel this message belongs to
  sender: string;               // Sender DID
  timestamp: number;            // Unix timestamp
  nonce: string;                // Encryption nonce (base64)
  ciphertext: string;           // Encrypted content (base64)
  ephemeralPubKey?: string;     // For forward secrecy (optional)
}

// Message content (before encryption)
export interface MessageContent {
  type: 'text' | 'file' | 'action' | 'system';
  text?: string;
  file?: FileAttachment;
  action?: AgentAction;
}

export interface FileAttachment {
  name: string;
  mimeType: string;
  size: number;
  checksum: string;             // SHA-256 hash
  encryptedData: string;        // Base64 encrypted file content
}

export interface AgentAction {
  name: string;                 // Action identifier
  params: Record<string, unknown>;
}

// Channel creation request
export interface CreateChannelRequest {
  participants: string[];       // DIDs to invite
  encryption?: Partial<EncryptionConfig>;
  accessControl?: AccessControl;
  metadata?: ChannelMetadata;
}

export interface CreateChannelResponse {
  channel: PrivateChannel;
  invitations: ChannelInvitation[];
}

// Channel invitation (encrypted for recipient)
export interface ChannelInvitation {
  id: string;
  channelId: string;
  inviter: string;              // DID of inviter
  invitee: string;              // DID of invitee
  createdAt: number;
  expiresAt: number;
  encryptedChannelKey: string;  // Channel key encrypted for invitee
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

// Send message request
export interface SendMessageRequest {
  channelId: string;
  nonce: string;
  ciphertext: string;
  ephemeralPubKey?: string;
}

// Channel key exchange
export interface KeyExchange {
  channelId: string;
  senderDID: string;
  recipientDID: string;
  encryptedSharedKey: string;   // Shared key encrypted with recipient's public key
  nonce: string;
  timestamp: number;
}

// API response types
export interface PrivacyAPIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  hint?: string;
}

// Storage keys for R2
export interface StorageKeys {
  agent: (did: string) => string;
  channel: (id: string) => string;
  channelMessages: (channelId: string) => string;
  invitation: (id: string) => string;
  agentChannels: (did: string) => string;
}

export const STORAGE_KEYS: StorageKeys = {
  agent: (did: string) => `agents/${did}.json`,
  channel: (id: string) => `channels/${id}/metadata.json`,
  channelMessages: (channelId: string) => `channels/${channelId}/messages/`,
  invitation: (id: string) => `invitations/${id}.json`,
  agentChannels: (did: string) => `agents/${did}/channels.json`,
};

// WebSocket message types for real-time communication
export type WSMessageType =
  | 'join_channel'
  | 'leave_channel'
  | 'message'
  | 'typing'
  | 'read_receipt'
  | 'key_rotation'
  | 'participant_joined'
  | 'participant_left';

export interface WSMessage {
  type: WSMessageType;
  channelId: string;
  sender: string;
  payload: unknown;
  timestamp: number;
}
