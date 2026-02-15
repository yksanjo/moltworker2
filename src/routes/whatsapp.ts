import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { ensureMoltbotGateway } from '../gateway';

/**
 * WhatsApp Business API Webhook Handler
 * 
 * Endpoints:
 * - GET  /api/whatsapp - Webhook verification (Meta sends challenge)
 * - POST /api/whatsapp - Incoming WhatsApp messages
 */
export const whatsapp = new Hono<AppEnv>();

/**
 * Webhook Verification
 * Meta sends GET request with hub.mode, hub.challenge, hub.verify_token
 */
whatsapp.get('/', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  console.log('WhatsApp webhook verification request:', { mode, token, challenge });

  // Verify the token matches our configured token
  const expectedToken = c.env.WHATSAPP_WEBHOOK_TOKEN;
  
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('WhatsApp webhook verified successfully');
    return c.text(challenge || '');
  } else {
    console.log('WhatsApp webhook verification failed');
    return c.text('Verification failed', 403);
  }
});

/**
 * Incoming WhatsApp Messages
 * Meta sends POST request with message data
 */
whatsapp.post('/', async (c) => {
  try {
    const body = await c.req.json();
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Verify this is a message event
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Handle different message types
            if (value.messages && value.messages.length > 0) {
              const message = value.messages[0];
              const from = message.from; // Sender phone number
              const messageType = message.type;
              
              console.log(`WhatsApp message from ${from}, type: ${messageType}`);
              
              // Get message text based on type
              let messageText = '';
              switch (messageType) {
                case 'text':
                  messageText = message.text?.body || '';
                  break;
                case 'interactive':
                  messageText = message.interactive?.button_reply?.title || 
                               message.interactive?.list_reply?.title || '';
                  break;
                case 'button':
                  messageText = message.button?.text || '';
                  break;
                default:
                  messageText = `[${messageType} message]`;
              }
              
              if (messageText) {
                // Forward message to Moltbot gateway
                await forwardToMoltbot(c, from, messageText, message.id);
              }
            }
            
            // Handle status updates
            if (value.statuses && value.statuses.length > 0) {
              const status = value.statuses[0];
              console.log(`Message status update: ${status.status} for ${status.id}`);
            }
          }
        }
      }
      
      return c.text('EVENT_RECEIVED', 200);
    }
    
    return c.text('Not a WhatsApp event', 400);
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return c.text('Internal server error', 500);
  }
});

/**
 * Forward WhatsApp message to Moltbot gateway
 */
async function forwardToMoltbot(c: any, from: string, text: string, messageId: string) {
  try {
    const sandbox = c.get('sandbox');
    const env = c.env;
    
    // Ensure moltbot is running
    await ensureMoltbotGateway(sandbox, env);
    
    // Create a unique device ID for WhatsApp
    const deviceId = `whatsapp:${from}`;
    
    // Send message to moltbot via CLI
    // Format: echo "message" | clawdbot chat --device-id <id> --url ws://localhost:18789
    const command = `echo "${text.replace(/"/g, '\\"')}" | clawdbot chat --device-id ${deviceId} --url ws://localhost:18789`;
    
    console.log(`Forwarding to moltbot: ${command}`);
    
    const proc = await sandbox.startProcess(command);
    const logs = await proc.getLogs();
    
    console.log('Moltbot response:', logs.stdout);
    
    // Get response from moltbot
    const response = logs.stdout.trim();
    
    if (response) {
      // Send response back via WhatsApp API
      await sendWhatsAppMessage(c.env, from, response, messageId);
    }
    
  } catch (error) {
    console.error('Error forwarding to moltbot:', error);
  }
}

/**
 * Send message via WhatsApp Business API
 */
async function sendWhatsAppMessage(env: any, to: string, text: string, replyToMessageId?: string) {
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = env.WHATSAPP_BUSINESS_TOKEN;
  
  if (!phoneNumberId || !accessToken) {
    console.error('WhatsApp credentials not configured');
    return;
  }
  
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  const messageData: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: {
      body: text.substring(0, 4096) // WhatsApp text limit
    }
  };
  
  // Add context for replying to specific message
  if (replyToMessageId) {
    messageData.context = {
      message_id: replyToMessageId
    };
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('WhatsApp message sent successfully:', result);
    } else {
      console.error('Failed to send WhatsApp message:', result);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

/**
 * Send WhatsApp template message (for proactive messages)
 */
export async function sendWhatsAppTemplate(env: any, to: string, templateName: string, languageCode: string = 'en', components?: any[]) {
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = env.WHATSAPP_BUSINESS_TOKEN;
  
  if (!phoneNumberId || !accessToken) {
    console.error('WhatsApp credentials not configured');
    return;
  }
  
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  const messageData: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      }
    }
  };
  
  if (components) {
    messageData.template.components = components;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('WhatsApp template sent successfully:', result);
    } else {
      console.error('Failed to send WhatsApp template:', result);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending WhatsApp template:', error);
  }
}