/**
 * Moltbook Agent Privacy Layer - API Routes
 * RESTful API for agent registration, channel management, and messaging
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type {
  AgentRegistrationRequest,
  CreateChannelRequest,
  SendMessageRequest,
  PrivacyAPIResponse,
  MoltbookAgent,
  PrivateChannel,
  ChannelInvitation,
  EncryptedMessage,
} from './types';
import { createAgent, createRegistrationResponse, isValidDID, updateAgentProfile, addNFTCredential, verifyNFTCredential } from './did';
import { createChannel, canAccessChannel, acceptInvitation, rejectInvitation, addParticipant, removeParticipant, validateMessage, createEncryptedMessage, getChannelStats } from './channels';
import { createPrivacyStorage, PrivacyStorage } from './storage';

// Type for the Hono app environment
interface PrivacyEnv {
  Bindings: {
    PRIVACY_BUCKET: R2Bucket;
  };
  Variables: {
    storage: PrivacyStorage;
    agentDID?: string;
  };
}

// Create the privacy router
const privacy = new Hono<PrivacyEnv>();

// Middleware to initialize storage
privacy.use('*', async (c, next) => {
  const bucket = c.env.PRIVACY_BUCKET;
  if (!bucket) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Privacy storage not configured',
      hint: 'Add PRIVACY_BUCKET R2 binding to wrangler.jsonc',
    }, 503);
  }

  c.set('storage', createPrivacyStorage(bucket));
  await next();
});

// Helper to get storage from context
function getStorage(c: Context<PrivacyEnv>): PrivacyStorage {
  return c.get('storage');
}

// Helper to get authenticated agent DID from header
function getAgentDID(c: Context<PrivacyEnv>): string | null {
  const did = c.req.header('X-Agent-DID');
  if (!did || !isValidDID(did)) {
    return null;
  }
  return did;
}

// Helper to require authenticated agent
async function requireAgent(c: Context<PrivacyEnv>): Promise<MoltbookAgent | null> {
  const did = getAgentDID(c);
  if (!did) {
    return null;
  }

  const storage = getStorage(c);
  return storage.getAgent(did);
}

// ============ Agent Registration ============

/**
 * POST /agents/register
 * Register a new agent with public key
 */
privacy.post('/agents/register', async (c) => {
  try {
    const body = await c.req.json<AgentRegistrationRequest>();

    // Validate request
    if (!body.publicKey) {
      return c.json<PrivacyAPIResponse>({
        success: false,
        error: 'Public key is required',
      }, 400);
    }

    const storage = getStorage(c);

    // Create agent
    const agent = await createAgent(body);

    // Check if DID already exists
    const existing = await storage.getAgent(agent.did);
    if (existing) {
      return c.json<PrivacyAPIResponse>({
        success: false,
        error: 'Agent with this public key already registered',
        hint: 'Use the existing DID or generate a new key pair',
      }, 409);
    }

    // Save agent
    await storage.saveAgent(agent);

    return c.json<PrivacyAPIResponse>({
      success: true,
      data: createRegistrationResponse(agent),
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: message,
    }, 400);
  }
});

/**
 * GET /agents/:did
 * Get agent public profile
 */
privacy.get('/agents/:did', async (c) => {
  const did = c.req.param('did');

  if (!isValidDID(did)) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Invalid DID format',
    }, 400);
  }

  const storage = getStorage(c);
  const agent = await storage.getAgent(did);

  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Agent not found',
    }, 404);
  }

  // Return public profile (without private data)
  return c.json<PrivacyAPIResponse>({
    success: true,
    data: {
      did: agent.did,
      publicKey: agent.publicKey,
      profile: {
        name: agent.profile.name,
        capabilities: agent.profile.capabilities,
        reputation: agent.profile.reputation,
        nftCredentials: agent.profile.nftCredentials?.filter(c => c.verified),
      },
    },
  });
});

/**
 * PATCH /agents/:did
 * Update agent profile (requires auth)
 */
privacy.patch('/agents/:did', async (c) => {
  const did = c.req.param('did');
  const authDID = getAgentDID(c);

  if (!authDID || authDID !== did) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  try {
    const updates = await c.req.json();
    const storage = getStorage(c);

    const agent = await storage.getAgent(did);
    if (!agent) {
      return c.json<PrivacyAPIResponse>({
        success: false,
        error: 'Agent not found',
      }, 404);
    }

    const updatedAgent = updateAgentProfile(agent, updates);
    await storage.saveAgent(updatedAgent);

    return c.json<PrivacyAPIResponse>({
      success: true,
      data: updatedAgent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: message,
    }, 400);
  }
});

/**
 * POST /agents/:did/nft
 * Add NFT credential to agent
 */
privacy.post('/agents/:did/nft', async (c) => {
  const did = c.req.param('did');
  const authDID = getAgentDID(c);

  if (!authDID || authDID !== did) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Unauthorized',
    }, 401);
  }

  try {
    const { contract, assetId, schema } = await c.req.json();

    if (!contract || !assetId || !schema) {
      return c.json<PrivacyAPIResponse>({
        success: false,
        error: 'contract, assetId, and schema are required',
      }, 400);
    }

    const storage = getStorage(c);
    const agent = await storage.getAgent(did);

    if (!agent) {
      return c.json<PrivacyAPIResponse>({
        success: false,
        error: 'Agent not found',
      }, 404);
    }

    const updatedAgent = addNFTCredential(agent, { contract, assetId, schema });
    await storage.saveAgent(updatedAgent);

    return c.json<PrivacyAPIResponse>({
      success: true,
      data: updatedAgent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: message,
    }, 400);
  }
});

// ============ Channel Management ============

/**
 * POST /channels
 * Create a new private channel
 */
privacy.post('/channels', async (c) => {
  const agent = await requireAgent(c);
  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
      hint: 'Include X-Agent-DID header',
    }, 401);
  }

  try {
    const body = await c.req.json<CreateChannelRequest & { privateKey: string }>();
    const storage = getStorage(c);

    // Note: In production, the private key should be on the client
    // and channel key encryption should happen client-side
    const { channel, invitations } = await createChannel(
      body,
      agent.did,
      body.privateKey,
      (did) => storage.getAgent(did)
    );

    // Save channel and invitations
    await storage.saveChannel(channel);
    for (const invitation of invitations) {
      await storage.saveInvitation(invitation);
    }

    return c.json<PrivacyAPIResponse>({
      success: true,
      data: { channel, invitations },
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: message,
    }, 400);
  }
});

/**
 * GET /channels
 * List channels for authenticated agent
 */
privacy.get('/channels', async (c) => {
  const agent = await requireAgent(c);
  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
    }, 401);
  }

  const storage = getStorage(c);
  const channels = await storage.getAgentChannelsWithDetails(agent.did);

  // Add stats to each channel
  const channelsWithStats = await Promise.all(
    channels.map(async (channel) => {
      const messages = await storage.getChannelMessages(channel.id, { limit: 100 });
      return {
        ...channel,
        stats: getChannelStats(channel, messages),
      };
    })
  );

  return c.json<PrivacyAPIResponse>({
    success: true,
    data: channelsWithStats,
  });
});

/**
 * GET /channels/:id
 * Get channel details
 */
privacy.get('/channels/:id', async (c) => {
  const channelId = c.req.param('id');
  const agent = await requireAgent(c);

  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
    }, 401);
  }

  const storage = getStorage(c);
  const channel = await storage.getChannel(channelId);

  if (!channel) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Channel not found',
    }, 404);
  }

  // Check access
  const access = await canAccessChannel(channel, agent);
  if (!access.allowed) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: access.reason || 'Access denied',
    }, 403);
  }

  const messages = await storage.getChannelMessages(channelId, { limit: 100 });

  return c.json<PrivacyAPIResponse>({
    success: true,
    data: {
      channel,
      stats: getChannelStats(channel, messages),
    },
  });
});

/**
 * POST /channels/:id/join
 * Join a channel (for open or NFT-gated channels)
 */
privacy.post('/channels/:id/join', async (c) => {
  const channelId = c.req.param('id');
  const agent = await requireAgent(c);

  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
    }, 401);
  }

  const storage = getStorage(c);
  const channel = await storage.getChannel(channelId);

  if (!channel) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Channel not found',
    }, 404);
  }

  // Check if already a participant
  if (channel.participants.includes(agent.did)) {
    return c.json<PrivacyAPIResponse>({
      success: true,
      data: channel,
    });
  }

  // Check access
  const access = await canAccessChannel(channel, agent);
  if (!access.allowed) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: access.reason || 'Access denied',
    }, 403);
  }

  // Add participant
  const updatedChannel = addParticipant(channel, agent.did);
  await storage.saveChannel(updatedChannel);

  return c.json<PrivacyAPIResponse>({
    success: true,
    data: updatedChannel,
  });
});

/**
 * POST /channels/:id/leave
 * Leave a channel
 */
privacy.post('/channels/:id/leave', async (c) => {
  const channelId = c.req.param('id');
  const agent = await requireAgent(c);

  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
    }, 401);
  }

  const storage = getStorage(c);
  const channel = await storage.getChannel(channelId);

  if (!channel) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Channel not found',
    }, 404);
  }

  try {
    const updatedChannel = removeParticipant(channel, agent.did, agent.did);
    await storage.saveChannel(updatedChannel);

    return c.json<PrivacyAPIResponse>({
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: message,
    }, 400);
  }
});

// ============ Invitations ============

/**
 * GET /invitations
 * List pending invitations for authenticated agent
 */
privacy.get('/invitations', async (c) => {
  const agent = await requireAgent(c);
  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
    }, 401);
  }

  const storage = getStorage(c);
  const invitations = await storage.getAgentInvitations(agent.did);

  return c.json<PrivacyAPIResponse>({
    success: true,
    data: invitations,
  });
});

/**
 * POST /invitations/:id/accept
 * Accept a channel invitation
 */
privacy.post('/invitations/:id/accept', async (c) => {
  const invitationId = c.req.param('id');
  const agent = await requireAgent(c);

  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
    }, 401);
  }

  const storage = getStorage(c);
  const invitation = await storage.getInvitation(invitationId);

  if (!invitation) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Invitation not found',
    }, 404);
  }

  if (invitation.invitee !== agent.did) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'This invitation is not for you',
    }, 403);
  }

  try {
    const acceptedInvitation = acceptInvitation(invitation);
    await storage.updateInvitation(acceptedInvitation);

    // Add to channel participants
    const channel = await storage.getChannel(invitation.channelId);
    if (channel) {
      const updatedChannel = addParticipant(channel, agent.did);
      await storage.saveChannel(updatedChannel);
    }

    return c.json<PrivacyAPIResponse>({
      success: true,
      data: {
        invitation: acceptedInvitation,
        encryptedChannelKey: acceptedInvitation.encryptedChannelKey,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: message,
    }, 400);
  }
});

/**
 * POST /invitations/:id/reject
 * Reject a channel invitation
 */
privacy.post('/invitations/:id/reject', async (c) => {
  const invitationId = c.req.param('id');
  const agent = await requireAgent(c);

  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
    }, 401);
  }

  const storage = getStorage(c);
  const invitation = await storage.getInvitation(invitationId);

  if (!invitation) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Invitation not found',
    }, 404);
  }

  if (invitation.invitee !== agent.did) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'This invitation is not for you',
    }, 403);
  }

  try {
    const rejectedInvitation = rejectInvitation(invitation);
    await storage.updateInvitation(rejectedInvitation);

    return c.json<PrivacyAPIResponse>({
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: message,
    }, 400);
  }
});

// ============ Messaging ============

/**
 * POST /channels/:id/messages
 * Send an encrypted message to a channel
 */
privacy.post('/channels/:id/messages', async (c) => {
  const channelId = c.req.param('id');
  const agent = await requireAgent(c);

  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
    }, 401);
  }

  const storage = getStorage(c);
  const channel = await storage.getChannel(channelId);

  if (!channel) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Channel not found',
    }, 404);
  }

  try {
    const body = await c.req.json<SendMessageRequest>();

    // Validate message
    const validation = validateMessage(body, channel, agent.did);
    if (!validation.valid) {
      return c.json<PrivacyAPIResponse>({
        success: false,
        error: validation.error,
      }, 400);
    }

    // Create and save message
    const message = createEncryptedMessage(body, agent.did);
    await storage.saveMessage(message);

    return c.json<PrivacyAPIResponse>({
      success: true,
      data: message,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: message,
    }, 400);
  }
});

/**
 * GET /channels/:id/messages
 * Get messages from a channel
 */
privacy.get('/channels/:id/messages', async (c) => {
  const channelId = c.req.param('id');
  const agent = await requireAgent(c);

  if (!agent) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Authentication required',
    }, 401);
  }

  const storage = getStorage(c);
  const channel = await storage.getChannel(channelId);

  if (!channel) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: 'Channel not found',
    }, 404);
  }

  // Check access
  const access = await canAccessChannel(channel, agent);
  if (!access.allowed) {
    return c.json<PrivacyAPIResponse>({
      success: false,
      error: access.reason || 'Access denied',
    }, 403);
  }

  // Parse query params
  const limit = parseInt(c.req.query('limit') || '50');
  const before = c.req.query('before') ? parseInt(c.req.query('before')!) : undefined;
  const after = c.req.query('after') ? parseInt(c.req.query('after')!) : undefined;

  const messages = await storage.getChannelMessages(channelId, {
    limit: Math.min(limit, 100),
    before,
    after,
  });

  return c.json<PrivacyAPIResponse>({
    success: true,
    data: messages,
  });
});

// ============ Search ============

/**
 * GET /agents/search
 * Search for agents by capabilities, reputation, or NFT ownership
 */
privacy.get('/agents/search', async (c) => {
  const storage = getStorage(c);

  const capabilities = c.req.query('capabilities')?.split(',');
  const minReputation = c.req.query('minReputation')
    ? parseInt(c.req.query('minReputation')!)
    : undefined;
  const nftContract = c.req.query('nftContract');
  const nftSchema = c.req.query('nftSchema');

  const agents = await storage.searchAgents({
    capabilities,
    minReputation,
    hasNFT: nftContract ? { contract: nftContract, schema: nftSchema } : undefined,
  });

  // Return only public profiles
  const publicAgents = agents.map(agent => ({
    did: agent.did,
    publicKey: agent.publicKey,
    profile: {
      name: agent.profile.name,
      capabilities: agent.profile.capabilities,
      reputation: agent.profile.reputation,
    },
  }));

  return c.json<PrivacyAPIResponse>({
    success: true,
    data: publicAgents,
  });
});

export { privacy };
export default privacy;
