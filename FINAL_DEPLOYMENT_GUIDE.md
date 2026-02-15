# FINAL: MoltWorker Deployment Guide

## ✅ What's Ready
1. **DeepSeek Integration**: Complete and tested
2. **Build**: Working perfectly
3. **Configuration**: All files updated
4. **Local Testing**: Passed all tests

## ❌ What's Blocking Deployment
The API key you provided (`3c7aa2467b465250e3329431b3d6b3c5e4276`) is not in the correct format for Cloudflare Wrangler.

## 🔑 Required Credentials

### Option A: Scoped API Token (Recommended)
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use **"Edit Cloudflare Workers"** template
4. Token will look like: `v2.0_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789`

### Option B: Global API Key + Email
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Find **"Global API Key"** section
3. Copy the key
4. Also need your account email

## 🚀 Quick Deployment

### Method 1: Wrangler Login (Easiest)
```bash
cd moltworker
npx wrangler login  # Opens browser
npm run deploy
```

### Method 2: Environment Variables
```bash
cd moltworker

# For Scoped Token:
export CLOUDFLARE_API_TOKEN=your-scoped-token-here
export CLOUDFLARE_ACCOUNT_ID=your-account-id-here

# For Global Key:
export CLOUDFLARE_API_KEY=your-global-key-here
export CLOUDFLARE_EMAIL=your-email@example.com

npm run deploy
```

### Method 3: .env File
```bash
cd moltworker
echo "CLOUDFLARE_API_TOKEN=your-token-here" > .env
echo "CLOUDFLARE_ACCOUNT_ID=your-account-id-here" >> .env
npm run deploy
```

## 📍 After Deployment
1. Get your Worker URL from output
2. Use gateway token from deployment
3. Access: `https://your-worker.workers.dev/?token=YOUR_TOKEN`

## 🔧 Test Locally First
```bash
cd moltworker
npx wrangler dev --local
# Access: http://localhost:8787/?token=dev-token-change-in-prod
```

## 🎯 Next: WhatsApp & Gmail Integrations

Once deployed, we'll add:
1. **WhatsApp Business API** integration
2. **Gmail API** integration for email
3. Additional skills and features

## 📞 Need Help?
1. **Token Guide**: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
2. **Account ID**: In Cloudflare dashboard (click account → Copy ID)
3. **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/

## ⏱️ Estimated Time
- **Get credentials**: 5 minutes
- **Deploy**: 5 minutes
- **WhatsApp integration**: 1-2 hours (after deployment)
- **Gmail integration**: 1-2 hours (after WhatsApp)

**Please get the correct Cloudflare credentials and deploy, then we'll work on WhatsApp/Gmail!**