#!/bin/bash

# MoltWorker with DeepSeek Deployment Script
# This script helps deploy MoltWorker with DeepSeek API

set -e

echo "🚀 MoltWorker + DeepSeek Deployment Script"
echo "=========================================="

# Check if wrangler is installed
if ! command -v npx wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
echo "🔐 Checking Cloudflare login..."
if ! npx wrangler whoami &> /dev/null; then
    echo "⚠️  Not logged in to Cloudflare. Please log in:"
    npx wrangler login
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Set DeepSeek API key as secret
echo "🔑 Setting DeepSeek API key as secret..."
echo "sk-1add0c66bb594522b6597e164fcdd263" | npx wrangler secret put DEEPSEEK_API_KEY

# Generate and set gateway token
echo "🔐 Generating gateway token..."
export MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "Your gateway token: $MOLTBOT_GATEWAY_TOKEN"
echo "⚠️  SAVE THIS TOKEN! You'll need it to access your Moltbot."
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN

# Deploy to Cloudflare
echo "☁️  Deploying to Cloudflare Workers..."
npm run deploy

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo "Your Moltbot with DeepSeek is now deployed!"
echo ""
echo "📋 Next Steps:"
echo "1. Wait 1-2 minutes for the container to start"
echo "2. Access your Moltbot at:"
echo "   https://moltbot-sandbox.YOUR_SUBDOMAIN.workers.dev/?token=$MOLTBOT_GATEWAY_TOKEN"
echo "3. Replace YOUR_SUBDOMAIN with your actual Cloudflare subdomain"
echo ""
echo "🔧 Optional Setup:"
echo "- Set up Cloudflare Access for admin UI protection"
echo "- Configure R2 storage for persistence"
echo "- Add Telegram/Discord/Slack integrations"
echo ""
echo "📚 Documentation:"
echo "- See SETUP_DEEPSEEK.md for detailed instructions"
echo "- Check README.md for original project documentation"