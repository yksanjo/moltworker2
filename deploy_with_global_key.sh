#!/bin/bash

# Deployment script for Moltworker with your Cloudflare global key
# This script assumes you're already authenticated with `wrangler login`

echo "🚀 Starting Moltworker deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the moltworker directory"
    exit 1
fi

# Check if wrangler is authenticated
echo "🔍 Checking Cloudflare authentication..."
npx wrangler whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Error: Not authenticated with Cloudflare. Please run: npx wrangler login"
    exit 1
fi

echo "✅ Authenticated with Cloudflare"

# Set DeepSeek API key as secret
echo "🔑 Setting DeepSeek API key as secret..."
DEEPSEEK_API_KEY="sk-1add0c66bb594522b6597e164fcdd263"
echo "$DEEPSEEK_API_KEY" | npx wrangler secret put DEEPSEEK_API_KEY
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Failed to set DeepSeek API key secret. Continuing anyway..."
fi

# Generate and set gateway token
echo "🔐 Generating gateway token..."
MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "📝 Your Gateway Token: $MOLTBOT_GATEWAY_TOKEN"
echo "💾 Save this token! You'll need it to access your Moltbot."
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Failed to set gateway token secret. Continuing anyway..."
fi

# Build the project
echo "🔨 Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed"
    exit 1
fi

# Deploy to Cloudflare
echo "☁️  Deploying to Cloudflare Workers..."
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Wait 1-2 minutes for the container to start"
    echo "2. Access your Moltbot at: https://openclaw-kimi.[YOUR_SUBDOMAIN].workers.dev/?token=$MOLTBOT_GATEWAY_TOKEN"
    echo "3. Check the wrangler output above for your exact URL"
    echo ""
    echo "🔧 Additional setup (recommended):"
    echo "- Set up Cloudflare Access for admin UI protection"
    echo "- Configure R2 storage for persistence"
    echo "- Add chat platform integrations (Telegram, WhatsApp, etc.)"
else
    echo "❌ Deployment failed"
    exit 1
fi