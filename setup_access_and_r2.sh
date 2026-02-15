#!/bin/bash
# Setup Cloudflare Access and R2 for OpenClaw

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "==============================================="
echo "🔐 Cloudflare Access + R2 Setup"
echo "==============================================="
echo ""

echo -e "${BLUE}This script will help you set up:${NC}"
echo "  1. Cloudflare Access (for Admin UI security)"
echo "  2. R2 Storage (for persistent data)"
echo ""

# Cloudflare Access Setup
echo -e "${YELLOW}=== CLOUDFLARE ACCESS SETUP ===${NC}"
echo ""
echo "Follow these steps in the Cloudflare Dashboard:"
echo ""
echo "1. Go to: https://dash.cloudflare.com/?to=/:account/workers-and-pages"
echo "2. Select your 'moltbot-sandbox' worker"
echo "3. Click 'Settings' → 'Domains & Routes'"
echo "4. Find the 'workers.dev' row, click the '...' menu"
echo "5. Click 'Enable Cloudflare Access'"
echo "6. Click 'Manage Cloudflare Access'"
echo "7. Add your email to the allow list"
echo "8. Save the Application Audience (AUD) tag"
echo ""
echo "---"
echo ""

read -p "Enter your Cloudflare Access Team Domain (e.g., yksanjo.cloudflareaccess.com): " access_team
read -p "Enter your Cloudflare Access AUD tag: " access_aud

echo ""
echo -e "${BLUE}Setting Cloudflare Access secrets...${NC}"
echo "$access_team" | npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
echo "$access_aud" | npx wrangler secret put CF_ACCESS_AUD
echo -e "${GREEN}✓ Cloudflare Access configured${NC}"

# R2 Setup
echo ""
echo -e "${YELLOW}=== R2 STORAGE SETUP ===${NC}"
echo ""
echo "Follow these steps in the Cloudflare Dashboard:"
echo ""
echo "1. Go to: https://dash.cloudflare.com/?to=/:account/r2"
echo "2. The 'moltbot-data' bucket is created automatically"
echo "3. Click 'Manage R2 API Tokens'"
echo "4. Create a new token with:"
echo "   - Permissions: Object Read & Write"
echo "   - Bucket: moltbot-data"
echo "5. Copy the Access Key ID and Secret Access Key"
echo ""
echo "---"
echo ""

read -p "Enter your R2 Access Key ID: " r2_key_id
read -p "Enter your R2 Secret Access Key: " r2_secret

CF_ACCOUNT_ID="a1ede525e60bbe56f5af3960df6e34c7"

echo ""
echo -e "${BLUE}Setting R2 secrets...${NC}"
echo "$r2_key_id" | npx wrangler secret put R2_ACCESS_KEY_ID
echo "$r2_secret" | npx wrangler secret put R2_SECRET_ACCESS_KEY
echo "$CF_ACCOUNT_ID" | npx wrangler secret put CF_ACCOUNT_ID
echo -e "${GREEN}✓ R2 storage configured${NC}"

# Redeploy
echo ""
echo -e "${BLUE}Redeploying with new configuration...${NC}"
npm run deploy

echo ""
echo "==============================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "==============================================="
echo ""
echo -e "${GREEN}Cloudflare Access:${NC}"
echo "  - Admin UI: https://moltbot-sandbox.yksanjo.workers.dev/_admin/"
echo "  - You'll be prompted to authenticate via Cloudflare Access"
echo ""
echo -e "${GREEN}R2 Storage:${NC}"
echo "  - Data will now persist across container restarts"
echo "  - Backup runs every 5 minutes automatically"
echo ""
echo "Next steps:"
echo "  1. Visit the Admin UI to pair your device"
echo "  2. Use Control UI: https://moltbot-sandbox.yksanjo.workers.dev/?token=YOUR_TOKEN"
echo ""
