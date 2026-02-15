/**
 * Moltbook Agent Privacy Layer - Private Channel Management
 * E2E encrypted channels for agent-to-agent communication
 */

import type {
  PrivateChannel,
  ChannelInvitation,
  EncryptedMessage,
  CreateChannelRequest,
  CreateChannelResponse,
  MoltbookAgent,
  AccessControl,
  KeyExchange,
  SendMessageRequest,
} from './types';
import {
  generateId,
  generateChannelKey,
  exportChannelKey,
  encryptChannelKeyForRecipient,
} from './crypto';
import { hasVerifiedNFT } from './did';

/**
 * Create a new private channel
 */
export async function createChannel(
  request: CreateChannelRequest,
  creatorDID: string,
  creatorPrivateKey: string,
  getAgent: (did: string) => Promise<MoltbookAgent | null>
): Promise<CreateChannelResponse> {
  // Validate participants
  if (!request.participants || request.participants.length === 0) {
    throw new Error('At least one participant is required');
  }

  // Ensure creator is in participants
  const allParticipants = request.participants.includes(creatorDID)
    ? request.participants
    : [creatorDID, ...request.participants];

  // Verify all participants exist
  for (const did of allParticipants) {
    const agent = await getAgent(did);
    if (!agent) {
      throw new Error(`Agent not found: ${did}`);
    }
  }

  // Generate channel key
  const channelKey = await generateChannelKey();
  const channelKeyBase64 = await exportChannelKey(channelKey);

  // Create channel
  const channel: PrivateChannel = {
    id: generateId('ch'),
    participants: allParticipants,
    createdAt: Date.now(),
    createdBy: creatorDID,
    encryption: {
      type: 'e2ee',
      algorithm: 'x25519-xsalsa20-poly1305',
      keyRotationInterval: request.encryption?.keyRotationInterval,
    },
    accessControl: request.accessControl || { type: 'invite_only' },
    metadata: request.metadata,
  };

  // Create invitations for all participants (except creator)
  const invitations: ChannelInvitation[] = [];

  for (const did of allParticipants) {
    if (did === creatorDID) continue;

    const agent = await getAgent(did);
    if (!agent) continue;

    // Encrypt channel key for this participant
    const { encryptedKey, nonce } = await encryptChannelKeyForRecipient(
      channelKey,
      agent.publicKey,
      creatorPrivateKey
    );

    const invitation: ChannelInvitation = {
      id: generateId('inv'),
      channelId: channel.id,
      inviter: creatorDID,
      invitee: did,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      encryptedChannelKey: JSON.stringify({ encryptedKey, nonce }),
      status: 'pending',
    };

    invitations.push(invitation);
  }

  return { channel, invitations };
}

/**
 * Accept a channel invitation
 */
export function acceptInvitation(invitation: ChannelInvitation): ChannelInvitation {
  if (invitation.status !== 'pending') {
    throw new Error(`Cannot accept invitation with status: ${invitation.status}`);
  }

  if (Date.now() > invitation.expiresAt) {
    return { ...invitation, status: 'expired' };
  }

  return { ...invitation, status: 'accepted' };
}

/**
 * Reject a channel invitation
 */
export function rejectInvitation(invitation: ChannelInvitation): ChannelInvitation {
  if (invitation.status !== 'pending') {
    throw new Error(`Cannot reject invitation with status: ${invitation.status}`);
  }

  return { ...invitation, status: 'rejected' };
}

/**
 * Check if an agent can access a channel
 */
export async function canAccessChannel(
  channel: PrivateChannel,
  agent: MoltbookAgent
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if agent is a participant
  if (channel.participants.includes(agent.did)) {
    return { allowed: true };
  }

  // Check access control
  const accessControl = channel.accessControl;
  if (!accessControl) {
    return { allowed: false, reason: 'Not a participant' };
  }

  switch (accessControl.type) {
    case 'open':
      return { allowed: true };

    case 'invite_only':
      if (accessControl.allowedDIDs?.includes(agent.did)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Invite required' };

    case 'nft_gated':
      if (!accessControl.nftGate) {
        return { allowed: false, reason: 'NFT gate not configured' };
      }

      const hasNFT = hasVerifiedNFT(
        agent,
        accessControl.nftGate.contract,
        accessControl.nftGate.schema
      );

      if (!hasNFT) {
        return { allowed: false, reason: 'Required NFT not found' };
      }

      // Check minimum amount if specified
      if (accessControl.nftGate.minAmount) {
        const nftCount = (agent.profile.nftCredentials || []).filter(
          c =>
            c.verified &&
            c.contract === accessControl.nftGate!.contract &&
            (!accessControl.nftGate!.schema || c.schema === accessControl.nftGate!.schema)
        ).length;

        if (nftCount < accessControl.nftGate.minAmount) {
          return {
            allowed: false,
            reason: `Requires at least ${accessControl.nftGate.minAmount} NFTs`,
          };
        }
      }

      return { allowed: true };

    default:
      return { allowed: false, reason: 'Unknown access control type' };
  }
}

/**
 * Add a participant to a channel
 */
export function addParticipant(
  channel: PrivateChannel,
  participantDID: string
): PrivateChannel {
  if (channel.participants.includes(participantDID)) {
    return channel;
  }

  // Check max participants
  if (
    channel.metadata?.maxParticipants &&
    channel.participants.length >= channel.metadata.maxParticipants
  ) {
    throw new Error('Channel has reached maximum participants');
  }

  return {
    ...channel,
    participants: [...channel.participants, participantDID],
  };
}

/**
 * Remove a participant from a channel
 */
export function removeParticipant(
  channel: PrivateChannel,
  participantDID: string,
  removerDID: string
): PrivateChannel {
  // Only creator or self can remove
  if (channel.createdBy !== removerDID && participantDID !== removerDID) {
    throw new Error('Not authorized to remove participant');
  }

  // Cannot remove creator
  if (participantDID === channel.createdBy) {
    throw new Error('Cannot remove channel creator');
  }

  return {
    ...channel,
    participants: channel.participants.filter(p => p !== participantDID),
  };
}

/**
 * Update channel access control
 */
export function updateAccessControl(
  channel: PrivateChannel,
  accessControl: AccessControl,
  updaterDID: string
): PrivateChannel {
  // Only creator can update access control
  if (channel.createdBy !== updaterDID) {
    throw new Error('Only channel creator can update access control');
  }

  return {
    ...channel,
    accessControl,
  };
}

/**
 * Create a key exchange record for a new participant
 */
export function createKeyExchange(
  channelId: string,
  senderDID: string,
  recipientDID: string,
  encryptedSharedKey: string,
  nonce: string
): KeyExchange {
  return {
    channelId,
    senderDID,
    recipientDID,
    encryptedSharedKey,
    nonce,
    timestamp: Date.now(),
  };
}

/**
 * Validate message before storage
 */
export function validateMessage(
  message: SendMessageRequest,
  channel: PrivateChannel,
  senderDID: string
): { valid: boolean; error?: string } {
  // Check if sender is a participant
  if (!channel.participants.includes(senderDID)) {
    return { valid: false, error: 'Not a channel participant' };
  }

  // Validate required fields
  if (!message.channelId || !message.nonce || !message.ciphertext) {
    return { valid: false, error: 'Missing required fields' };
  }

  // Channel ID must match
  if (message.channelId !== channel.id) {
    return { valid: false, error: 'Channel ID mismatch' };
  }

  return { valid: true };
}

/**
 * Create encrypted message from request
 */
export function createEncryptedMessage(
  request: SendMessageRequest,
  senderDID: string
): EncryptedMessage {
  return {
    id: generateId('msg'),
    channelId: request.channelId,
    sender: senderDID,
    timestamp: Date.now(),
    nonce: request.nonce,
    ciphertext: request.ciphertext,
    ephemeralPubKey: request.ephemeralPubKey,
  };
}

/**
 * Check if a message has expired (based on channel TTL)
 */
export function isMessageExpired(
  message: EncryptedMessage,
  channel: PrivateChannel
): boolean {
  if (!channel.metadata?.ttl) {
    return false;
  }

  const expiresAt = message.timestamp + channel.metadata.ttl * 1000;
  return Date.now() > expiresAt;
}

/**
 * Get channel statistics
 */
export function getChannelStats(
  channel: PrivateChannel,
  messages: EncryptedMessage[]
): {
  participantCount: number;
  messageCount: number;
  lastActivity: number | null;
  isNFTGated: boolean;
} {
  const validMessages = messages.filter(m => !isMessageExpired(m, channel));

  return {
    participantCount: channel.participants.length,
    messageCount: validMessages.length,
    lastActivity:
      validMessages.length > 0
        ? Math.max(...validMessages.map(m => m.timestamp))
        : null,
    isNFTGated: channel.accessControl?.type === 'nft_gated',
  };
}
