# WhatsApp Business API Integration for MoltWorker

## Step 1: Meta Developer Setup

### 1.1 Create Meta Developer Account
1. Go to: https://developers.facebook.com/
2. Click "Get Started"
3. Log in with your Facebook account
4. Complete developer registration

### 1.2 Create App
1. Click "Create App"
2. Select "Business" as app type
3. Enter app name (e.g., "Moltbot WhatsApp")
4. Choose your email
5. Create app

## Step 2: Add WhatsApp Product

### 2.1 Add WhatsApp to Your App
1. In app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set Up"
3. You'll see:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Access Token (click "Generate" if needed)

### 2.2 Get Permanent Access Token
1. Go to "WhatsApp" → "API Setup"
2. Click "Generate Access Token"
3. Copy and save:
   ```
   Access Token: YOUR_PERMANENT_TOKEN_HERE
   Phone Number ID: YOUR_PHONE_NUMBER_ID
   Business Account ID: YOUR_BUSINESS_ACCOUNT_ID
   ```

## Step 3: Configure Webhook

### 3.1 Create Webhook Verify Token
Generate a random token:
```bash
openssl rand -base64 32 | tr -d '=+/' | head -c 32
```
Save this as your **Webhook Verify Token**.

### 3.2 Set Up Webhook in Meta
1. Go to "WhatsApp" → "Configuration" → "Webhooks"
2. Click "Edit" on Callback URL
3. Enter:
   - **Callback URL**: `https://moltbot-sandbox.yksanjo.workers.dev/api/whatsapp`
   - **Verify Token**: Your generated token from step 3.1
4. Subscribe to fields:
   - `messages`
   - `message_template_status_update`

## Step 4: Get Phone Number

### 4.1 Add Phone Number
1. Go to "WhatsApp" → "API Setup"
2. Click "Add Phone Number"
3. You need a dedicated phone number for WhatsApp Business
4. Verify the number via SMS/call

## Step 5: Configure MoltWorker

### 5.1 Add WhatsApp Secrets
Set these as Cloudflare secrets:
```bash
# WhatsApp Business API Token
echo "YOUR_WHATSAPP_TOKEN" | npx wrangler secret put WHATSAPP_BUSINESS_TOKEN

# Phone Number ID
echo "YOUR_PHONE_NUMBER_ID" | npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID

# Business Account ID
echo "YOUR_BUSINESS_ACCOUNT_ID" | npx wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID

# Webhook Verify Token
echo "YOUR_WEBHOOK_TOKEN" | npx wrangler secret put WHATSAPP_WEBHOOK_TOKEN
```

### 5.2 Update .dev.vars for Local Development
Add to `.dev.vars`:
```bash
# WhatsApp Configuration
WHATSAPP_BUSINESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_WEBHOOK_TOKEN=your_webhook_token
```

## Step 6: Test Integration

### 6.1 Send Test Message via API
```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_WHATSAPP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "RECIPIENT_PHONE_NUMBER",
    "type": "text",
    "text": {
      "body": "Hello from Moltbot!"
    }
  }'
```

### 6.2 Verify Webhook
Meta will send a GET request to verify your webhook. Your MoltWorker should respond correctly.

## Important Notes

### Rate Limits
- Free tier: 1,000 messages/day
- Business tier: 10,000-100,000 messages/day

### Message Templates
For proactive messages (not replies), you need approved message templates:
1. Go to "Message Templates"
2. Create template
3. Submit for approval (takes 24-48 hours)

### Costs
- Conversation-based pricing
- Free for 24-hour customer service window
- Paid for template messages

## Troubleshooting

### Common Issues:
1. **Webhook not verifying**: Check token matches
2. **Messages not sending**: Check access token permissions
3. **Phone number not verified**: Complete SMS verification
4. **Rate limiting**: Check your tier limits

### Debug Tools:
1. Meta Webhook Tester
2. WhatsApp Business API Debugger
3. Cloudflare Worker Logs

## Next Steps After Setup
1. Create message templates
2. Set up automated responses
3. Integrate with Moltbot skills
4. Test end-to-end flow