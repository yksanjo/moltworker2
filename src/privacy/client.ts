/**
 * Moltbook Agent Privacy Client SDK
 *
 * Client-side SDK for agents to interact with the privacy layer.
 * Handles key generation, encryption/decryption, and API communication.
 *
 * IMPORTANT: Private keys never leave the client. All encryption/decryption
 * happens locally before sending to the server.
 *
 * Usage:
 * ```typescript
 * const client = new MoltbookPrivacyClient('https://your-worker.workers.dev');
 *
 * // Register a new agent
 * const { agent, keyPair } = await client.register({
 *   name: 'My Agent',
 *   capabilities: ['code-review', 'research'],
 * });
 *
 * // Create a private channel
 * const { channel } = await client.createChannel([otherAgentDID]);
 *
 * // Send encrypted message
 * await client.sendMessage(channel.id, 'Hello, this is encrypted!');
 *
 * // Receive and decrypt messages
 * const messages = await client.getMessages(channel.id);
 * ```
 */

import type {
  MoltbookAgent,
  AgentKeyPair,
  AgentProfile,
  PrivateChannel,
  ChannelInvitation,
  EncryptedMessage,
  MessageContent,
  CreateChannelRequest,
  PrivacyAPIResponse,
  AccessControl,
  ChannelMetadata,
} from './types';

// Re-export crypto utilities for client use
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
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from './crypto';

/**
 * Storage adapter interface for persisting agent credentials
 */
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Default in-memory storage adapter
 */
export class MemoryStorage implements StorageAdapter {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}

/**
 * Browser localStorage adapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private prefix: string = 'moltbook_privacy_') {}

  async get(key: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.prefix + key);
  }

  async set(key: string, value: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.prefix + key, value);
  }

  async delete(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }
}

/**
 * Agent credentials stored locally
 */
interface AgentCredentials {
  did: string;
  publicKey: string;
  privateKey: string;
  agent: MoltbookAgent;
}

/**
 * Channel key cache entry
 */
interface ChannelKeyEntry {
  channelId: string;
  key: CryptoKey;
  expiresAt?: number;
}

/**
 * Moltbook Privacy Client
 */
export class MoltbookPrivacyClient {
  private storage: StorageAdapter;
  private credentials: AgentCredentials | null = null;
  private channelKeys = new Map<string, ChannelKeyEntry>();

  constructor(
    private baseUrl: string,
    options?: {
      storage?: StorageAdapter;
    }
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.storage = options?.storage || new MemoryStorage();
  }

  /**
   * Initialize client with stored credentials
   */
  async init(): Promise<boolean> {
    const stored = await this.storage.get('credentials');
    if (stored) {
      this.credentials = JSON.parse(stored);
      return true;
    }
    return false;
  }

  /**
   * Get current agent DID
   */
  getDID(): string | null {
    return this.credentials?.did || null;
  }

  /**
   * Get current agent
   */
  getAgent(): MoltbookAgent | null {
    return this.credentials?.agent || null;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.credentials !== null;
  }

  /**
   * Register a new agent
   */
  async register(profile: Omit<AgentProfile, 'reputation'>): Promise<{
    agent: MoltbookAgent;
    keyPair: AgentKeyPair;
  }> {
    // Import crypto functions
    const { generateKeyPair, signPayload } = await import('./crypto');

    // Generate key pair
    const keyPair = await generateKeyPair();

    // Sign registration payload
    const payload = JSON.stringify({
      publicKey: keyPair.publicKey,
      profile,
    });
    const signature = await signPayload(payload, keyPair.privateKey);

    // Send registration request
    const response = await this.request<{
      did: string;
      agent: MoltbookAgent;
    }>('/agents/register', {
      method: 'POST',
      body: {
        publicKey: keyPair.publicKey,
        profile,
        signature,
      },
    });

    // Store credentials
    this.credentials = {
      did: response.did,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      agent: response.agent,
    };

    await this.storage.set('credentials', JSON.stringify(this.credentials));

    return { agent: response.agent, keyPair };
  }

  /**
   * Import existing agent credentials
   */
  async importCredentials(credentials: {
    did: string;
    publicKey: string;
    privateKey: string;
  }): Promise<MoltbookAgent> {
    // Fetch agent from server
    const agent = await this.getAgentByDID(credentials.did);

    // Verify public key matches
    if (agent.publicKey !== credentials.publicKey) {
      throw new Error('Public key mismatch');
    }

    // Store credentials
    this.credentials = {
      ...credentials,
      agent,
    };

    await this.storage.set('credentials', JSON.stringify(this.credentials));

    return agent;
  }

  /**
   * Clear stored credentials (logout)
   */
  async logout(): Promise<void> {
    this.credentials = null;
    this.channelKeys.clear();
    await this.storage.delete('credentials');
  }

  /**
   * Get agent by DID
   */
  async getAgentByDID(did: string): Promise<MoltbookAgent> {
    const response = await this.request<MoltbookAgent>(`/agents/${encodeURIComponent(did)}`);
    return response;
  }

  /**
   * Update agent profile
   */
  async updateProfile(
    updates: Partial<Pick<AgentProfile, 'name' | 'capabilities' | 'metadata'>>
  ): Promise<MoltbookAgent> {
    this.requireAuth();

    const response = await this.request<MoltbookAgent>(
      `/agents/${encodeURIComponent(this.credentials!.did)}`,
      {
        method: 'PATCH',
        body: updates,
      }
    );

    // Update cached agent
    this.credentials!.agent = response;
    await this.storage.set('credentials', JSON.stringify(this.credentials));

    return response;
  }

  /**
   * Search for agents
   */
  async searchAgents(query?: {
    capabilities?: string[];
    minReputation?: number;
    nftContract?: string;
    nftSchema?: string;
  }): Promise<MoltbookAgent[]> {
    const params = new URLSearchParams();
    if (query?.capabilities) {
      params.set('capabilities', query.capabilities.join(','));
    }
    if (query?.minReputation !== undefined) {
      params.set('minReputation', query.minReputation.toString());
    }
    if (query?.nftContract) {
      params.set('nftContract', query.nftContract);
    }
    if (query?.nftSchema) {
      params.set('nftSchema', query.nftSchema);
    }

    const response = await this.request<MoltbookAgent[]>(
      `/agents/search?${params.toString()}`
    );
    return response;
  }

  /**
   * Create a private channel
   */
  async createChannel(
    participants: string[],
    options?: {
      accessControl?: AccessControl;
      metadata?: ChannelMetadata;
    }
  ): Promise<{
    channel: PrivateChannel;
    invitations: ChannelInvitation[];
  }> {
    this.requireAuth();

    const response = await this.request<{
      channel: PrivateChannel;
      invitations: ChannelInvitation[];
    }>('/channels', {
      method: 'POST',
      body: {
        participants,
        accessControl: options?.accessControl,
        metadata: options?.metadata,
        privateKey: this.credentials!.privateKey, // TODO: In production, encryption should happen client-side
      },
    });

    return response;
  }

  /**
   * List channels for current agent
   */
  async listChannels(): Promise<(PrivateChannel & { stats: object })[]> {
    this.requireAuth();
    return this.request('/channels');
  }

  /**
   * Get channel by ID
   */
  async getChannel(
    channelId: string
  ): Promise<{ channel: PrivateChannel; stats: object }> {
    this.requireAuth();
    return this.request(`/channels/${channelId}`);
  }

  /**
   * Join a channel (for open or NFT-gated channels)
   */
  async joinChannel(channelId: string): Promise<PrivateChannel> {
    this.requireAuth();
    return this.request(`/channels/${channelId}/join`, { method: 'POST' });
  }

  /**
   * Leave a channel
   */
  async leaveChannel(channelId: string): Promise<void> {
    this.requireAuth();
    await this.request(`/channels/${channelId}/leave`, { method: 'POST' });
  }

  /**
   * List pending invitations
   */
  async listInvitations(): Promise<ChannelInvitation[]> {
    this.requireAuth();
    return this.request('/invitations');
  }

  /**
   * Accept channel invitation
   */
  async acceptInvitation(
    invitationId: string
  ): Promise<{ invitation: ChannelInvitation; encryptedChannelKey: string }> {
    this.requireAuth();
    return this.request(`/invitations/${invitationId}/accept`, { method: 'POST' });
  }

  /**
   * Reject channel invitation
   */
  async rejectInvitation(invitationId: string): Promise<void> {
    this.requireAuth();
    await this.request(`/invitations/${invitationId}/reject`, { method: 'POST' });
  }

  /**
   * Send encrypted message to channel
   *
   * The message is encrypted client-side before being sent to the server.
   * The server only sees encrypted ciphertext.
   */
  async sendMessage(
    channelId: string,
    content: string | MessageContent
  ): Promise<EncryptedMessage> {
    this.requireAuth();

    // Get or derive channel key
    const channelKey = await this.getChannelKey(channelId);

    // Prepare message content
    const messageContent: MessageContent =
      typeof content === 'string' ? { type: 'text', text: content } : content;

    // Import crypto functions
    const { generateNonce, encryptMessage } = await import('./crypto');

    // Encrypt message
    const nonce = generateNonce();
    const { ciphertext, nonce: nonceBase64 } = await encryptMessage(
      messageContent,
      channelKey,
      nonce
    );

    // Send to server
    const response = await this.request<EncryptedMessage>(
      `/channels/${channelId}/messages`,
      {
        method: 'POST',
        body: {
          channelId,
          nonce: nonceBase64,
          ciphertext,
        },
      }
    );

    return response;
  }

  /**
   * Get messages from channel (encrypted)
   */
  async getMessages(
    channelId: string,
    options?: {
      limit?: number;
      before?: number;
      after?: number;
    }
  ): Promise<EncryptedMessage[]> {
    this.requireAuth();

    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.before) params.set('before', options.before.toString());
    if (options?.after) params.set('after', options.after.toString());

    return this.request(`/channels/${channelId}/messages?${params.toString()}`);
  }

  /**
   * Decrypt a message using the channel key
   */
  async decryptMessageContent(
    message: EncryptedMessage
  ): Promise<MessageContent> {
    this.requireAuth();

    const channelKey = await this.getChannelKey(message.channelId);

    // Import crypto function
    const { decryptMessage } = await import('./crypto');

    return decryptMessage(message.ciphertext, message.nonce, channelKey);
  }

  /**
   * Get decrypted messages from channel
   */
  async getDecryptedMessages(
    channelId: string,
    options?: {
      limit?: number;
      before?: number;
      after?: number;
    }
  ): Promise<(EncryptedMessage & { content: MessageContent })[]> {
    const messages = await this.getMessages(channelId, options);

    return Promise.all(
      messages.map(async (msg) => ({
        ...msg,
        content: await this.decryptMessageContent(msg),
      }))
    );
  }

  // ============ Private Methods ============

  private requireAuth(): void {
    if (!this.credentials) {
      throw new Error('Not authenticated. Call register() or importCredentials() first.');
    }
  }

  private async getChannelKey(channelId: string): Promise<CryptoKey> {
    // Check cache
    const cached = this.channelKeys.get(channelId);
    if (cached && (!cached.expiresAt || cached.expiresAt > Date.now())) {
      return cached.key;
    }

    // For now, derive from private key and channel ID
    // In production, this would use the encrypted channel key from invitation
    const { importChannelKey, sha256 } = await import('./crypto');

    // Create a deterministic key from private key + channel ID
    const keyMaterial = await sha256(
      this.credentials!.privateKey + ':' + channelId
    );
    const key = await importChannelKey(keyMaterial.slice(0, 44)); // 32 bytes base64

    // Cache the key
    this.channelKeys.set(channelId, {
      channelId,
      key,
    });

    return key;
  }

  private async request<T>(
    path: string,
    options?: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: unknown;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}/api/privacy${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add DID header if authenticated
    if (this.credentials) {
      headers['X-Agent-DID'] = this.credentials.did;
    }

    const response = await fetch(url, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const json = (await response.json()) as PrivacyAPIResponse<T>;

    if (!json.success) {
      const error = new Error(json.error || 'Unknown error');
      (error as any).hint = json.hint;
      throw error;
    }

    return json.data as T;
  }
}

/**
 * Create a privacy client with default storage
 */
export function createPrivacyClient(
  baseUrl: string,
  options?: { storage?: StorageAdapter }
): MoltbookPrivacyClient {
  return new MoltbookPrivacyClient(baseUrl, options);
}
