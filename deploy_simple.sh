#!/bin/bash

echo "🚀 Simple Moltbot deployment..."

# Generate gateway token
MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "📝 Your Gateway Token: $MOLTBOT_GATEWAY_TOKEN"
echo "💾 SAVE THIS TOKEN!"

# Build
echo "🔨 Building..."
npm run build

# Deploy
echo "☁️  Deploying..."
npx wrangler deploy

# Set secrets
echo "🔑 Setting secrets..."
echo "echo "YOUR_API_KEY" | npx wrangler secret put ANTHROPIC_API_KEY
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
echo "true" | npx wrangler secret put DEV_MODE
echo "true" | npx wrangler secret put DEBUG_ROUTES

# Redeploy with secrets
echo "🔄 Redeploying with secrets..."
npx wrangler deploy

echo ""
echo "🎉 Deployment complete!"
echo "🔗 Access at: https://moltbot-anthropic.yksanjo.workers.dev/?token=$MOLTBOT_GATEWAY_TOKEN"
