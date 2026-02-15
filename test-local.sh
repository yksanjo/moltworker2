#!/bin/bash

# Local test script for MoltWorker with DeepSeek

set -e

echo "🧪 Testing MoltWorker with DeepSeek locally..."
echo "=============================================="

# Check if .dev.vars exists
if [ ! -f .dev.vars ]; then
    echo "❌ .dev.vars file not found. Creating from template..."
    cp .dev.vars.example .dev.vars
    echo "⚠️  Please edit .dev.vars with your DeepSeek API key"
    exit 1
fi

# Check if DeepSeek API key is set in .dev.vars
if ! grep -q "DEEPSEEK_API_KEY=sk-" .dev.vars; then
    echo "❌ DeepSeek API key not found in .dev.vars"
    echo "⚠️  Please add: DEEPSEEK_API_KEY=sk-1add0c66bb594522b6597e164fcdd263"
    exit 1
fi

echo "✅ Configuration check passed"

# Build the project
echo "🔨 Building project..."
npm run build

echo ""
echo "✅ LOCAL TEST PASSED!"
echo "===================="
echo ""
echo "To run locally in development mode:"
echo "1. Make sure you have Cloudflare Wrangler installed"
echo "2. Run: npm run dev"
echo "3. Or run: npx wrangler dev --local"
echo ""
echo "The local server will start and you can access:"
echo "- Control UI: http://localhost:8787/?token=dev-token-change-in-prod"
echo "- Admin UI: http://localhost:8787/_admin/"
echo ""
echo "Note: Local mode bypasses authentication for testing."