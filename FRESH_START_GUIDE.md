# Fresh Start Guide for MoltWorker

## ✅ What Has Been Cleared

1. **Cloudflare Worker Deleted**: `moltbot-sandbox` has been completely removed from Cloudflare
2. **Local Configuration Removed**:
   - `.wrangler/` directory deleted
   - `.env.backup` file deleted (contained sensitive credentials)
3. **Configuration Files Reset**:
   - `.dev.vars` reset to example template
   - `wrangler.jsonc` cleaned to minimal configuration
4. **Authentication Cleared**: Logged out of Cloudflare

## 🚀 Steps for Fresh Deployment

### Step 1: Login to Cloudflare
```bash
cd moltworker
npx wrangler login
```
This will open a browser window for you to authenticate with Cloudflare.

### Step 2: Configure Environment Variables
Edit `.dev.vars` with your actual values:
```bash
# Edit the file with your API keys
nano .dev.vars  # or use your preferred editor
```

Minimum required configuration:
```bash
# DeepSeek API Configuration
DEEPSEEK_API_KEY=your-deepseek-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Development token (change in production)
MOLTBOT_GATEWAY_TOKEN=dev-token-change-in-prod
```

### Step 3: Build the Project
```bash
npm run build
```

### Step 4: Deploy to Cloudflare
```bash
npm run deploy
```

Or manually:
```bash
npx wrangler deploy
```

### Step 5: Test the Deployment
After deployment, you'll get a URL like:
```
https://moltbot-sandbox.<your-account>.workers.dev
```

Test it with:
```bash
curl "https://moltbot-sandbox.<your-account>.workers.dev/?token=dev-token-change-in-prod"
```

## 📁 Current File Status

- `wrangler.jsonc`: Clean minimal configuration
- `.dev.vars`: Reset to example (needs your API keys)
- No sensitive credentials stored locally
- No existing worker on Cloudflare

## 🔧 Optional Configuration

If you need additional features, you can add to `wrangler.jsonc`:

1. **Custom Domain**: Add `routes` configuration
2. **R2 Storage**: Add `r2_buckets` configuration  
3. **KV Namespaces**: Add `kv_namespaces` configuration
4. **D1 Databases**: Add `d1_databases` configuration

## 🆘 Troubleshooting

If you encounter issues:

1. **Authentication problems**: Run `npx wrangler logout` then `npx wrangler login`
2. **Build errors**: Check `npm run build` output
3. **Deployment errors**: Check `npx wrangler deploy` output
4. **Worker not found**: The old worker was successfully deleted, you're creating a new one

## 📞 Need Help?

Refer to:
- `CLOUDFLARE_SETUP.md` for Cloudflare-specific setup
- `DEPLOYMENT_GUIDE.md` for general deployment instructions
- Cloudflare Workers documentation: https://developers.cloudflare.com/workers/