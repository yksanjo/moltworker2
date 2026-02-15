# Cloudflare AI Gateway Setup with Your Global Key

## Your Global Key
You provided: `3c7aa2467b465250e3329431b3d6b3c5e4276`

## What is AI Gateway?
Cloudflare AI Gateway acts as a proxy between your AI applications and AI providers, providing:
- **Centralized analytics** - Track costs and usage across providers
- **Caching** - Reduce costs by caching frequent requests
- **Fallback routing** - Automatically switch providers if one fails
- **Unified billing** - Pay through Cloudflare instead of multiple providers

## Step 1: Set Up AI Gateway in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **AI** > **AI Gateway**
3. Click **"Create a gateway"**
4. Name your gateway (e.g., "moltbot-gateway")
5. Add AI providers:
   - **Anthropic Claude** (recommended for OpenClaw)
   - **OpenAI** (optional)
   - **Google AI** (optional)
6. Configure your gateway settings

## Step 2: Get Your AI Gateway Credentials

After creating the gateway, you'll get:
- **Gateway ID**: Found in gateway URL
- **Gateway URL**: `https://gateway.ai.cloudflare.com/v1/ACCOUNT_ID/GATEWAY_NAME/openai`
- **API Key**: Use your global key or create a scoped token

## Step 3: Configure Moltworker to Use AI Gateway

### Option A: Use Your Global Key (Simpler)
```bash
cd moltworker

# Set AI Gateway base URL (replace with your actual gateway URL)
# Format: https://gateway.ai.cloudflare.com/v1/ACCOUNT_ID/GATEWAY_NAME/openai
export AI_GATEWAY_BASE_URL="https://gateway.ai.cloudflare.com/v1/a1ede525e60bbe56f5af3960df6e34c7/moltbot-gateway/openai"

# Set your global key as the API key
echo "3c7aa2467b465250e3329431b3d6b3c5e4276" | npx wrangler secret put AI_GATEWAY_API_KEY
echo "$AI_GATEWAY_BASE_URL" | npx wrangler secret put AI_GATEWAY_BASE_URL

# Redeploy
npm run deploy
```

### Option B: Use Anthropic Directly via AI Gateway
If you want to use Anthropic Claude through AI Gateway:

1. Add Anthropic API key to AI Gateway configuration
2. Update Moltbot configuration to use AI Gateway endpoint for Anthropic

## Step 4: Update OpenClaw Configuration

Edit `moltbot.json.template` to use AI Gateway:

```json
{
  "anthropic": {
    "apiKey": "${ANTHROPIC_API_KEY}",
    "baseURL": "${AI_GATEWAY_BASE_URL}/anthropic"
  }
}
```

## Step 5: Test AI Gateway

1. Access your Moltbot: `https://openclaw-kimi.yksanjo.workers.dev/?token=YOUR_TOKEN`
2. Ask a question that requires AI processing
3. Check AI Gateway analytics in Cloudflare dashboard

## Current Setup vs AI Gateway Setup

### Current Setup (Direct to DeepSeek)
```
Moltbot → DeepSeek API
- Pros: Simple, direct
- Cons: No analytics, no caching, single provider
```

### AI Gateway Setup
```
Moltbot → Cloudflare AI Gateway → Multiple AI Providers
- Pros: Analytics, caching, fallback, unified billing
- Cons: Additional configuration
```

## Using Your Global Key

Your global key (`3c7aa2467b465250e3329431b3d6b3c5e4276`) can be used as:
1. **AI Gateway API key** - For authenticating to AI Gateway
2. **Cloudflare API token** - For Wrangler (though OAuth is better)

## Recommended Approach

1. **Start with current setup** (DeepSeek direct) - It's working now
2. **Set up AI Gateway separately** in Cloudflare dashboard
3. **Test AI Gateway** with a simple curl command
4. **Migrate Moltbot** to use AI Gateway when ready

## Testing AI Gateway

```bash
# Test AI Gateway with curl
curl https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY/openai/v1/chat/completions \
  -H "Authorization: Bearer 3c7aa2467b465250e3329431b3d6b3c5e4276" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Troubleshooting

### If AI Gateway returns 401:
- Check your global key is valid
- Verify key has AI Gateway permissions
- Try creating a scoped token instead

### If Moltbot can't connect to AI Gateway:
- Check gateway URL is correct
- Verify gateway is active in dashboard
- Check worker logs: `npx wrangler tail`

## Benefits of AI Gateway for Moltbot

1. **Cost Savings**: Caching reduces duplicate API calls
2. **Reliability**: Automatic fallback between providers
3. **Observability**: See which models are being used, costs, latency
4. **Security**: Centralized API key management
5. **Flexibility**: Easy to switch providers without code changes

## Next Steps

1. [ ] Set up AI Gateway in Cloudflare dashboard
2. [ ] Test AI Gateway with curl
3. [ ] Update Moltworker secrets for AI Gateway
4. [ ] Redeploy and test
5. [ ] Monitor AI Gateway analytics