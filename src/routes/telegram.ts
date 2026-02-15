import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { ensureMoltbotGateway } from '../gateway';

/**
 * Telegram Bot Webhook Handler
 * 
 * Endpoints:
 * - POST /api/telegram - Incoming Telegram messages
 * - GET  /api/telegram/set-webhook - Set webhook URL
 */
export const telegram = new Hono<AppEnv>();

/**
 * Set Telegram webhook (call once after deployment)
 */
telegram.get('/set-webhook', async (c) => {
  const token = c.env.TELEGRAM_BOT_TOKEN;
  const workerUrl = c.env.WORKER_URL || `https://${c.req.header('host')}`;
  
  if (!token) {
    return c.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, 400);
  }
  
  const webhookUrl = `${workerUrl}/api/telegram`;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        max_connections: 40,
        allowed_updates: ['message', 'callback_query']
      })
    });
    
    const result = await response.json();
    
    return c.json({
      success: result.ok,
      message: result.description || 'Webhook set',
      webhookUrl,
      result
    });
  } catch (error) {
    console.error('Error setting Telegram webhook:', error);
    return c.json({ error: 'Failed to set webhook' }, 500);
  }
});

/**
 * Get webhook info
 */
telegram.get('/webhook-info', async (c) => {
  const token = c.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return c.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, 400);
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const result = await response.json();
    
    return c.json(result);
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return c.json({ error: 'Failed to get webhook info' }, 500);
  }
});

/**
 * Delete webhook
 */
telegram.get('/delete-webhook', async (c) => {
  const token = c.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return c.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, 400);
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    const result = await response.json();
    
    return c.json({
      success: result.ok,
      message: result.description || 'Webhook deleted',
      result
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return c.json({ error: 'Failed to delete webhook' }, 500);
  }
});

/**
 * Incoming Telegram messages (webhook)
 */
telegram.post('/', async (c) => {
  try {
    const update = await c.req.json();
    console.log('Telegram webhook received:', JSON.stringify(update, null, 2));
    
    // Handle different update types
    if (update.message) {
      await handleMessage(c, update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(c, update.callback_query);
    } else if (update.edited_message) {
      await handleMessage(c, update.edited_message);
    }
    
    return c.text('OK');
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return c.text('Internal server error', 500);
  }
});

/**
 * Handle incoming message
 */
async function handleMessage(c: any, message: any) {
  const chatId = message.chat.id;
  const text = message.text || message.caption || '';
  const messageId = message.message_id;
  const from = message.from;
  
  console.log(`Telegram message from ${from?.username || from?.id} (${chatId}): ${text}`);
  
  // Ignore non-text messages or commands
  if (!text || text.startsWith('/')) {
    if (text === '/start') {
      await sendTelegramMessage(c.env, chatId, 'Hello! I\'m Moltbot powered by DeepSeek. Send me any message and I\'ll respond!');
    }
    return;
  }
  
  // Forward to Moltbot
  const response = await forwardToMoltbot(c, chatId.toString(), text, from);
  
  if (response) {
    await sendTelegramMessage(c.env, chatId, response, messageId);
  }
}

/**
 * Handle callback query (button clicks)
 */
async function handleCallbackQuery(c: any, callbackQuery: any) {
  const chatId = callbackQuery.message?.chat?.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message?.message_id;
  const from = callbackQuery.from;
  
  console.log(`Telegram callback from ${from?.username || from?.id}: ${data}`);
  
  if (data && chatId) {
    // Forward to Moltbot
    const response = await forwardToMoltbot(c, chatId.toString(), `[button] ${data}`, from);
    
    if (response) {
      await sendTelegramMessage(c.env, chatId, response, messageId);
    }
    
    // Answer callback query (removes loading state)
    await answerCallbackQuery(c.env, callbackQuery.id);
  }
}

/**
 * Forward message to Moltbot gateway
 */
async function forwardToMoltbot(c: any, chatId: string, text: string, from: any) {
  try {
    const sandbox = c.get('sandbox');
    const env = c.env;
    
    // Ensure moltbot is running
    await ensureMoltbotGateway(sandbox, env);
    
    // Create a unique device ID for Telegram
    const username = from?.username ? `@${from.username}` : `user${from?.id}`;
    const deviceId = `telegram:${chatId}:${username}`;
    
    // Send message to moltbot via CLI
    const command = `echo "${text.replace(/"/g, '\\"')}" | clawdbot chat --device-id ${deviceId} --url ws://localhost:18789`;
    
    console.log(`Forwarding to moltbot: ${command}`);
    
    const proc = await sandbox.startProcess(command);
    const logs = await proc.getLogs();
    
    console.log('Moltbot response:', logs.stdout);
    
    // Get response from moltbot
    return logs.stdout.trim();
    
  } catch (error) {
    console.error('Error forwarding to moltbot:', error);
    return 'Sorry, I encountered an error processing your message.';
  }
}

/**
 * Send message via Telegram Bot API
 */
export async function sendTelegramMessage(env: any, chatId: number | string, text: string, replyToMessageId?: number) {
  const token = env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return;
  }
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const messageData: any = {
    chat_id: chatId,
    text: text.substring(0, 4096), // Telegram text limit
    parse_mode: 'Markdown'
  };
  
  // Add reply if specified
  if (replyToMessageId) {
    messageData.reply_to_message_id = replyToMessageId;
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.ok) {
      console.log('Telegram message sent successfully');
    } else {
      console.error('Failed to send Telegram message:', result);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

/**
 * Answer callback query
 */
async function answerCallbackQuery(env: any, callbackQueryId: string) {
  const token = env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return;
  }
  
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query_id: callbackQueryId
      })
    });
  } catch (error) {
    console.error('Error answering callback query:', error);
  }
}

/**
 * Send typing indicator
 */
export async function sendTypingAction(env: any, chatId: number | string) {
  const token = env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return;
  }
  
  const url = `https://api.telegram.org/bot${token}/sendChatAction`;
  
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing'
      })
    });
  } catch (error) {
    console.error('Error sending typing action:', error);
  }
}