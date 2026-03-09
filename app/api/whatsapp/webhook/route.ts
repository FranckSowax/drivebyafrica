import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  verifyWebhookSignature,
  verifyWebhookSubscription,
  parseWebhookPayload,
} from '@/lib/whatsapp/meta-client';
import type { MetaWebhookMessage, MetaWebhookStatus } from '@/lib/whatsapp/meta-client';
import { handleChatbotMessage } from '@/lib/whatsapp/chatbot';

// ─── Helpers ─────────────────────────────────────────────

function extractContent(message: MetaWebhookMessage): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'image':
      return message.image?.caption || '[Image]';
    case 'document':
      return message.document?.caption || '[Document]';
    case 'interactive':
      return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '[Interactive]';
    default:
      return `[${message.type || 'Message'}]`;
  }
}

// ─── Incoming Message Handler ────────────────────────────

async function handleIncomingMessage(message: MetaWebhookMessage & { contactName?: string }): Promise<void> {
  const phone = message.from; // Meta sends digits only

  // 1. Deduplicate
  const { data: existing } = await supabaseAdmin
    .from('chat_messages')
    .select('id')
    .eq('whatsapp_message_id', message.id)
    .maybeSingle();

  if (existing) {
    console.log(`[MetaWebhook] Duplicate message ignored: ${message.id}`);
    return;
  }

  // 2. Find user by phone number
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, whatsapp_number, phone')
    .or(`whatsapp_number.ilike.%${phone},phone.ilike.%${phone}`)
    .limit(1)
    .maybeSingle();

  const content = extractContent(message);
  const customerName = profile?.full_name || message.contactName || `+${phone}`;

  // 3. For unknown numbers: still run chatbot, then notify admin
  if (!profile) {
    console.log(`[MetaWebhook] New contact: +${phone} (${message.contactName || 'unknown'})`);

    // Try chatbot auto-reply even for unknown numbers
    const autoReplyEnabled = process.env.CHATBOT_AUTO_REPLY !== 'false';
    if (autoReplyEnabled && message.type === 'text' && content) {
      try {
        const chatbotResult = await handleChatbotMessage(phone, content, message.contactName);
        if (chatbotResult.replied) {
          console.log(`[MetaWebhook] Chatbot replied to new contact +${phone}`);
        }
      } catch (err) {
        console.error('[MetaWebhook] Chatbot error for new contact:', err);
      }
    }

    // Notify admin about new contact
    await supabaseAdmin.from('admin_notifications').insert({
      type: 'agent_request',
      title: `Nouveau contact WhatsApp: ${customerName}`,
      message: `Message de +${phone}: "${content.substring(0, 200)}"`,
      priority: 'normal',
      action_url: '/admin/messages',
      action_label: 'Voir',
      icon: 'message-circle',
      data: {
        phone,
        message_content: content,
        whatsapp_message_id: message.id,
        from_name: message.contactName,
      },
    });
    return;
  }

  // 4. Find or create conversation (for registered users)
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
    const { data: closedConv } = await supabaseAdmin
      .from('chat_conversations')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'closed')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (closedConv) {
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

  // 5. Insert message
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
        from_name: message.contactName,
        phone,
        timestamp: message.timestamp,
      },
    });

  if (insertError) {
    console.error('[MetaWebhook] Failed to insert message:', insertError);
    throw insertError;
  }

  // 6. Try chatbot auto-reply for text messages (if enabled)
  const autoReplyEnabled = process.env.CHATBOT_AUTO_REPLY !== 'false';
  if (autoReplyEnabled && message.type === 'text' && content) {
    try {
      const chatbotResult = await handleChatbotMessage(phone, content, message.contactName);
      if (chatbotResult.replied) {
        console.log(`[MetaWebhook] Chatbot replied to ${phone} (escalated: ${chatbotResult.escalated})`);
        return; // Chatbot handled it — no need for admin notification
      }
    } catch (err) {
      console.error('[MetaWebhook] Chatbot error, falling back to agent notification:', err);
    }
  }

  // 7. Ensure conversation is in waiting_agent status (fallback when chatbot didn't reply)
  await supabaseAdmin
    .from('chat_conversations')
    .update({
      status: 'waiting_agent',
      agent_requested_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .neq('status', 'waiting_agent');

  // 8. Create admin notification
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

  console.log(`[MetaWebhook] Message stored from ${customerName} (${phone})`);
}

// ─── Status Update Handler ──────────────────────────────

async function handleStatusUpdate(status: MetaWebhookStatus): Promise<void> {
  const { id: messageId, status: newStatus } = status;

  const dbStatusMapping: Record<string, 'sent' | 'failed'> = {
    sent: 'sent',
    delivered: 'sent',
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

  if (newStatus === 'read') {
    await supabaseAdmin
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('whatsapp_message_id', messageId)
      .is('read_at', null);
  }

  // Update campaign recipient status if applicable
  if (['delivered', 'read', 'failed'].includes(newStatus)) {
    const updateData: Record<string, string> = { status: newStatus };
    if (newStatus === 'delivered') updateData.delivered_at = new Date().toISOString();
    if (newStatus === 'read') {
      updateData.delivered_at = new Date().toISOString();
      updateData.read_at = new Date().toISOString();
    }

    await (supabaseAdmin as any)
      .from('whatsapp_campaign_recipients')
      .update(updateData)
      .eq('whatsapp_message_id', messageId);
  }

  console.log(`[MetaWebhook] Status update: ${messageId} -> ${newStatus}`);
}

// ─── Route Handlers ─────────────────────────────────────

/**
 * GET: Meta webhook verification (subscription)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const result = verifyWebhookSubscription(mode, token, challenge);

  if (result.valid) {
    // Meta expects the challenge as plain text response
    return new NextResponse(result.challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST: Incoming messages and status updates from Meta
 *
 * IMPORTANT: Return 200 immediately, then process async.
 * Meta imposes a 15s timeout — chatbot RAG + GPT can exceed that.
 * Using fire-and-forget pattern to avoid webhook retries.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify signature if app secret is configured
    const signature = request.headers.get('x-hub-signature-256');
    if (signature) {
      if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('[MetaWebhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    // Parse Meta webhook format
    const { messages, statuses } = parseWebhookPayload(body);

    // Process messages and statuses synchronously
    // Netlify kills the process after response is sent, so after() doesn't work.
    // We process everything before returning 200 to Meta (must complete within 15s).
    for (const message of messages) {
      try {
        await handleIncomingMessage(message);
      } catch (err) {
        console.error('[MetaWebhook] Error processing message:', err);
      }
    }

    for (const status of statuses) {
      try {
        await handleStatusUpdate(status);
      } catch (err) {
        console.error('[MetaWebhook] Error processing status:', err);
      }
    }

    // Return 200 to Meta
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MetaWebhook] Fatal error:', error);
    // Return 200 to prevent Meta from retrying indefinitely
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
