# MoltWorker with DeepSeek Setup Guide

This guide explains how to set up MoltWorker to use DeepSeek API instead of Anthropic/Claude.

## Prerequisites

1. **Cloudflare Workers Paid plan** ($5/month) - Required for Sandbox containers
2. **DeepSeek API key** - Get from [platform.deepseek.com](https://platform.deepseek.com)
3. **Cloudflare account** - With Workers enabled

## DeepSeek API Key Format

DeepSeek API keys typically look like:
```
sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Your key should start with `sk-` followed by 32 characters.

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.dev.vars` file for local development:
```bash
# Local development mode
DEV_MODE=true
DEBUG_ROUTES=true
MOLTBOT_GATEWAY_TOKEN=dev-token-change-in-prod

# DeepSeek API Configuration
DEEPSEEK_API_KEY=sk-your-actual-deepseek-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

### 3. Set Cloudflare Secrets (for deployment)

```bash
# Set DeepSeek API key
npx wrangler secret put DEEPSEEK_API_KEY

# Generate and set gateway token
export MOLTBOT_GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo "Your gateway token: $MOLTBOT_GATEWAY_TOKEN"
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
```

### 4. Build and Test Locally

```bash
# Build the project
npm run build

# Start local development server
npm run dev
```

### 5. Deploy to Cloudflare

```bash
npm run deploy
```

## Accessing Your Moltbot

After deployment, access your Moltbot at:
```
https://your-worker.workers.dev/?token=YOUR_GATEWAY_TOKEN
```

Replace `your-worker` with your actual worker subdomain and `YOUR_GATEWAY_TOKEN` with the token you generated.

## Configuration Details

### Models Available
- **DeepSeek V3** (`deepseek-chat`): General purpose assistant
- **DeepSeek R1** (`deepseek-reasoner`): Advanced reasoning model

### Customizing Configuration

You can modify the model configuration in:
1. `moltbot.json.template` - Template used on container startup
2. `start-moltbot.sh` - Startup script that configures from environment variables

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DEEPSEEK_API_KEY` | Your DeepSeek API key | Yes |
| `DEEPSEEK_BASE_URL` | DeepSeek API base URL (default: https://api.deepseek.com/v1) | No |
| `MOLTBOT_GATEWAY_TOKEN` | Token for gateway access | Yes |
| `DEV_MODE` | Enable dev mode (bypasses auth) | No (for local dev) |
| `DEBUG_ROUTES` | Enable debug routes | No |

## Troubleshooting

### API Key Issues
- Ensure your DeepSeek API key starts with `sk-`
- Verify the key is active at [platform.deepseek.com](https://platform.deepseek.com)
- Check API rate limits and billing status

### Deployment Issues
- Ensure you have Cloudflare Workers Paid plan
- Verify `wrangler` is authenticated: `npx wrangler whoami`
- Check Cloudflare dashboard for deployment status

### Container Issues
- First request may take 1-2 minutes while container starts
- Check Cloudflare Workers logs for errors
- Verify Sandbox containers are enabled in your plan

## Additional Features

### Persistent Storage (R2)
To enable persistent storage across container restarts:
```bash
# Create R2 bucket
npx wrangler r2 bucket create moltbot-data

# Set R2 secrets
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put CF_ACCOUNT_ID
```

### Chat Integrations
Configure additional channels in `.dev.vars`:
```bash
# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Discord
DISCORD_BOT_TOKEN=your-discord-bot-token

# Slack
SLACK_BOT_TOKEN=your-slack-bot-token
SLACK_APP_TOKEN=your-slack-app-token
```

## Support

- DeepSeek API: [platform.deepseek.com](https://platform.deepseek.com)
- Cloudflare Workers: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers)
- Moltbot: [molt.bot](https://molt.bot/)
- Issues: [GitHub Issues](https://github.com/cloudflare/moltworker/issues)