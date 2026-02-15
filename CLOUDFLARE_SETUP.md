# Cloudflare Setup for MoltWorker Deployment

## Issue Identified
You provided: `3c7aa2467b465250e3329431b3d6b3c5e4276` (Global API Key)

But we need: **Scoped API Token** for Wrangler

## Steps to Get Correct Credentials

### Step 1: Create Scoped API Token
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use **"Edit Cloudflare Workers"** template
4. Add permissions:
   - Account: Workers Scripts: Edit
   - Account: Workers Routes: Edit
   - Zone: Workers Routes: Edit (if using custom domain)
5. Copy the generated token (starts with alphanumeric characters)

### Step 2: Get Account ID
1. Go to: https://dash.cloudflare.com/
2. Click on your account in top right
3. Click **"Copy Account ID"**

### Step 3: Deploy with Correct Credentials

```bash
cd moltworker

# Set environment variables
export CLOUDFLARE_API_TOKEN=your-scoped-token-here
export CLOUDFLARE_ACCOUNT_ID=your-account-id-here

# Or create .env file
echo "CLOUDFLARE_API_TOKEN=your-scoped-token-here" > .env
echo "CLOUDFLARE_ACCOUNT_ID=your-account-id-here" >> .env

# Deploy
npm run deploy
```

## Alternative: Use Wrangler Login (Easier)
```bash
cd moltworker
npx wrangler login  # Opens browser, log in to Cloudflare
npm run deploy
```

## Current Status
✅ **DeepSeek Integration**: Complete  
✅ **Build**: Working  
✅ **Local Testing**: Working  
❌ **Deployment**: Needs proper Cloudflare authentication

## Quick Test (Local)
```bash
cd moltworker
npx wrangler dev --local
# Access at: http://localhost:8787/?token=dev-token-change-in-prod
```

## What I've Prepared
1. ✅ Modified for DeepSeek API
2. ✅ Validated DeepSeek API key
3. ✅ Created deployment scripts
4. ✅ All configuration files updated

## Next Steps
1. Get scoped API Token from Cloudflare dashboard
2. Run deployment
3. Then we work on WhatsApp/Gmail integrations

## Need Help?
1. **Scoped Token Guide**: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
2. **Account ID**: In Cloudflare dashboard under account settings
3. **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/