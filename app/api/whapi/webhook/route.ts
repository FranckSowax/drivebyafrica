import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const WHAPI_WEBHOOK_SECRET = process.env.WHAPI_WEBHOOK_SECRET;

// ─── Types ───────────────────────────────────────────────

interface WhapiMessage {
  id: string;
  from: string;        // e.g. "241XXXXXXXX@s.whatsapp.net"
  from_me?: boolean;
  from_name?: string;
  type: string;        // "text" | "image" | "document" | "audio" | "video" | "location" | "sticker"
  text?: { body: string };
  timestamp: number;
  chat_id?: string;
}

interface WhapiStatusUpdate {
  id: string;          // Message ID
  status: string;      // "sent" | "delivered" | "read" | "failed"
  timestamp: number;
  recipient_id?: string;
}

// ─── Helpers ─────────────────────────────────────────────

function verifyWebhookSecret(request: NextRequest): boolean {
  if (!WHAPI_WEBHOOK_SECRET) {
    console.error('[WhapiWebhook] WHAPI_WEBHOOK_SECRET not configured');
    return false;
  }
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const queryToken = request.nextUrl.searchParams.get('token');
  return headerToken === WHAPI_WEBHOOK_SECRET || queryToken === WHAPI_WEBHOOK_SECRET;
}

function normalizePhone(phone: string): string {
  return phone
    .replace('@s.whatsapp.net', '')
    .replace(/[\s\-\+\(\)]/g, '');
}

function extractContent(message: WhapiMessage): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'image':
      return '[Image]';
    case 'document':
      return '[Document]';
    case 'audio':
      return '[Audio]';
    case 'video':
      return '[Vidéo]';
    case 'location':
      return '[Localisation]';
    case 'sticker':
      return '[Sticker]';
    default:
      return `[${message.type || 'Message'}]`;
  }
}

// ─── Incoming Message Handler ────────────────────────────

async function handleIncomingMessage(message: WhapiMessage): Promise<void> {
  const phone = normalizePhone(message.from);

  // 1. Deduplicate
  const { data: existing } = await supabaseAdmin
    .from('chat_messages')
    .select('id')
    .eq('whatsapp_message_id', message.id)
    .maybeSingle();

  if (existing) {
    console.log(`[WhapiWebhook] Duplicate message ignored: ${message.id}`);
    return;
  }

  // 2. Find user by phone number (suffix match to handle +/country code variations)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, whatsapp_number, phone')
    .or(`whatsapp_number.ilike.%${phone},phone.ilike.%${phone}`)
    .limit(1)
    .maybeSingle();

  if (!profile) {
    // Unknown number - create admin notification only (user_id is NOT NULL in chat_conversations)
    console.log(`[WhapiWebhook] Unknown number: +${phone}`);
    await supabaseAdmin.from('admin_notifications').insert({
      type: 'agent_request',
      title: 'Message WhatsApp - Numéro inconnu',
      message: `Message reçu de +${phone}: "${extractContent(message).substring(0, 200)}"`,
      priority: 'high',
      action_url: '/admin/messages',
      action_label: 'Voir',
      icon: 'message-circle',
      data: {
        phone,
        message_content: extractContent(message),
        whatsapp_message_id: message.id,
        from_name: message.from_name,
      },
    });
    return;
  }

  // 3. Find or create conversation for this user
  let conversationId: string;

  const { data: conv } = await supabaseAdmin
    .from('chat_conversations')
    .select('id')
    .eq('user_id', profile.id)
    .in('status', ['active', 'waiting_agent'])
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (conv) {
    conversationId = conv.id;
  } else {
    // Check for closed conversations to reopen
    const { data: closedConv } = await supabaseAdmin
      .from('chat_conversations')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'closed')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (closedConv) {
      // Reopen existing conversation
      await supabaseAdmin
        .from('chat_conversations')
        .update({
          status: 'waiting_agent',
          agent_requested_at: new Date().toISOString(),
          whatsapp_phone: phone,
        })
        .eq('id', closedConv.id);
      conversationId = closedConv.id;
    } else {
      // Create new conversation
      const { data: newConv, error } = await supabaseAdmin
        .from('chat_conversations')
        .insert({
          user_id: profile.id,
          status: 'waiting_agent',
          agent_requested_at: new Date().toISOString(),
          whatsapp_phone: phone,
        })
        .select('id')
        .single();

      if (error) throw error;
      conversationId = newConv.id;
    }
  }

  // 4. Insert message
  const content = extractContent(message);
  const { error: insertError } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'user',
      content,
      whatsapp_message_id: message.id,
      metadata: {
        source: 'whatsapp',
        whatsapp_type: message.type,
        from_name: message.from_name,
        phone,
        timestamp: message.timestamp,
      },
    });

  if (insertError) {
    console.error('[WhapiWebhook] Failed to insert message:', insertError);
    throw insertError;
  }

  // 5. Ensure conversation is in waiting_agent status
  await supabaseAdmin
    .from('chat_conversations')
    .update({
      status: 'waiting_agent',
      agent_requested_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .neq('status', 'waiting_agent');

  // 6. Create admin notification
  const customerName = profile.full_name || message.from_name || `+${phone}`;
  await supabaseAdmin.from('admin_notifications').insert({
    type: 'agent_request',
    title: `Message WhatsApp de ${customerName}`,
    message: content.substring(0, 100),
    priority: 'normal',
    action_url: '/admin/messages',
    action_label: 'Répondre',
    icon: 'message-circle',
    related_entity_type: 'chat_conversation',
    related_entity_id: conversationId,
    data: {
      conversation_id: conversationId,
      phone,
      customer_name: customerName,
    },
  });

  console.log(`[WhapiWebhook] Message stored from ${customerName} (${phone})`);
}

// ─── Status Update Handler ──────────────────────────────

async function handleStatusUpdate(status: WhapiStatusUpdate): Promise<void> {
  const { id: messageId, status: newStatus } = status;

  // Update notification_queue
  // DB status column only accepts: pending, processing, sent, failed, cancelled
  // Map whapi statuses to valid DB statuses
  const dbStatusMapping: Record<string, 'sent' | 'failed'> = {
    sent: 'sent',
    delivered: 'sent',  // keep as 'sent' in queue status, track actual status in whatsapp_status
    read: 'sent',
    failed: 'failed',
  };

  const dbStatus = dbStatusMapping[newStatus];
  if (!dbStatus) return;

  const { data } = await supabaseAdmin
    .from('notification_queue')
    .update({
      whatsapp_status: newStatus,
      status: dbStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('whatsapp_message_id', messageId)
    .select('id');

  if (data && data.length > 0) {
    const eventType = newStatus === 'failed' ? 'failed' : 'delivery_confirmed';
    await supabaseAdmin.from('notification_log').insert({
      queue_id: data[0].id,
      event_type: eventType,
      status_after: dbStatus,
    });
  }

  // Update read_at on chat_messages for read receipts
  if (newStatus === 'read') {
    await supabaseAdmin
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('whatsapp_message_id', messageId)
      .is('read_at', null);
  }

  console.log(`[WhapiWebhook] Status update: ${messageId} -> ${newStatus}`);
}

// ─── Route Handlers ─────────────────────────────────────

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Handle incoming messages
    if (body.messages && Array.isArray(body.messages)) {
      for (const message of body.messages) {
        if (message.from_me) continue;
        try {
          await handleIncomingMessage(message);
        } catch (err) {
          console.error('[WhapiWebhook] Error processing message:', err);
        }
      }
    }

    // Handle status updates
    if (body.statuses && Array.isArray(body.statuses)) {
      for (const status of body.statuses) {
        try {
          await handleStatusUpdate(status);
        } catch (err) {
          console.error('[WhapiWebhook] Error processing status:', err);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhapiWebhook] Fatal error:', error);
    // Return 200 to prevent Whapi from retrying indefinitely
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
