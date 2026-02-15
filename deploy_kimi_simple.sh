#!/bin/bash

echo "🚀 Deploying Moltbot with Kimi API (Moonshot AI)..."

# Generate gateway token
MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "📝 Your Gateway Token: $MOLTBOT_GATEWAY_TOKEN"
echo "💾 SAVE THIS TOKEN! You'll need it to access your agent."

# Get Kimi API key from environment or prompt
if [ -f ~/.env.kimi ]; then
    source ~/.env.kimi
    echo "✅ Found Kimi API key in ~/.env.kimi"
else
    echo "❌ No Kimi API key found in ~/.env.kimi"
    echo "Please enter your Kimi API key (get one from https://platform.moonshot.cn):"
    read -r KIMI_API_KEY
fi

# Copy Kimi template
echo "📄 Setting up Kimi configuration..."
cp moltbot-kimi.json.template moltbot.json.template

# Build
echo "🔨 Building..."
npm run build

# Deploy
echo "☁️  Deploying..."
npx wrangler deploy

# Set secrets
echo "🔑 Setting secrets..."
echo "$KIMI_API_KEY" | npx wrangler secret put KIMI_API_KEY
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
echo "true" | npx wrangler secret put DEV_MODE
echo "true" | npx wrangler secret put DEBUG_ROUTES

# Remove Anthropic key if it exists
echo "🗑️  Removing Anthropic API key to prevent accidental usage..."
npx wrangler secret delete ANTHROPIC_API_KEY 2>/dev/null || true

# Redeploy with secrets
echo "🔄 Redeploying with secrets..."
npx wrangler deploy

echo ""
echo "🎉 Deployment complete!"
echo "🔗 Access your agent at: https://moltbot-anthropic.yksanjo.workers.dev/?token=$MOLTBOT_GATEWAY_TOKEN"
echo ""
echo "📊 Cost Comparison:"
echo "   - Kimi: ~$0.60 per million tokens"
echo "   - Claude Sonnet: ~$3.00 per million tokens"
echo "   - Claude Opus: ~$15.00 per million tokens"
echo "   ✅ You're saving ~80-96% compared to Anthropic!"
echo ""
echo "💡 Tips:"
echo "   1. Bookmark the URL above"
echo "   2. Use /_admin/ for device management"
echo "   3. Check logs with: npx wrangler tail"