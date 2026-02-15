#!/bin/bash

echo "🧪 Testing Moltbot Deployment..."

# Check if we can access the worker
WORKER_URL="https://moltbot-anthropic.yksanjo.workers.dev"

echo "🔍 Checking worker status..."
curl -s -I "$WORKER_URL" | head -5

echo ""
echo "📋 Checking secrets..."
npx wrangler secret list

echo ""
echo "📊 Checking deployments..."
npx wrangler deployments list | head -5

echo ""
echo "🔧 Checking build status..."
if [ -f "dist/client/index.html" ]; then
    echo "✅ Build output exists"
else
    echo "❌ Build output missing - run 'npm run build'"
fi

echo ""
echo "💡 Next steps:"
echo "   1. Run './deploy_kimi_simple.sh' to switch to Kimi (affordable)"
echo "   2. Or run './deploy_deepseek_simple.sh' to switch to DeepSeek (cheapest)"
echo "   3. Access your agent at: $WORKER_URL/?token=YOUR_TOKEN"
echo "   4. Check logs with: npx wrangler tail"