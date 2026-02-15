# MoltWorker with DeepSeek - Deployment Guide

## Prerequisites
1. Cloudflare account with Workers Paid plan ($5/month)
2. DeepSeek API key: `sk-1add0c66bb594522b6597e164fcdd263` (already configured)
3. Terminal/command line access

## Step-by-Step Deployment

### Step 1: Login to Cloudflare
```bash
cd moltworker
npx wrangler login
```
This will open a browser window. Log in with your Cloudflare account.

### Step 2: Set DeepSeek API Key as Secret
```bash
echo "sk-1add0c66bb594522b6597e164fcdd263" | npx wrangler secret put DEEPSEEK_API_KEY
```

### Step 3: Generate and Set Gateway Token
```bash
# Generate a secure token
export MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)

# Save this token - YOU WILL NEED IT!
echo "YOUR GATEWAY TOKEN: $MOLTBOT_GATEWAY_TOKEN"
echo "SAVE THIS TOKEN SOMEWHERE SAFE!"

# Set as secret
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
```

### Step 4: Deploy
```bash
npm run deploy
```

## After Deployment

### Access Your Moltbot
1. Wait 1-2 minutes for the container to start
2. Access at: `https://moltbot-sandbox.YOUR_SUBDOMAIN.workers.dev/?token=YOUR_GATEWAY_TOKEN`
   - Replace `YOUR_SUBDOMAIN` with your Cloudflare subdomain
   - Replace `YOUR_GATEWAY_TOKEN` with the token you generated

### Find Your Worker URL
After deployment, Wrangler will show you the URL. It will look like:
```
https://moltbot-sandbox.abc123.workers.dev
```

## Quick Deployment Script
Save this as `deploy.sh` and run it:
```bash
#!/bin/bash
cd moltworker
npx wrangler login
echo "sk-1add0c66bb594522b6597e164fcdd263" | npx wrangler secret put DEEPSEEK_API_KEY
export MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "GATEWAY TOKEN: $MOLTBOT_GATEWAY_TOKEN"
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
npm run deploy
```

## Troubleshooting

### If deployment fails:
1. Check Cloudflare account has Workers Paid plan
2. Verify you're logged in: `npx wrangler whoami`
3. Check build: `npm run build`

### If API doesn't work:
1. Verify DeepSeek API key is valid
2. Check Cloudflare Worker logs
3. First request may take 1-2 minutes

## Next Steps After Deployment
1. Set up Cloudflare Access for admin UI protection
2. Configure R2 storage for persistence
3. Add WhatsApp/Gmail integrations (we'll work on this next)

## Your Current Configuration
- ✅ DeepSeek API key configured
- ✅ Build scripts ready
- ✅ All code modifications complete
- ✅ Local testing passed

You just need to run the deployment commands with your Cloudflare account!