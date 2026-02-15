#!/bin/bash
# OpenClaw (Moltworker) Setup Script for Cloudflare
# This script guides you through deploying OpenClaw on Cloudflare Workers

set -e

echo "==============================================="
echo "🦀 OpenClaw (Moltworker) Setup for Cloudflare"
echo "==============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"
echo -e "${GREEN}✓ npm $(npm --version) found${NC}"

# Check if logged into wrangler
echo ""
echo -e "${BLUE}Step 2: Checking Cloudflare authentication...${NC}"
if ! npx wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Wrangler${NC}"
    echo "Please run: npx wrangler login"
    echo "Then re-run this script."
    exit 1
fi

echo -e "${GREEN}✓ Authenticated with Cloudflare${NC}"

# Install dependencies
echo ""
echo -e "${BLUE}Step 3: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Generate gateway token
echo ""
echo -e "${BLUE}Step 4: Generating gateway token...${NC}"
GATEWAY_TOKEN=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)
echo -e "${GREEN}✓ Generated gateway token${NC}"
echo ""
echo -e "${YELLOW}Your Gateway Token (save this!):${NC}"
echo -e "${YELLOW}$GATEWAY_TOKEN${NC}"
echo ""

# Set secrets
echo -e "${BLUE}Step 5: Setting up secrets...${NC}"
echo ""

echo "You'll need the following:"
echo "1. Anthropic API Key (from https://console.anthropic.com/)"
echo "   OR AI Gateway configuration"
echo "2. Cloudflare Access Team Domain (optional, for admin UI)"
echo "3. Cloudflare Access AUD tag (optional, for admin UI)"
echo ""

read -p "Do you want to use AI Gateway? (y/n): " use_gateway
if [[ $use_gateway == "y" || $use_gateway == "Y" ]]; then
    echo ""
    echo "Setting up AI Gateway..."
    echo "Create a gateway at: https://dash.cloudflare.com/?to=/:account/ai/ai-gateway/create-gateway"
    echo ""
    read -p "Enter your AI Gateway API Key: " gateway_api_key
    read -p "Enter your AI Gateway Base URL (e.g., https://gateway.ai.cloudflare.com/v1/ACCOUNT_ID/GATEWAY_ID/anthropic): " gateway_base_url
    
    echo "$gateway_api_key" | npx wrangler secret put AI_GATEWAY_API_KEY
    echo "$gateway_base_url" | npx wrangler secret put AI_GATEWAY_BASE_URL
else
    read -p "Enter your Anthropic API Key: " anthropic_key
    echo "$anthropic_key" | npx wrangler secret put ANTHROPIC_API_KEY
fi

# Set gateway token
echo "$GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
echo -e "${GREEN}✓ Gateway token set${NC}"

# Optional: Cloudflare Access
echo ""
read -p "Do you want to set up Cloudflare Access for the admin UI? (y/n): " setup_access
if [[ $setup_access == "y" || $setup_access == "Y" ]]; then
    echo ""
    echo "Follow these steps to set up Cloudflare Access:"
    echo "1. Go to: https://dash.cloudflare.com/?to=/:account/workers-and-pages"
    echo "2. Select your Worker"
    echo "3. Settings > Domains & Routes > Enable Cloudflare Access"
    echo "4. Copy the Application Audience (AUD) tag"
    echo ""
    read -p "Enter your Cloudflare Access Team Domain (e.g., myteam.cloudflareaccess.com): " access_team
    read -p "Enter your Cloudflare Access AUD tag: " access_aud
    
    echo "$access_team" | npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
    echo "$access_aud" | npx wrangler secret put CF_ACCESS_AUD
    echo -e "${GREEN}✓ Cloudflare Access configured${NC}"
fi

# Optional: Chat integrations
echo ""
read -p "Do you want to set up Telegram integration? (y/n): " setup_telegram
if [[ $setup_telegram == "y" || $setup_telegram == "Y" ]]; then
    read -p "Enter your Telegram Bot Token: " telegram_token
    echo "$telegram_token" | npx wrangler secret put TELEGRAM_BOT_TOKEN
    echo -e "${GREEN}✓ Telegram configured${NC}"
fi

echo ""
read -p "Do you want to set up Discord integration? (y/n): " setup_discord
if [[ $setup_discord == "y" || $setup_discord == "Y" ]]; then
    read -p "Enter your Discord Bot Token: " discord_token
    echo "$discord_token" | npx wrangler secret put DISCORD_BOT_TOKEN
    echo -e "${GREEN}✓ Discord configured${NC}"
fi

# Optional: R2 for persistent storage
echo ""
read -p "Do you want to set up R2 for persistent storage? (y/n): " setup_r2
if [[ $setup_r2 == "y" || $setup_r2 == "Y" ]]; then
    echo ""
    echo "To set up R2:"
    echo "1. Go to: https://dash.cloudflare.com/?to=/:account/r2"
    echo "2. The 'moltbot-data' bucket is created automatically on first deploy"
    echo "3. Create an R2 API token with Object Read & Write permissions"
    echo ""
    read -p "Enter your R2 Access Key ID: " r2_key_id
    read -p "Enter your R2 Secret Access Key: " r2_secret
    read -p "Enter your Cloudflare Account ID: " cf_account_id
    
    echo "$r2_key_id" | npx wrangler secret put R2_ACCESS_KEY_ID
    echo "$r2_secret" | npx wrangler secret put R2_SECRET_ACCESS_KEY
    echo "$cf_account_id" | npx wrangler secret put CF_ACCOUNT_ID
    echo -e "${GREEN}✓ R2 storage configured${NC}"
fi

# Deploy
echo ""
echo -e "${BLUE}Step 6: Deploying to Cloudflare...${NC}"
npm run deploy

echo ""
echo "==============================================="
echo -e "${GREEN}🎉 OpenClaw deployment complete!${NC}"
echo "==============================================="
echo ""
echo "Your OpenClaw instance should now be running."
echo ""
echo "Important URLs:"
echo "  - Control UI: https://your-worker.workers.dev/?token=$GATEWAY_TOKEN"
echo "  - Admin UI: https://your-worker.workers.dev/_admin/"
echo ""
echo "Important Information:"
echo "  - Gateway Token: $GATEWAY_TOKEN"
echo "  - Save this token! You'll need it to access the Control UI"
echo ""
echo "Next steps:"
echo "  1. Visit your worker URL with the token"
echo "  2. Complete Cloudflare Access setup if you enabled it"
echo "  3. Pair your device via the admin UI"
echo "  4. Start chatting with your AI agent!"
echo ""
echo "For troubleshooting, check:"
echo "  - npx wrangler tail (view logs)"
echo "  - npx wrangler secret list (view configured secrets)"
echo ""
