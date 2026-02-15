# WhatsApp Business API Integration - Complete Guide

## ✅ What's Ready
1. **WhatsApp Route Handler**: Created at `/api/whatsapp`
2. **Configuration**: Added to start script and environment variables
3. **Build**: Compiled successfully
4. **Webhook Token**: Generated (save: `LOk4nykSFLss6Xx4XOcjv47SH2yqX7sZ`)

## 🚀 Your MoltWorker Status
- **URL**: `https://moltbot-sandbox.yksanjo.workers.dev`
- **Gateway Token**: `4Rm44AltnPTRgAA8maScvwMETra5S1TB`
- **Container Status**: Starting (error 1042 is normal, takes 1-2 minutes)

## 📱 WhatsApp Setup Steps

### Step 1: Get Meta Developer Credentials
```bash
./setup-whatsapp.sh
```
Follow the interactive guide to get:
1. WhatsApp Business API Token
2. Phone Number ID  
3. Business Account ID

### Step 2: Set Cloudflare Secrets
```bash
# Set environment variables first
export CLOUDFLARE_EMAIL=yksanjo@gmail.com
export CLOUDFLARE_API_KEY=3c7aa2467b465250e3329431b3d6b3c5e4276
export CLOUDFLARE_ACCOUNT_ID=a1ede525e60bbe56f5af3960df6e34c7

# Set WhatsApp secrets
echo "YOUR_WHATSAPP_TOKEN" | npx wrangler secret put WHATSAPP_BUSINESS_TOKEN
echo "YOUR_PHONE_NUMBER_ID" | npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
echo "YOUR_BUSINESS_ACCOUNT_ID" | npx wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID
echo "LOk4nykSFLss6Xx4XOcjv47SH2yqX7sZ" | npx wrangler secret put WHATSAPP_WEBHOOK_TOKEN
```

### Step 3: Redeploy with WhatsApp Integration
```bash
npm run deploy
```

### Step 4: Configure Meta Webhook
1. Go to: Meta Developer Portal → Your App → WhatsApp → Webhooks
2. Set Callback URL: `https://moltbot-sandbox.yksanjo.workers.dev/api/whatsapp`
3. Set Verify Token: `LOk4nykSFLss6Xx4XOcjv47SH2yqX7sZ`
4. Subscribe to: `messages`, `message_template_status_update`

### Step 5: Test
1. Send message to your WhatsApp Business number
2. Check logs: `npx wrangler tail moltbot-sandbox`
3. You should see webhook events and AI responses

## 🔧 How It Works

### Webhook Flow:
1. User sends WhatsApp message → Meta API
2. Meta sends webhook → Your MoltWorker (`/api/whatsapp`)
3. MoltWorker forwards to DeepSeek AI
4. AI response sent back via WhatsApp API

### Message Types Supported:
- ✅ Text messages
- ✅ Interactive messages (buttons, lists)
- ✅ Template messages (after approval)
- ✅ Media messages (basic support)

## ⚠️ Important Notes

### Rate Limits:
- **Free Tier**: 1,000 messages/day
- **Business Tier**: 10,000-100,000 messages/day

### Message Templates:
For proactive messages (not replies), you need:
1. Create message template in Meta portal
2. Submit for approval (24-48 hours)
3. Use approved template names

### Costs:
- Free for 24-hour customer service window
- Paid for template messages outside 24-hour window
- Conversation-based pricing

## 🐛 Troubleshooting

### Common Issues:
1. **Webhook not verifying**: Check token matches exactly
2. **Messages not sending**: Check access token permissions
3. **No response from AI**: Check DeepSeek API key
4. **Container not starting**: Wait 2-3 minutes, first start is slow

### Debug Commands:
```bash
# Check Worker logs
npx wrangler tail moltbot-sandbox

# Check deployments
npx wrangler deployments list --name moltbot-sandbox

# Test webhook locally
curl -X GET "http://localhost:8787/api/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=123"
```

## 📞 Support Resources
1. **Meta WhatsApp Docs**: https://developers.facebook.com/docs/whatsapp
2. **Cloudflare Workers**: https://developers.cloudflare.com/workers/
3. **Moltbot Docs**: https://molt.bot/

## 🎯 Next: Gmail Integration
After WhatsApp is working, we'll add Gmail integration for email reading/sending.

**Ready to proceed? Run `./setup-whatsapp.sh` and follow the steps!**