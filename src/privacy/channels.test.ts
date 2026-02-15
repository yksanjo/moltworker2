/**
 * Tests for Moltbook Agent Privacy Layer - Channel Management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  acceptInvitation,
  rejectInvitation,
  canAccessChannel,
  addParticipant,
  removeParticipant,
  updateAccessControl,
  validateMessage,
  createEncryptedMessage,
  isMessageExpired,
  getChannelStats,
} from './channels';
import type {
  PrivateChannel,
  ChannelInvitation,
  MoltbookAgent,
  SendMessageRequest,
  EncryptedMessage,
} from './types';

describe('channel management', () => {
  const mockAgent: MoltbookAgent = {
    did: 'did:moltbook:agent1111111111111111111111111111',
    publicKey: 'agent1-public-key',
    createdAt: Date.now(),
    profile: {
      capabilities: ['test'],
      reputation: 50,
    },
  };

  const mockChannel: PrivateChannel = {
    id: 'ch-test123',
    participants: [
      'did:moltbook:creator00000000000000000000000000',
      'did:moltbook:agent1111111111111111111111111111',
    ],
    createdAt: Date.now(),
    createdBy: 'did:moltbook:creator00000000000000000000000000',
    encryption: {
      type: 'e2ee',
      algorithm: 'x25519-xsalsa20-poly1305',
    },
    accessControl: {
      type: 'invite_only',
    },
  };

  describe('acceptInvitation', () => {
    it('accepts pending invitation', () => {
      const invitation: ChannelInvitation = {
        id: 'inv-123',
        channelId: 'ch-test',
        inviter: 'did:moltbook:inviter',
        invitee: 'did:moltbook:invitee',
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        encryptedChannelKey: 'encrypted-key',
        status: 'pending',
      };

      const accepted = acceptInvitation(invitation);

      expect(accepted.status).toBe('accepted');
    });

    it('marks expired invitations', () => {
      const invitation: ChannelInvitation = {
        id: 'inv-123',
        channelId: 'ch-test',
        inviter: 'did:moltbook:inviter',
        invitee: 'did:moltbook:invitee',
        createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        expiresAt: Date.now() - 1000, // Expired
        encryptedChannelKey: 'encrypted-key',
        status: 'pending',
      };

      const result = acceptInvitation(invitation);

      expect(result.status).toBe('expired');
    });

    it('throws for non-pending invitations', () => {
      const invitation: ChannelInvitation = {
        id: 'inv-123',
        channelId: 'ch-test',
        inviter: 'did:moltbook:inviter',
        invitee: 'did:moltbook:invitee',
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        encryptedChannelKey: 'encrypted-key',
        status: 'accepted',
      };

      expect(() => acceptInvitation(invitation)).toThrow();
    });
  });

  describe('rejectInvitation', () => {
    it('rejects pending invitation', () => {
      const invitation: ChannelInvitation = {
        id: 'inv-123',
        channelId: 'ch-test',
        inviter: 'did:moltbook:inviter',
        invitee: 'did:moltbook:invitee',
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        encryptedChannelKey: 'encrypted-key',
        status: 'pending',
      };

      const rejected = rejectInvitation(invitation);

      expect(rejected.status).toBe('rejected');
    });
  });

  describe('canAccessChannel', () => {
    it('allows access for participants', async () => {
      const result = await canAccessChannel(mockChannel, mockAgent);

      expect(result.allowed).toBe(true);
    });

    it('denies access for non-participants in invite_only channel', async () => {
      const outsider: MoltbookAgent = {
        ...mockAgent,
        did: 'did:moltbook:outsider000000000000000000000000',
      };

      const result = await canAccessChannel(mockChannel, outsider);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Invite required');
    });

    it('allows access for open channels', async () => {
      const openChannel: PrivateChannel = {
        ...mockChannel,
        accessControl: { type: 'open' },
      };
      const outsider: MoltbookAgent = {
        ...mockAgent,
        did: 'did:moltbook:outsider000000000000000000000000',
      };

      const result = await canAccessChannel(openChannel, outsider);

      expect(result.allowed).toBe(true);
    });

    it('handles NFT-gated channels', async () => {
      const nftChannel: PrivateChannel = {
        ...mockChannel,
        participants: ['did:moltbook:creator00000000000000000000000000'],
        accessControl: {
          type: 'nft_gated',
          nftGate: {
            contract: 'atomicassets',
            schema: 'moltbook.agent',
          },
        },
      };

      const agentWithNFT: MoltbookAgent = {
        ...mockAgent,
        profile: {
          ...mockAgent.profile,
          nftCredentials: [
            {
              contract: 'atomicassets',
              assetId: '12345',
              schema: 'moltbook.agent',
              verified: true,
              verifiedAt: Date.now(),
            },
          ],
        },
      };

      const agentWithoutNFT: MoltbookAgent = {
        ...mockAgent,
      };

      const withNFT = await canAccessChannel(nftChannel, agentWithNFT);
      const withoutNFT = await canAccessChannel(nftChannel, agentWithoutNFT);

      expect(withNFT.allowed).toBe(true);
      expect(withoutNFT.allowed).toBe(false);
      expect(withoutNFT.reason).toBe('Required NFT not found');
    });
  });

  describe('addParticipant', () => {
    it('adds new participant', () => {
      const updated = addParticipant(
        mockChannel,
        'did:moltbook:newagent0000000000000000000000000'
      );

      expect(updated.participants).toHaveLength(3);
      expect(updated.participants).toContain(
        'did:moltbook:newagent0000000000000000000000000'
      );
    });

    it('does not add duplicate', () => {
      const updated = addParticipant(mockChannel, mockAgent.did);

      expect(updated.participants).toHaveLength(2);
    });

    it('respects max participants', () => {
      const limitedChannel: PrivateChannel = {
        ...mockChannel,
        metadata: {
          maxParticipants: 2,
        },
      };

      expect(() =>
        addParticipant(
          limitedChannel,
          'did:moltbook:newagent0000000000000000000000000'
        )
      ).toThrow('maximum participants');
    });
  });

  describe('removeParticipant', () => {
    it('allows self-removal', () => {
      const updated = removeParticipant(
        mockChannel,
        mockAgent.did,
        mockAgent.did
      );

      expect(updated.participants).not.toContain(mockAgent.did);
    });

    it('allows creator to remove others', () => {
      const updated = removeParticipant(
        mockChannel,
        mockAgent.did,
        mockChannel.createdBy
      );

      expect(updated.participants).not.toContain(mockAgent.did);
    });

    it('prevents unauthorized removal', () => {
      expect(() =>
        removeParticipant(
          mockChannel,
          mockChannel.createdBy,
          mockAgent.did
        )
      ).toThrow('Not authorized');
    });

    it('prevents removing creator', () => {
      expect(() =>
        removeParticipant(
          mockChannel,
          mockChannel.createdBy,
          mockChannel.createdBy
        )
      ).toThrow('Cannot remove channel creator');
    });
  });

  describe('updateAccessControl', () => {
    it('allows creator to update', () => {
      const updated = updateAccessControl(
        mockChannel,
        { type: 'open' },
        mockChannel.createdBy
      );

      expect(updated.accessControl?.type).toBe('open');
    });

    it('prevents non-creator from updating', () => {
      expect(() =>
        updateAccessControl(mockChannel, { type: 'open' }, mockAgent.did)
      ).toThrow('Only channel creator');
    });
  });

  describe('validateMessage', () => {
    it('validates correct message', () => {
      const request: SendMessageRequest = {
        channelId: mockChannel.id,
        nonce: 'test-nonce',
        ciphertext: 'encrypted-content',
      };

      const result = validateMessage(request, mockChannel, mockAgent.did);

      expect(result.valid).toBe(true);
    });

    it('rejects message from non-participant', () => {
      const request: SendMessageRequest = {
        channelId: mockChannel.id,
        nonce: 'test-nonce',
        ciphertext: 'encrypted-content',
      };

      const result = validateMessage(
        request,
        mockChannel,
        'did:moltbook:outsider000000000000000000000000'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not a channel participant');
    });

    it('rejects message with wrong channel ID', () => {
      const request: SendMessageRequest = {
        channelId: 'wrong-channel',
        nonce: 'test-nonce',
        ciphertext: 'encrypted-content',
      };

      const result = validateMessage(request, mockChannel, mockAgent.did);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Channel ID mismatch');
    });
  });

  describe('createEncryptedMessage', () => {
    it('creates message with all fields', () => {
      const request: SendMessageRequest = {
        channelId: 'ch-test',
        nonce: 'test-nonce',
        ciphertext: 'encrypted-content',
        ephemeralPubKey: 'ephemeral-key',
      };

      const message = createEncryptedMessage(request, mockAgent.did);

      expect(message.id).toMatch(/^msg-[a-f0-9]{32}$/);
      expect(message.channelId).toBe('ch-test');
      expect(message.sender).toBe(mockAgent.did);
      expect(message.nonce).toBe('test-nonce');
      expect(message.ciphertext).toBe('encrypted-content');
      expect(message.ephemeralPubKey).toBe('ephemeral-key');
      expect(message.timestamp).toBeGreaterThan(0);
    });
  });

  describe('isMessageExpired', () => {
    it('returns false for channel without TTL', () => {
      const message: EncryptedMessage = {
        id: 'msg-1',
        channelId: mockChannel.id,
        sender: mockAgent.did,
        timestamp: Date.now() - 1000000,
        nonce: 'nonce',
        ciphertext: 'cipher',
      };

      expect(isMessageExpired(message, mockChannel)).toBe(false);
    });

    it('returns false for non-expired message', () => {
      const channelWithTTL: PrivateChannel = {
        ...mockChannel,
        metadata: {
          ttl: 3600, // 1 hour
        },
      };

      const message: EncryptedMessage = {
        id: 'msg-1',
        channelId: mockChannel.id,
        sender: mockAgent.did,
        timestamp: Date.now() - 1000,
        nonce: 'nonce',
        ciphertext: 'cipher',
      };

      expect(isMessageExpired(message, channelWithTTL)).toBe(false);
    });

    it('returns true for expired message', () => {
      const channelWithTTL: PrivateChannel = {
        ...mockChannel,
        metadata: {
          ttl: 60, // 1 minute
        },
      };

      const message: EncryptedMessage = {
        id: 'msg-1',
        channelId: mockChannel.id,
        sender: mockAgent.did,
        timestamp: Date.now() - 120000, // 2 minutes ago
        nonce: 'nonce',
        ciphertext: 'cipher',
      };

      expect(isMessageExpired(message, channelWithTTL)).toBe(true);
    });
  });

  describe('getChannelStats', () => {
    it('calculates stats correctly', () => {
      const messages: EncryptedMessage[] = [
        {
          id: 'msg-1',
          channelId: mockChannel.id,
          sender: mockAgent.did,
          timestamp: Date.now() - 1000,
          nonce: 'nonce',
          ciphertext: 'cipher',
        },
        {
          id: 'msg-2',
          channelId: mockChannel.id,
          sender: mockChannel.createdBy,
          timestamp: Date.now(),
          nonce: 'nonce',
          ciphertext: 'cipher',
        },
      ];

      const stats = getChannelStats(mockChannel, messages);

      expect(stats.participantCount).toBe(2);
      expect(stats.messageCount).toBe(2);
      expect(stats.lastActivity).toBe(messages[1].timestamp);
      expect(stats.isNFTGated).toBe(false);
    });

    it('filters expired messages', () => {
      const channelWithTTL: PrivateChannel = {
        ...mockChannel,
        metadata: {
          ttl: 60,
        },
      };

      const messages: EncryptedMessage[] = [
        {
          id: 'msg-1',
          channelId: mockChannel.id,
          sender: mockAgent.did,
          timestamp: Date.now() - 120000, // Expired
          nonce: 'nonce',
          ciphertext: 'cipher',
        },
        {
          id: 'msg-2',
          channelId: mockChannel.id,
          sender: mockAgent.did,
          timestamp: Date.now(),
          nonce: 'nonce',
          ciphertext: 'cipher',
        },
      ];

      const stats = getChannelStats(channelWithTTL, messages);

      expect(stats.messageCount).toBe(1);
    });
  });
});
