# Telegram Bot Integration - Complete Guide

## ✅ What's Ready
1. **Telegram Route Handler**: Created at `/api/telegram`
2. **Configuration**: Added to all config files
3. **Build**: Compiled successfully
4. **Webhook Support**: Automatic webhook setup

## 🚀 Your MoltWorker Status
- **URL**: `https://moltbot-sandbox.yksanjo.workers.dev`
- **Gateway Token**: `4Rm44AltnPTRgAA8maScvwMETra5S1TB`
- **Telegram Endpoint**: `/api/telegram`

## 📱 Telegram Setup Steps

### Step 1: Get Telegram Bot Token
```bash
./setup-telegram.sh
```
Follow the interactive guide to get token from @BotFather.

### Step 2: Set Telegram Secret in Cloudflare
```bash
# Set environment variables
export CLOUDFLARE_EMAIL=yksanjo@gmail.com
export CLOUDFLARE_API_KEY=3c7aa2467b465250e3329431b3d6b3c5e4276
export CLOUDFLARE_ACCOUNT_ID=a1ede525e60bbe56f5af3960df6e34c7

# Set Telegram secret (replace with YOUR actual token)
echo "YOUR_TELEGRAM_BOT_TOKEN" | npx wrangler secret put TELEGRAM_BOT_TOKEN
```

### Step 3: Redeploy
```bash
npm run deploy
```

### Step 4: Set Webhook
```bash
# Automatic webhook setup
curl "https://moltbot-sandbox.yksanjo.workers.dev/api/telegram/set-webhook"
```
Or visit in browser: `https://moltbot-sandbox.yksanjo.workers.dev/api/telegram/set-webhook`

### Step 5: Test Your Bot
1. Open Telegram app
2. Search for your bot username
3. Send `/start`
4. Send any message
5. Get AI responses!

## 🔧 How It Works

### Webhook Flow:
1. User messages Telegram bot → Telegram API
2. Telegram sends webhook → Your MoltWorker (`/api/telegram`)
3. MoltWorker forwards to DeepSeek AI
4. AI response sent back via Telegram Bot API

### Features:
- ✅ Text messages with Markdown
- ✅ Reply threading
- ✅ Button callbacks
- ✅ Typing indicators
- ✅ Device pairing (secure by default)
- ✅ `/start` command welcome message

## 🎯 Management Commands

### Check Webhook Status:
```bash
curl "https://moltbot-sandbox.yksanjo.workers.dev/api/telegram/webhook-info"
```

### Remove Webhook:
```bash
curl "https://moltbot-sandbox.yksanjo.workers.dev/api/telegram/delete-webhook"
```

### Manual Webhook Setup:
```bash
curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://moltbot-sandbox.yksanjo.workers.dev/api/telegram",
    "max_connections": 40,
    "allowed_updates": ["message", "callback_query"]
  }'
```

## ⚠️ Important Notes

### Authentication:
- **Default**: Device pairing (users must be approved in admin UI)
- **Alternative**: Set `TELEGRAM_DM_POLICY=open` for no authentication

### Rate Limits:
- Telegram Bot API: 30 messages/second
- Moltbot: Handles rate limiting automatically

### Bot Father Commands (Optional):
- `/setname` - Change bot name
- `/setdescription` - Set bot description  
- `/setabouttext` - Set about text
- `/setuserpic` - Set profile picture
- `/setcommands` - Set command list

## 🐛 Troubleshooting

### Common Issues:
1. **Webhook not set**: Run set-webhook endpoint
2. **No response**: Check Cloudflare Worker logs
3. **Authentication required**: Approve device in admin UI
4. **Token invalid**: Regenerate from @BotFather

### Debug Commands:
```bash
# Check Worker logs
npx wrangler tail moltbot-sandbox

# Test webhook locally
curl -X POST "http://localhost:8787/api/telegram" \
  -H "Content-Type: application/json" \
  -d '{"message":{"chat":{"id":123},"text":"test"}}'
```

## 📞 Support Resources
1. **Bot Father**: @BotFather on Telegram
2. **Telegram Bot API**: https://core.telegram.org/bots/api
3. **Cloudflare Workers**: https://developers.cloudflare.com/workers/

## 🎯 Quick Start
```bash
# 1. Get token from @BotFather
# 2. Set secret
echo "YOUR_TOKEN" | npx wrangler secret put TELEGRAM_BOT_TOKEN

# 3. Redeploy
npm run deploy

# 4. Set webhook
curl "https://moltbot-sandbox.yksanjo.workers.dev/api/telegram/set-webhook"

# 5. Test!
# Open Telegram → Find your bot → Send message
```

**Telegram integration is READY! Run `./setup-telegram.sh` to start!** 🚀