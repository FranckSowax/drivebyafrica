/**
 * Meta WhatsApp Cloud API client
 * Centralized module replacing all Whapi direct calls
 * API: graph.facebook.com/v21.0/{PHONE_ID}/messages
 */

import crypto from 'crypto';

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Env vars
function getConfig() {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;
  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;
  const appSecret = process.env.META_WHATSAPP_APP_SECRET;

  return { token, phoneId, verifyToken, appSecret };
}

function getMessagesUrl() {
  const { phoneId } = getConfig();
  if (!phoneId) throw new Error('META_WHATSAPP_PHONE_ID not configured');
  return `${META_BASE_URL}/${phoneId}/messages`;
}

// --- Types ---

export interface MetaSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MetaWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
  context?: { from: string; id: string };
}

export interface MetaWebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}

export interface MetaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: MetaWebhookMessage[];
      statuses?: MetaWebhookStatus[];
    };
    field: string;
  }>;
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: Array<{
    type: 'text' | 'image' | 'document' | 'video';
    text?: string;
    image?: { link: string };
    document?: { link: string; filename?: string };
  }>;
  sub_type?: 'url' | 'quick_reply';
  index?: number;
}

// --- Phone formatting ---

/**
 * Format phone number for Meta Cloud API
 * Meta expects digits only (no +, no @s.whatsapp.net)
 */
export function formatPhoneForMeta(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/[^0-9]/g, '');

  // If starts with 0, assume Gabon and prepend 241
  if (digits.startsWith('0')) {
    digits = '241' + digits.substring(1);
  }

  // If too short (no country code), assume Gabon
  if (digits.length <= 9) {
    digits = '241' + digits;
  }

  return digits;
}

// --- Core send function ---

async function sendToMeta(payload: Record<string, unknown>): Promise<MetaSendResult> {
  const { token } = getConfig();
  if (!token) {
    console.log('META_WHATSAPP_TOKEN not configured, skipping WhatsApp message');
    return { success: false, error: 'META_WHATSAPP_TOKEN non configuré' };
  }

  try {
    const url = getMessagesUrl();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        ...payload,
      }),
    });

    const result = await response.json();

    if (response.ok && result.messages?.[0]?.id) {
      return { success: true, messageId: result.messages[0].id };
    }

    const errorMsg = result.error?.message || JSON.stringify(result);
    console.error('Meta WhatsApp API error:', errorMsg);
    return { success: false, error: errorMsg };
  } catch (error) {
    console.error('Meta WhatsApp send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Connection error' };
  }
}

// --- Message sending functions ---

/**
 * Send a text message
 */
export async function sendTextMessage(phone: string, text: string): Promise<MetaSendResult> {
  const to = formatPhoneForMeta(phone);
  return sendToMeta({
    to,
    type: 'text',
    text: { preview_url: true, body: text },
  });
}

/**
 * Send an image message with optional caption
 */
export async function sendImageMessage(
  phone: string,
  imageUrl: string,
  caption?: string
): Promise<MetaSendResult> {
  const to = formatPhoneForMeta(phone);
  const result = await sendToMeta({
    to,
    type: 'image',
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  });

  // Fallback to text if image fails
  if (!result.success) {
    console.log('Image message failed, falling back to text');
    return sendTextMessage(phone, `${caption || ''}\n\n📷 Image: ${imageUrl}`);
  }
  return result;
}

/**
 * Send a document message (PDF, etc.)
 */
export async function sendDocumentMessage(
  phone: string,
  docUrl: string,
  filename: string,
  caption?: string
): Promise<MetaSendResult> {
  const to = formatPhoneForMeta(phone);
  const result = await sendToMeta({
    to,
    type: 'document',
    document: {
      link: docUrl,
      filename,
      ...(caption ? { caption } : {}),
    },
  });

  // Fallback to text if document fails
  if (!result.success) {
    console.log('Document message failed, falling back to text');
    return sendTextMessage(phone, `${caption || ''}\n\n📄 ${filename}: ${docUrl}`);
  }
  return result;
}

/**
 * Send an interactive message with CTA URL button
 * Supports optional image header for rich vehicle cards
 */
export async function sendInteractiveMessage(
  phone: string,
  bodyText: string,
  buttonText: string,
  buttonUrl: string,
  imageUrl?: string
): Promise<MetaSendResult> {
  const to = formatPhoneForMeta(phone);

  const interactive: Record<string, unknown> = {
    type: 'cta_url',
    body: { text: bodyText },
    footer: { text: 'Driveby Africa - Import véhicules' },
    action: {
      name: 'cta_url',
      parameters: {
        display_text: buttonText.substring(0, 20),
        url: buttonUrl,
      },
    },
  };

  // Add image header if provided
  if (imageUrl) {
    interactive.header = {
      type: 'image',
      image: { link: imageUrl },
    };
  }

  const result = await sendToMeta({
    to,
    type: 'interactive',
    interactive,
  });

  // Fallback to text with link if interactive fails
  if (!result.success) {
    console.log('Interactive message failed, falling back to text');
    return sendTextMessage(phone, `${bodyText}\n\n👉 ${buttonUrl}`);
  }
  return result;
}

/**
 * Send a template message (for campaigns and outbound beyond 24h window)
 */
export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  language: string = 'fr',
  components?: TemplateComponent[]
): Promise<MetaSendResult> {
  const to = formatPhoneForMeta(phone);
  return sendToMeta({
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      ...(components ? { components } : {}),
    },
  });
}

/**
 * Send reply buttons (up to 3 quick reply buttons)
 */
export async function sendReplyButtons(
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<MetaSendResult> {
  const to = formatPhoneForMeta(phone);
  return sendToMeta({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map(btn => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title.substring(0, 20) },
        })),
      },
    },
  });
}

// --- Webhook verification ---

/**
 * Verify Meta webhook signature (X-Hub-Signature-256)
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
  const { appSecret } = getConfig();
  if (!appSecret) {
    console.error('META_WHATSAPP_APP_SECRET not configured');
    return false;
  }

  const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature));
}

/**
 * Verify webhook subscription (GET request from Meta)
 */
export function verifyWebhookSubscription(
  mode: string | null,
  token: string | null,
  challenge: string | null
): { valid: boolean; challenge?: string } {
  const { verifyToken } = getConfig();

  if (mode === 'subscribe' && token === verifyToken) {
    return { valid: true, challenge: challenge || '' };
  }

  return { valid: false };
}

// --- Webhook parsing helpers ---

/**
 * Parse incoming webhook payload and extract messages and statuses
 */
export function parseWebhookPayload(body: { entry?: MetaWebhookEntry[] }): {
  messages: Array<MetaWebhookMessage & { contactName?: string }>;
  statuses: MetaWebhookStatus[];
} {
  const messages: Array<MetaWebhookMessage & { contactName?: string }> = [];
  const statuses: MetaWebhookStatus[] = [];

  if (!body.entry) return { messages, statuses };

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value;

      if (value.messages) {
        for (const msg of value.messages) {
          const contact = value.contacts?.find(c => c.wa_id === msg.from);
          messages.push({ ...msg, contactName: contact?.profile?.name });
        }
      }

      if (value.statuses) {
        statuses.push(...value.statuses);
      }
    }
  }

  return { messages, statuses };
}

/**
 * Check if Meta API is configured
 */
export function isConfigured(): boolean {
  const { token, phoneId } = getConfig();
  return !!(token && phoneId);
}
