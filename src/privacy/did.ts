/**
 * Moltbook Agent Privacy Layer - DID (Decentralized Identifier) Management
 * Implements did:moltbook method for agent identity
 */

import type {
  MoltbookAgent,
  AgentProfile,
  AgentRegistrationRequest,
  AgentRegistrationResponse,
} from './types';
import { generateId, sha256, verifySignature } from './crypto';

// DID Method constants
const DID_METHOD = 'moltbook';
const DID_PREFIX = `did:${DID_METHOD}:`;

/**
 * Generate a new DID from a public key
 * Format: did:moltbook:{base58-encoded-hash}
 */
export async function generateDID(publicKey: string): Promise<string> {
  // Hash the public key to create a unique identifier
  const hash = await sha256(publicKey);
  // Take first 32 chars of the hash for the identifier
  const identifier = hash.slice(0, 32);
  return `${DID_PREFIX}${identifier}`;
}

/**
 * Parse a DID string into its components
 */
export function parseDID(did: string): { method: string; identifier: string } | null {
  if (!did.startsWith('did:')) {
    return null;
  }

  const parts = did.split(':');
  if (parts.length !== 3) {
    return null;
  }

  return {
    method: parts[1],
    identifier: parts[2],
  };
}

/**
 * Validate a DID format
 */
export function isValidDID(did: string): boolean {
  const parsed = parseDID(did);
  if (!parsed) return false;

  // Must be moltbook method
  if (parsed.method !== DID_METHOD) return false;

  // Identifier must be 32 hex chars
  if (!/^[a-f0-9]{32}$/.test(parsed.identifier)) return false;

  return true;
}

/**
 * Create a new agent from registration request
 */
export async function createAgent(
  request: AgentRegistrationRequest
): Promise<MoltbookAgent> {
  // Validate the request
  if (!request.publicKey) {
    throw new Error('Public key is required');
  }

  if (!request.signature) {
    throw new Error('Signature is required');
  }

  // Verify the signature
  const payload = JSON.stringify({
    publicKey: request.publicKey,
    profile: request.profile,
  });

  const isValid = await verifySignature(payload, request.signature, request.publicKey);
  if (!isValid) {
    throw new Error('Invalid signature');
  }

  // Generate DID
  const did = await generateDID(request.publicKey);

  // Create agent
  const agent: MoltbookAgent = {
    did,
    publicKey: request.publicKey,
    createdAt: Date.now(),
    profile: {
      ...request.profile,
      reputation: 50, // Start with neutral reputation
    },
  };

  return agent;
}

/**
 * Create registration response
 */
export function createRegistrationResponse(agent: MoltbookAgent): AgentRegistrationResponse {
  return {
    did: agent.did,
    agent,
  };
}

/**
 * Update agent profile
 */
export function updateAgentProfile(
  agent: MoltbookAgent,
  updates: Partial<AgentProfile>
): MoltbookAgent {
  return {
    ...agent,
    profile: {
      ...agent.profile,
      ...updates,
      // Never allow direct reputation updates through this function
      reputation: agent.profile.reputation,
    },
  };
}

/**
 * Adjust agent reputation (clamped to 0-100)
 */
export function adjustReputation(agent: MoltbookAgent, delta: number): MoltbookAgent {
  const newReputation = Math.max(0, Math.min(100, agent.profile.reputation + delta));
  return {
    ...agent,
    profile: {
      ...agent.profile,
      reputation: newReputation,
    },
  };
}

/**
 * Add NFT credential to agent
 */
export function addNFTCredential(
  agent: MoltbookAgent,
  credential: {
    contract: string;
    assetId: string;
    schema: string;
  }
): MoltbookAgent {
  const nftCredentials = agent.profile.nftCredentials || [];

  // Check if already exists
  const exists = nftCredentials.some(
    c => c.contract === credential.contract && c.assetId === credential.assetId
  );

  if (exists) {
    return agent;
  }

  return {
    ...agent,
    profile: {
      ...agent.profile,
      nftCredentials: [
        ...nftCredentials,
        {
          ...credential,
          verified: false,
        },
      ],
    },
  };
}

/**
 * Mark NFT credential as verified
 */
export function verifyNFTCredential(
  agent: MoltbookAgent,
  contract: string,
  assetId: string
): MoltbookAgent {
  const nftCredentials = agent.profile.nftCredentials || [];

  return {
    ...agent,
    profile: {
      ...agent.profile,
      nftCredentials: nftCredentials.map(c =>
        c.contract === contract && c.assetId === assetId
          ? { ...c, verified: true, verifiedAt: Date.now() }
          : c
      ),
    },
  };
}

/**
 * Check if agent has a specific verified NFT
 */
export function hasVerifiedNFT(
  agent: MoltbookAgent,
  contract: string,
  schema?: string
): boolean {
  const nftCredentials = agent.profile.nftCredentials || [];

  return nftCredentials.some(c => {
    if (!c.verified) return false;
    if (c.contract !== contract) return false;
    if (schema && c.schema !== schema) return false;
    return true;
  });
}

/**
 * Create a DID Document (W3C DID Core spec compatible)
 */
export function createDIDDocument(agent: MoltbookAgent): object {
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/x25519-2020/v1',
    ],
    id: agent.did,
    verificationMethod: [
      {
        id: `${agent.did}#key-1`,
        type: 'X25519KeyAgreementKey2020',
        controller: agent.did,
        publicKeyBase64: agent.publicKey,
      },
    ],
    keyAgreement: [`${agent.did}#key-1`],
    service: [
      {
        id: `${agent.did}#moltbook-agent`,
        type: 'MoltbookAgentService',
        serviceEndpoint: 'https://moltbook.app/agents',
        capabilities: agent.profile.capabilities,
        reputation: agent.profile.reputation,
      },
    ],
  };
}

/**
 * Resolve a DID to its agent (stub - actual implementation would query storage)
 */
export async function resolveDID(
  did: string,
  getAgent: (did: string) => Promise<MoltbookAgent | null>
): Promise<{ agent: MoltbookAgent; document: object } | null> {
  if (!isValidDID(did)) {
    return null;
  }

  const agent = await getAgent(did);
  if (!agent) {
    return null;
  }

  return {
    agent,
    document: createDIDDocument(agent),
  };
}
