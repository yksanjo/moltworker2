#!/bin/bash

# Telegram Bot Setup Script for MoltWorker

set -e

echo "📱 Telegram Bot Setup"
echo "===================="
echo ""

echo "Step 1: Get Telegram Bot Token"
echo "------------------------------"
echo "1. Open Telegram app"
echo "2. Search for @BotFather (official bot)"
echo "3. Start chat with @BotFather"
echo "4. Send: /newbot"
echo "5. Choose bot name (e.g., 'Moltbot Assistant')"
echo "6. Choose username (must end with 'bot', e.g., 'moltbot_assistant_bot')"
echo "7. COPY THE API TOKEN that @BotFather gives you"
echo ""

echo "Step 2: Set Telegram Secret in Cloudflare"
echo "----------------------------------------"
echo "Run this command with your token:"
echo ""
echo "echo 'YOUR_TELEGRAM_BOT_TOKEN' | npx wrangler secret put TELEGRAM_BOT_TOKEN"
echo ""

echo "Step 3: Redeploy MoltWorker"
echo "--------------------------"
echo "npm run deploy"
echo ""

echo "Step 4: Set Telegram Webhook"
echo "---------------------------"
echo "After deployment, set the webhook:"
echo ""
echo "curl 'https://moltbot-sandbox.yksanjo.workers.dev/api/telegram/set-webhook'"
echo ""
echo "Or manually:"
echo "curl -X POST 'https://api.telegram.org/botYOUR_TOKEN/setWebhook' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"url\":\"https://moltbot-sandbox.yksanjo.workers.dev/api/telegram\",\"max_connections\":40}'"
echo ""

echo "Step 5: Test Your Bot"
echo "-------------------"
echo "1. Open Telegram"
echo "2. Search for your bot username"
echo "3. Send /start command"
echo "4. Send any message"
echo "5. You should get AI responses!"
echo ""

echo "Step 6: Check Webhook Status"
echo "---------------------------"
echo "curl 'https://moltbot-sandbox.yksanjo.workers.dev/api/telegram/webhook-info'"
echo ""

echo "📋 Features:"
echo "- ✅ Text messages"
echo "- ✅ Markdown formatting"
echo "- ✅ Reply threading"
echo "- ✅ Button callbacks"
echo "- ✅ Typing indicators"
echo "- ✅ Device pairing (default) or open access"
echo ""

echo "🔧 Commands Reference:"
echo "/api/telegram/set-webhook    - Set webhook URL"
echo "/api/telegram/webhook-info   - Check webhook status"
echo "/api/telegram/delete-webhook - Remove webhook"
echo ""

echo "🎯 Bot Father Commands (optional):"
echo "/setname      - Change bot name"
echo "/setdescription - Set bot description"
echo "/setabouttext - Set about text"
echo "/setuserpic   - Set profile picture"
echo "/setcommands  - Set command list"
echo ""

echo "✅ Telegram integration ready to set up!"