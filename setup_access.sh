#!/bin/bash
# Helper script to set up Cloudflare Access for moltworker

echo "=== Cloudflare Access Setup Helper ==="
echo ""
echo "Follow these steps in the Cloudflare Dashboard:"
echo ""
echo "1. Go to: https://dash.cloudflare.com/"
echo "2. Navigate to: Workers & Pages → Your Worker"
echo "3. Click: Settings → Domains & Routes"
echo "4. Find 'workers.dev' row → Click three dots (...)"
echo "5. Click: 'Enable Cloudflare Access'"
echo "6. Click: 'Manage Cloudflare Access'"
echo "7. Add your email to the allow list and save"
echo ""
read -p "Press Enter when you've done the above..."
echo ""

# Get credentials from user
echo "Now enter your Cloudflare Access credentials:"
echo ""
read -p "Enter your Cloudflare Access Team Domain (e.g., yourname.cloudflareaccess.com): " TEAM_DOMAIN
read -p "Enter your Application Audience (AUD) tag (long UUID): " AUD

echo ""
echo "Setting secrets..."

# Set the secrets
echo "$TEAM_DOMAIN" | npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
echo "$AUD" | npx wrangler secret put CF_ACCESS_AUD

echo ""
echo "✅ Secrets set! Now deploying..."
npm run deploy

echo ""
echo "🎉 Done! Your admin UI should now work at /_admin/"
