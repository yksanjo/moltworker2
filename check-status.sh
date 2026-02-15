#!/bin/bash

echo "🔍 Checking MoltWorker Status"
echo "============================"
echo ""

echo "1. Checking Worker URL..."
curl -s -I "https://moltbot-sandbox.yksanjo.workers.dev" 2>&1 | grep -i "http" | head -1

echo ""
echo "2. Checking Telegram Webhook..."
curl -s "https://api.telegram.org/bot8517283723:AAEA0D7kvvc0sdgdD32zGAe6o9RoRawLdsg/getWebhookInfo" | python3 -m json.tool 2>/dev/null || curl -s "https://api.telegram.org/bot8517283723:AAEA0D7kvvc0sdgdD32zGAe6o9RoRawLdsg/getWebhookInfo"

echo ""
echo "3. Testing API endpoint..."
curl -s "https://moltbot-sandbox.yksanjo.workers.dev/api/status" 2>&1 | head -1

echo ""
echo "4. Testing Telegram endpoint..."
curl -s -X POST "https://moltbot-sandbox.yksanjo.workers.dev/api/telegram" \
  -H "Content-Type: application/json" \
  -d '{"test":true}' 2>&1 | head -1

echo ""
echo "📊 Status Summary:"
echo "-----------------"
echo "If you see 'error code: 1042' - Container is still starting"
echo "If you see '404' - Worker is running but endpoint not found"
echo "If you see 'OK' or JSON response - Everything is working!"
echo ""
echo "⏳ Container startup can take 5-10 minutes on first deployment."
echo "Please wait a few more minutes and try messaging your bot again."