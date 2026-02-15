#!/bin/bash

echo "🚀 Deploying Moltbot with DeepSeek API (Most Affordable Option)..."

# Generate gateway token
MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "📝 Your Gateway Token: $MOLTBOT_GATEWAY_TOKEN"
echo "💾 SAVE THIS TOKEN! You'll need it to access your agent."

# Prompt for DeepSeek API key
echo "🔑 Please enter your DeepSeek API key (get one from https://platform.deepseek.com):"
echo "   (Press Enter to skip and keep using current provider)"
read -r DEEPSEEK_API_KEY

if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "⚠️  No DeepSeek API key provided. Keeping current configuration."
    exit 0
fi

# Copy DeepSeek template
echo "📄 Setting up DeepSeek configuration..."
cp moltbot-deepseek.json.template moltbot.json.template

# Build
echo "🔨 Building..."
npm run build

# Deploy
echo "☁️  Deploying..."
npx wrangler deploy

# Set secrets - REMOVE Anthropic key, ADD DeepSeek key
echo "🔑 Setting secrets..."
echo "$DEEPSEEK_API_KEY" | npx wrangler secret put DEEPSEEK_API_KEY
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
echo "💰 AMAZING COST SAVINGS:"
echo "   - DeepSeek: ~$0.14 per million tokens"
echo "   - Claude Sonnet: ~$3.00 per million tokens"
echo "   - Claude Opus: ~$15.00 per million tokens"
echo "   ✅ You're saving ~95-99% compared to Anthropic!"
echo ""
echo "📊 Example Savings:"
echo "   For 1 million tokens:"
echo "   - DeepSeek: $0.14"
echo "   - Claude Sonnet: $3.00 (21x more expensive!)"
echo "   - Claude Opus: $15.00 (107x more expensive!)"
echo ""
echo "💡 Tips:"
echo "   1. DeepSeek is excellent for coding and reasoning tasks"
echo "   2. Bookmark the URL above"
echo "   3. Use /_admin/ for device management"
echo "   4. Check logs with: npx wrangler tail"