#!/bin/bash

echo "🆕 Fresh Kimi Deployment (No Container Conflicts)..."

# Generate gateway token
MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "📝 Your Gateway Token: $MOLTBOT_GATEWAY_TOKEN"
echo "💾 SAVE THIS TOKEN! You'll need it to access your agent."

# Read Kimi API key
if [ ! -f ~/.env.kimi ]; then
    echo "❌ Error: ~/.env.kimi not found!"
    echo "Please create ~/.env.kimi with: KIMI_API_KEY=your-key"
    exit 1
fi

source ~/.env.kimi

if [ -z "$KIMI_API_KEY" ]; then
    echo "❌ Error: KIMI_API_KEY not found in ~/.env.kimi"
    exit 1
fi

echo "✅ Using Kimi API key from ~/.env.kimi"

# Use simple wrangler config (no containers)
echo "📄 Using simple configuration (no containers)..."
cp wrangler-simple.jsonc wrangler.jsonc

# Copy Kimi template
echo "📄 Setting up Kimi configuration..."
cp moltbot-kimi.json.template moltbot.json.template

# Build
echo "🔨 Building..."
npm run build

# Deploy with new name to avoid conflicts
echo "☁️  Deploying as 'moltbot-kimi'..."
npx wrangler deploy --name moltbot-kimi

# Set secrets
echo "🔑 Setting secrets..."
echo "$KIMI_API_KEY" | npx wrangler secret put KIMI_API_KEY
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
echo "true" | npx wrangler secret put DEV_MODE
echo "true" | npx wrangler secret put DEBUG_ROUTES

# Redeploy
echo "🔄 Redeploying with secrets..."
npx wrangler deploy --name moltbot-kimi

echo ""
echo "🎉 Fresh Kimi deployment complete!"
echo "🔗 Access your agent at: https://moltbot-kimi.yksanjo.workers.dev/?token=$MOLTBOT_GATEWAY_TOKEN"
echo ""
echo "💰 Cost Savings:"
echo "   - Kimi: ~$0.60 per million tokens"
echo "   - Claude Sonnet: ~$3.00 per million tokens (5x more expensive!)"
echo "   - Claude Opus: ~$15.00 per million tokens (25x more expensive!)"
echo ""
echo "💡 Kimi Features:"
echo "   - 128K context window"
echo "   - Excellent Chinese/English support"
echo "   - OpenAI-compatible API"
echo ""
echo "📱 Access:"
echo "   1. Web UI: Bookmark the URL above"
echo "   2. Admin: Add /_admin/ to the URL"
echo "   3. Logs: npx wrangler tail"