/**
 * Tests for Moltbook Agent Privacy Layer - DID Management
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateDID,
  parseDID,
  isValidDID,
  createAgent,
  updateAgentProfile,
  adjustReputation,
  addNFTCredential,
  verifyNFTCredential,
  hasVerifiedNFT,
  createDIDDocument,
} from './did';
import type { MoltbookAgent, AgentRegistrationRequest } from './types';

describe('DID management', () => {
  describe('generateDID', () => {
    it('generates DID from public key', async () => {
      const publicKey = 'test-public-key-base64';
      const did = await generateDID(publicKey);

      expect(did).toMatch(/^did:moltbook:[a-f0-9]{32}$/);
    });

    it('generates consistent DIDs for same public key', async () => {
      const publicKey = 'test-public-key-base64';
      const did1 = await generateDID(publicKey);
      const did2 = await generateDID(publicKey);

      expect(did1).toBe(did2);
    });

    it('generates different DIDs for different public keys', async () => {
      const did1 = await generateDID('key1');
      const did2 = await generateDID('key2');

      expect(did1).not.toBe(did2);
    });
  });

  describe('parseDID', () => {
    it('parses valid moltbook DID', () => {
      const parsed = parseDID('did:moltbook:abc123def456abc123def456abc12345');

      expect(parsed).toEqual({
        method: 'moltbook',
        identifier: 'abc123def456abc123def456abc12345',
      });
    });

    it('returns null for invalid format', () => {
      expect(parseDID('invalid')).toBeNull();
      expect(parseDID('did:moltbook')).toBeNull();
      expect(parseDID('did:moltbook:a:b')).toBeNull();
    });

    it('parses DIDs with different methods', () => {
      const parsed = parseDID('did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH');

      expect(parsed).toEqual({
        method: 'key',
        identifier: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
      });
    });
  });

  describe('isValidDID', () => {
    it('validates correct moltbook DIDs', () => {
      expect(isValidDID('did:moltbook:abc123def456abc123def456abc12345')).toBe(true);
      expect(isValidDID('did:moltbook:00000000000000000000000000000000')).toBe(true);
      expect(isValidDID('did:moltbook:ffffffffffffffffffffffffffffffff')).toBe(true);
    });

    it('rejects invalid DIDs', () => {
      expect(isValidDID('invalid')).toBe(false);
      expect(isValidDID('did:other:abc123')).toBe(false);
      expect(isValidDID('did:moltbook:short')).toBe(false);
      expect(isValidDID('did:moltbook:UPPERCASE123456789012345678901234')).toBe(false);
    });
  });

  describe('updateAgentProfile', () => {
    const baseAgent: MoltbookAgent = {
      did: 'did:moltbook:abc123def456abc123def456abc12345',
      publicKey: 'test-public-key',
      createdAt: Date.now(),
      profile: {
        name: 'Test Agent',
        capabilities: ['test'],
        reputation: 50,
      },
    };

    it('updates allowed fields', () => {
      const updated = updateAgentProfile(baseAgent, {
        name: 'New Name',
        capabilities: ['new', 'capabilities'],
      });

      expect(updated.profile.name).toBe('New Name');
      expect(updated.profile.capabilities).toEqual(['new', 'capabilities']);
    });

    it('preserves reputation', () => {
      const updated = updateAgentProfile(baseAgent, {
        reputation: 100, // Should be ignored
      } as any);

      expect(updated.profile.reputation).toBe(50);
    });

    it('does not mutate original agent', () => {
      updateAgentProfile(baseAgent, { name: 'New Name' });

      expect(baseAgent.profile.name).toBe('Test Agent');
    });
  });

  describe('adjustReputation', () => {
    const baseAgent: MoltbookAgent = {
      did: 'did:moltbook:abc123def456abc123def456abc12345',
      publicKey: 'test-public-key',
      createdAt: Date.now(),
      profile: {
        capabilities: [],
        reputation: 50,
      },
    };

    it('increases reputation', () => {
      const updated = adjustReputation(baseAgent, 10);

      expect(updated.profile.reputation).toBe(60);
    });

    it('decreases reputation', () => {
      const updated = adjustReputation(baseAgent, -20);

      expect(updated.profile.reputation).toBe(30);
    });

    it('clamps to 0 minimum', () => {
      const updated = adjustReputation(baseAgent, -100);

      expect(updated.profile.reputation).toBe(0);
    });

    it('clamps to 100 maximum', () => {
      const updated = adjustReputation(baseAgent, 100);

      expect(updated.profile.reputation).toBe(100);
    });
  });

  describe('NFT credentials', () => {
    const baseAgent: MoltbookAgent = {
      did: 'did:moltbook:abc123def456abc123def456abc12345',
      publicKey: 'test-public-key',
      createdAt: Date.now(),
      profile: {
        capabilities: [],
        reputation: 50,
        nftCredentials: [],
      },
    };

    it('adds NFT credential', () => {
      const updated = addNFTCredential(baseAgent, {
        contract: 'atomicassets',
        assetId: '12345',
        schema: 'moltbook.agent',
      });

      expect(updated.profile.nftCredentials).toHaveLength(1);
      expect(updated.profile.nftCredentials![0]).toEqual({
        contract: 'atomicassets',
        assetId: '12345',
        schema: 'moltbook.agent',
        verified: false,
      });
    });

    it('does not add duplicate credentials', () => {
      const withNFT = addNFTCredential(baseAgent, {
        contract: 'atomicassets',
        assetId: '12345',
        schema: 'moltbook.agent',
      });

      const duplicate = addNFTCredential(withNFT, {
        contract: 'atomicassets',
        assetId: '12345',
        schema: 'moltbook.agent',
      });

      expect(duplicate.profile.nftCredentials).toHaveLength(1);
    });

    it('verifies NFT credential', () => {
      const withNFT = addNFTCredential(baseAgent, {
        contract: 'atomicassets',
        assetId: '12345',
        schema: 'moltbook.agent',
      });

      const verified = verifyNFTCredential(withNFT, 'atomicassets', '12345');

      expect(verified.profile.nftCredentials![0].verified).toBe(true);
      expect(verified.profile.nftCredentials![0].verifiedAt).toBeGreaterThan(0);
    });

    it('checks for verified NFT', () => {
      const withUnverified = addNFTCredential(baseAgent, {
        contract: 'atomicassets',
        assetId: '12345',
        schema: 'moltbook.agent',
      });

      expect(hasVerifiedNFT(withUnverified, 'atomicassets')).toBe(false);

      const withVerified = verifyNFTCredential(withUnverified, 'atomicassets', '12345');

      expect(hasVerifiedNFT(withVerified, 'atomicassets')).toBe(true);
      expect(hasVerifiedNFT(withVerified, 'atomicassets', 'moltbook.agent')).toBe(true);
      expect(hasVerifiedNFT(withVerified, 'atomicassets', 'other.schema')).toBe(false);
    });
  });

  describe('createDIDDocument', () => {
    it('creates W3C compatible DID document', () => {
      const agent: MoltbookAgent = {
        did: 'did:moltbook:abc123def456abc123def456abc12345',
        publicKey: 'test-public-key-base64',
        createdAt: Date.now(),
        profile: {
          capabilities: ['code-review', 'research'],
          reputation: 75,
        },
      };

      const doc = createDIDDocument(agent) as any;

      expect(doc['@context']).toContain('https://www.w3.org/ns/did/v1');
      expect(doc.id).toBe(agent.did);
      expect(doc.verificationMethod).toHaveLength(1);
      expect(doc.verificationMethod[0].type).toBe('X25519KeyAgreementKey2020');
      expect(doc.verificationMethod[0].publicKeyBase64).toBe('test-public-key-base64');
      expect(doc.service[0].capabilities).toEqual(['code-review', 'research']);
    });
  });
});
