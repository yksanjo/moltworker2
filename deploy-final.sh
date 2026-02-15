#!/bin/bash

# Final deployment script for MoltWorker with DeepSeek
# Using Cloudflare Global API Key

set -e

echo "🚀 MOLTWORKER + DEEPSEEK DEPLOYMENT"
echo "==================================="
echo "Account: yksanjo@gmail.com"
echo "Account ID: a1ede525e60bbe56f5af3960df6e34c7"
echo ""

# Build the project
echo "🔨 Building project..."
npm run build

# Generate gateway token
echo "🔐 Generating gateway token..."
export MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "✅ YOUR GATEWAY TOKEN: $MOLTBOT_GATEWAY_TOKEN"
echo "⚠️  SAVE THIS TOKEN! You'll need it to access your Moltbot."
echo ""

# Set environment variables for deployment
export CLOUDFLARE_EMAIL=yksanjo@gmail.com
export CLOUDFLARE_API_KEY=3c7aa2467b465250e3329431b3d6b3c5e4276
export CLOUDFLARE_ACCOUNT_ID=a1ede525e60bbe56f5af3960df6e34c7

echo "📦 Setting DeepSeek API key as secret..."
echo "sk-1add0c66bb594522b6597e164fcdd263" | npx wrangler secret put DEEPSEEK_API_KEY

echo "📦 Setting gateway token as secret..."
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN

echo ""
echo "☁️  DEPLOYING TO CLOUDFLARE WORKERS..."
echo "This may take a few minutes..."
echo ""

# Deploy
npm run deploy

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "Your Moltbot with DeepSeek is now live!"
echo ""
echo "🔗 Access your Moltbot at:"
echo "https://moltbot-sandbox.YOUR_SUBDOMAIN.workers.dev/?token=$MOLTBOT_GATEWAY_TOKEN"
echo ""
echo "Replace YOUR_SUBDOMAIN with your actual Cloudflare subdomain."
echo "The full URL will be shown in the deployment output above."
echo ""
echo "📋 Next: WhatsApp & Gmail integrations!"