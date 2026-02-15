#!/bin/bash

echo "🔄 Switching from Anthropic to Kimi (Moonshot AI)..."
echo "💰 This will reduce your costs from ~$3.00/million tokens to ~$0.60/million tokens!"
echo "📉 That's an 80% cost reduction!"

# Read Kimi API key from ~/.env.kimi
if [ ! -f ~/.env.kimi ]; then
    echo "❌ Error: ~/.env.kimi not found!"
    echo "Please create ~/.env.kimi with:"
    echo "KIMI_API_KEY=your-kimi-api-key-here"
    exit 1
fi

source ~/.env.kimi

if [ -z "$KIMI_API_KEY" ]; then
    echo "❌ Error: KIMI_API_KEY not found in ~/.env.kimi"
    exit 1
fi

echo "✅ Found Kimi API key"

# Generate new gateway token
MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "📝 New Gateway Token: $MOLTBOT_GATEWAY_TOKEN"
echo "💾 SAVE THIS TOKEN! You'll need it to access your agent."

# Copy Kimi template
echo "📄 Setting up Kimi configuration..."
cp moltbot-kimi.json.template moltbot.json.template

# Build
echo "🔨 Building..."
npm run build

# Deploy
echo "☁️  Deploying..."
npx wrangler deploy

# Set Kimi secrets
echo "🔑 Setting Kimi secrets..."
echo "$KIMI_API_KEY" | npx wrangler secret put KIMI_API_KEY
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
echo "true" | npx wrangler secret put DEV_MODE
echo "true" | npx wrangler secret put DEBUG_ROUTES

# Remove Anthropic key
echo "🗑️  Removing Anthropic API key..."
npx wrangler secret delete ANTHROPIC_API_KEY 2>/dev/null || true

# Redeploy
echo "🔄 Redeploying with new configuration..."
npx wrangler deploy

echo ""
echo "🎉 Successfully switched to Kimi (Moonshot AI)!"
echo ""
echo "🔗 Access your agent at: https://moltbot-anthropic.yksanjo.workers.dev/?token=$MOLTBOT_GATEWAY_TOKEN"
echo ""
echo "💰 COST SAVINGS ACHIEVED:"
echo "   - Before (Claude Sonnet): ~$3.00 per million tokens"
echo "   - Now (Kimi): ~$0.60 per million tokens"
echo "   - Savings: 80% reduction!"
echo ""
echo "📊 Example:"
echo "   For 1 million tokens:"
echo "   - Kimi: $0.60"
echo "   - Claude Sonnet: $3.00 (5x more expensive!)"
echo "   - Claude Opus: $15.00 (25x more expensive!)"
echo ""
echo "💡 Tips:"
echo "   1. Kimi is excellent for Chinese and English tasks"
echo "   2. Bookmark the URL above"
echo "   3. Use /_admin/ for device management"
echo "   4. Check logs with: npx wrangler tail"