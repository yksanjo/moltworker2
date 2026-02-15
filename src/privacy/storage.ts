/**
 * Moltbook Agent Privacy Layer - Storage Layer
 * R2-backed storage for agents, channels, and encrypted messages
 */

import type {
  MoltbookAgent,
  PrivateChannel,
  ChannelInvitation,
  EncryptedMessage,
  STORAGE_KEYS,
} from './types';

// Storage key generators
const KEYS = {
  agent: (did: string) => `privacy/agents/${encodeURIComponent(did)}.json`,
  channel: (id: string) => `privacy/channels/${id}/metadata.json`,
  channelMessages: (channelId: string, messageId: string) =>
    `privacy/channels/${channelId}/messages/${messageId}.json`,
  channelMessagesList: (channelId: string) =>
    `privacy/channels/${channelId}/messages/`,
  invitation: (id: string) => `privacy/invitations/${id}.json`,
  agentChannels: (did: string) =>
    `privacy/agents/${encodeURIComponent(did)}/channels.json`,
  agentInvitations: (did: string) =>
    `privacy/agents/${encodeURIComponent(did)}/invitations.json`,
};

/**
 * Privacy storage interface
 * Uses Cloudflare R2 for persistent storage
 */
export class PrivacyStorage {
  constructor(private bucket: R2Bucket) {}

  // ============ Agent Operations ============

  async saveAgent(agent: MoltbookAgent): Promise<void> {
    const key = KEYS.agent(agent.did);
    await this.bucket.put(key, JSON.stringify(agent), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  async getAgent(did: string): Promise<MoltbookAgent | null> {
    const key = KEYS.agent(did);
    const object = await this.bucket.get(key);
    if (!object) return null;

    const text = await object.text();
    return JSON.parse(text) as MoltbookAgent;
  }

  async deleteAgent(did: string): Promise<void> {
    const key = KEYS.agent(did);
    await this.bucket.delete(key);
  }

  async agentExists(did: string): Promise<boolean> {
    const key = KEYS.agent(did);
    const object = await this.bucket.head(key);
    return object !== null;
  }

  // ============ Channel Operations ============

  async saveChannel(channel: PrivateChannel): Promise<void> {
    const key = KEYS.channel(channel.id);
    await this.bucket.put(key, JSON.stringify(channel), {
      httpMetadata: { contentType: 'application/json' },
    });

    // Update each participant's channel list
    for (const did of channel.participants) {
      await this.addChannelToAgent(did, channel.id);
    }
  }

  async getChannel(id: string): Promise<PrivateChannel | null> {
    const key = KEYS.channel(id);
    const object = await this.bucket.get(key);
    if (!object) return null;

    const text = await object.text();
    return JSON.parse(text) as PrivateChannel;
  }

  async deleteChannel(id: string): Promise<void> {
    const channel = await this.getChannel(id);
    if (!channel) return;

    // Remove from all participants' channel lists
    for (const did of channel.participants) {
      await this.removeChannelFromAgent(did, id);
    }

    // Delete channel metadata
    await this.bucket.delete(KEYS.channel(id));

    // Delete all messages (list and delete)
    const messagePrefix = KEYS.channelMessagesList(id);
    const listed = await this.bucket.list({ prefix: messagePrefix });
    for (const obj of listed.objects) {
      await this.bucket.delete(obj.key);
    }
  }

  async addChannelToAgent(did: string, channelId: string): Promise<void> {
    const key = KEYS.agentChannels(did);
    const object = await this.bucket.get(key);

    let channelIds: string[] = [];
    if (object) {
      const text = await object.text();
      channelIds = JSON.parse(text) as string[];
    }

    if (!channelIds.includes(channelId)) {
      channelIds.push(channelId);
      await this.bucket.put(key, JSON.stringify(channelIds), {
        httpMetadata: { contentType: 'application/json' },
      });
    }
  }

  async removeChannelFromAgent(did: string, channelId: string): Promise<void> {
    const key = KEYS.agentChannels(did);
    const object = await this.bucket.get(key);

    if (!object) return;

    const text = await object.text();
    let channelIds = JSON.parse(text) as string[];

    channelIds = channelIds.filter(id => id !== channelId);
    await this.bucket.put(key, JSON.stringify(channelIds), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  async getAgentChannels(did: string): Promise<string[]> {
    const key = KEYS.agentChannels(did);
    const object = await this.bucket.get(key);

    if (!object) return [];

    const text = await object.text();
    return JSON.parse(text) as string[];
  }

  async getAgentChannelsWithDetails(did: string): Promise<PrivateChannel[]> {
    const channelIds = await this.getAgentChannels(did);
    const channels: PrivateChannel[] = [];

    for (const id of channelIds) {
      const channel = await this.getChannel(id);
      if (channel) {
        channels.push(channel);
      }
    }

    return channels;
  }

  // ============ Message Operations ============

  async saveMessage(message: EncryptedMessage): Promise<void> {
    const key = KEYS.channelMessages(message.channelId, message.id);
    await this.bucket.put(key, JSON.stringify(message), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  async getMessage(
    channelId: string,
    messageId: string
  ): Promise<EncryptedMessage | null> {
    const key = KEYS.channelMessages(channelId, messageId);
    const object = await this.bucket.get(key);
    if (!object) return null;

    const text = await object.text();
    return JSON.parse(text) as EncryptedMessage;
  }

  async getChannelMessages(
    channelId: string,
    options?: {
      limit?: number;
      before?: number;
      after?: number;
    }
  ): Promise<EncryptedMessage[]> {
    const prefix = KEYS.channelMessagesList(channelId);
    const listed = await this.bucket.list({ prefix });

    const messages: EncryptedMessage[] = [];

    for (const obj of listed.objects) {
      const object = await this.bucket.get(obj.key);
      if (!object) continue;

      const text = await object.text();
      const message = JSON.parse(text) as EncryptedMessage;

      // Apply filters
      if (options?.before && message.timestamp >= options.before) continue;
      if (options?.after && message.timestamp <= options.after) continue;

      messages.push(message);
    }

    // Sort by timestamp descending
    messages.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (options?.limit) {
      return messages.slice(0, options.limit);
    }

    return messages;
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    const key = KEYS.channelMessages(channelId, messageId);
    await this.bucket.delete(key);
  }

  async deleteExpiredMessages(
    channelId: string,
    ttlSeconds: number
  ): Promise<number> {
    const messages = await this.getChannelMessages(channelId);
    const now = Date.now();
    let deleted = 0;

    for (const message of messages) {
      if (now - message.timestamp > ttlSeconds * 1000) {
        await this.deleteMessage(channelId, message.id);
        deleted++;
      }
    }

    return deleted;
  }

  // ============ Invitation Operations ============

  async saveInvitation(invitation: ChannelInvitation): Promise<void> {
    const key = KEYS.invitation(invitation.id);
    await this.bucket.put(key, JSON.stringify(invitation), {
      httpMetadata: { contentType: 'application/json' },
    });

    // Add to invitee's invitation list
    await this.addInvitationToAgent(invitation.invitee, invitation.id);
  }

  async getInvitation(id: string): Promise<ChannelInvitation | null> {
    const key = KEYS.invitation(id);
    const object = await this.bucket.get(key);
    if (!object) return null;

    const text = await object.text();
    return JSON.parse(text) as ChannelInvitation;
  }

  async updateInvitation(invitation: ChannelInvitation): Promise<void> {
    const key = KEYS.invitation(invitation.id);
    await this.bucket.put(key, JSON.stringify(invitation), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  async deleteInvitation(id: string): Promise<void> {
    const invitation = await this.getInvitation(id);
    if (invitation) {
      await this.removeInvitationFromAgent(invitation.invitee, id);
    }
    await this.bucket.delete(KEYS.invitation(id));
  }

  async addInvitationToAgent(did: string, invitationId: string): Promise<void> {
    const key = KEYS.agentInvitations(did);
    const object = await this.bucket.get(key);

    let invitationIds: string[] = [];
    if (object) {
      const text = await object.text();
      invitationIds = JSON.parse(text) as string[];
    }

    if (!invitationIds.includes(invitationId)) {
      invitationIds.push(invitationId);
      await this.bucket.put(key, JSON.stringify(invitationIds), {
        httpMetadata: { contentType: 'application/json' },
      });
    }
  }

  async removeInvitationFromAgent(
    did: string,
    invitationId: string
  ): Promise<void> {
    const key = KEYS.agentInvitations(did);
    const object = await this.bucket.get(key);

    if (!object) return;

    const text = await object.text();
    let invitationIds = JSON.parse(text) as string[];

    invitationIds = invitationIds.filter(id => id !== invitationId);
    await this.bucket.put(key, JSON.stringify(invitationIds), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  async getAgentInvitations(did: string): Promise<ChannelInvitation[]> {
    const key = KEYS.agentInvitations(did);
    const object = await this.bucket.get(key);

    if (!object) return [];

    const text = await object.text();
    const invitationIds = JSON.parse(text) as string[];

    const invitations: ChannelInvitation[] = [];
    for (const id of invitationIds) {
      const invitation = await this.getInvitation(id);
      if (invitation && invitation.status === 'pending') {
        // Check expiration
        if (Date.now() > invitation.expiresAt) {
          invitation.status = 'expired';
          await this.updateInvitation(invitation);
        } else {
          invitations.push(invitation);
        }
      }
    }

    return invitations;
  }

  // ============ Search Operations ============

  async searchAgents(query: {
    capabilities?: string[];
    minReputation?: number;
    hasNFT?: { contract: string; schema?: string };
  }): Promise<MoltbookAgent[]> {
    // List all agents
    const prefix = 'privacy/agents/';
    const listed = await this.bucket.list({ prefix });

    const agents: MoltbookAgent[] = [];

    for (const obj of listed.objects) {
      // Skip channel lists
      if (obj.key.includes('/channels.json')) continue;
      if (obj.key.includes('/invitations.json')) continue;

      const object = await this.bucket.get(obj.key);
      if (!object) continue;

      const text = await object.text();
      const agent = JSON.parse(text) as MoltbookAgent;

      // Apply filters
      if (query.capabilities) {
        const hasAllCapabilities = query.capabilities.every(cap =>
          agent.profile.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) continue;
      }

      if (query.minReputation !== undefined) {
        if (agent.profile.reputation < query.minReputation) continue;
      }

      if (query.hasNFT) {
        const hasNFT = (agent.profile.nftCredentials || []).some(
          c =>
            c.verified &&
            c.contract === query.hasNFT!.contract &&
            (!query.hasNFT!.schema || c.schema === query.hasNFT!.schema)
        );
        if (!hasNFT) continue;
      }

      agents.push(agent);
    }

    return agents;
  }
}

/**
 * Create a privacy storage instance from R2 bucket
 */
export function createPrivacyStorage(bucket: R2Bucket): PrivacyStorage {
  return new PrivacyStorage(bucket);
}
