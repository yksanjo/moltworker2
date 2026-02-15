#!/bin/bash

# Fresh deployment script for Moltbot with Anthropic Claude (Sonnet for cost savings)

echo "🚀 Starting fresh Moltbot deployment with Anthropic Claude (Sonnet)..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the moltworker directory"
    exit 1
fi

# Clean up any existing workers
echo "🧹 Cleaning up any existing workers..."
for worker in moltbot-anthropic openclaw-kimi kimiclaw kimidock; do
    echo "Checking worker: $worker"
    npx wrangler secret list --name $worker 2>&1 | grep -q "secret" && {
        echo "Deleting worker: $worker"
        echo "y" | npx wrangler delete --name $worker 2>&1 | tail -3
    } || echo "Worker $worker doesn't exist"
done

# Build the project
echo "🔨 Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed"
    exit 1
fi

# Generate gateway token
echo "🔐 Generating gateway token..."
MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "📝 Your Gateway Token: $MOLTBOT_GATEWAY_TOKEN"
echo "💾 SAVE THIS TOKEN! You'll need it to access your Moltbot."

# Deploy the worker
echo "☁️  Deploying to Cloudflare Workers..."
npm run deploy 2>&1 | tail -30

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Set secrets
echo "🔑 Setting Anthropic API key..."
echo "echo "YOUR_API_KEY" | npx wrangler secret put ANTHROPIC_API_KEY --name moltbot-anthropic

echo "🔑 Setting gateway token..."
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN --name moltbot-anthropic

echo "🔧 Setting development mode..."
echo "true" | npx wrangler secret put DEV_MODE --name moltbot-anthropic

echo "🐛 Enabling debug routes..."
echo "true" | npx wrangler secret put DEBUG_ROUTES --name moltbot-anthropic

# Redeploy with secrets
echo "🔄 Redeploying with secrets..."
npx wrangler deploy --name moltbot-anthropic 2>&1 | tail -20

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Your Moltbot is now configured with:"
echo "   - 🤖 Anthropic Claude 3.5 Sonnet (cost-effective for chat)"
echo "   - 💰 Fallback to Claude Haiku (even more cost-effective)"
echo "   - 🚫 Claude Opus available but not default (expensive)"
echo ""
echo "🔗 Access your Moltbot at:"
echo "   https://moltbot-anthropic.yksanjo.workers.dev/?token=$MOLTBOT_GATEWAY_TOKEN"
echo ""
echo "📊 Cost-saving features:"
echo "   ✅ Uses Claude 3.5 Sonnet as primary (good balance of capability/cost)"
echo "   ✅ Falls back to Claude Haiku if needed (cheapest)"
echo "   ❌ Claude Opus not default (most expensive - use only when needed)"
echo ""
echo "⏳ First request may take 1-2 minutes while container starts."
echo ""
echo "🔧 To change model or configuration:"
echo "   1. Edit moltbot.json.template"
echo "   2. Redeploy: npm run deploy"
echo ""
echo "🆘 Need help? Check the logs:"
echo "   npx wrangler tail --name moltbot-anthropic"