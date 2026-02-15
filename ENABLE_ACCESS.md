# Enable Cloudflare Access - Step by Step

## Step 1: Enable Access on Your Worker

1. Go to: https://dash.cloudflare.com/a1ede525e60bbe56f5af3960df6e34c7/workers-and-pages/overview
2. Click on **"moltbot-sandbox"**
3. Click the **"Settings"** tab (next to "Deployments")
4. Scroll down to **"Domains & Routes"**
5. Find the row with **"workers.dev"**
6. Click the **three dots (...) menu** on the right side
7. Click **"Enable Cloudflare Access"**
8. Click **"Manage Cloudflare Access"** in the popup

## Step 2: Configure Access

9. You'll be taken to the Zero Trust dashboard
10. Click **"Add an identity provider"** or use **"One-time PIN"**
11. Enter your email: **yksanjo@gmail.com**
12. Click **"Save"**

## Step 3: Get Your Credentials

13. After saving, you'll see an **"Application Audience (AUD)"** tag
14. Copy that long UUID string
15. Look at the URL - your team domain is before `.cloudflareaccess.com`
    - Example: if URL is `yksanjo.cloudflareaccess.com`, then team domain is `yksanjo.cloudflareaccess.com`

## Step 4: Run This Command

```bash
cd moltworker
echo "YOUR_TEAM_DOMAIN.cloudflareaccess.com" | npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
echo "YOUR_AUD_TAG" | npx wrangler secret put CF_ACCESS_AUD
npm run deploy
```

Done!
