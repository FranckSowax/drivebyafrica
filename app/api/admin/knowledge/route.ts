import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
  getDocumentStats,
  type KnowledgeCategory,
  type KnowledgeSource,
} from '@/lib/rag/knowledge-base';

/**
 * GET /api/admin/knowledge
 * List documents with optional filtering
 */
export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as KnowledgeCategory | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const [result, stats] = await Promise.all([
      listDocuments({ category: category || undefined, limit, offset }),
      getDocumentStats(),
    ]);

    return NextResponse.json({
      documents: result.documents,
      total: result.total,
      stats,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  } catch (error) {
    console.error('Knowledge list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/admin/knowledge
 * Create a new knowledge document
 */
export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await request.json();
    const { title, content, category, language, source } = body;

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Titre, contenu et catégorie requis' }, { status: 400 });
    }

    const doc = await addDocument(title, content, category as KnowledgeCategory, {
      language: language || 'fr',
      source: (source || 'admin') as KnowledgeSource,
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('Knowledge create error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/admin/knowledge
 * Update an existing document
 */
export async function PUT(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await request.json();
    const { id, title, content, category, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (is_active !== undefined) updates.is_active = is_active;

    const doc = await updateDocument(id, updates);

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('Knowledge update error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/knowledge
 * Delete a document
 */
export async function DELETE(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    await deleteDocument(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Knowledge delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/knowledge
 * Search knowledge base (for testing)
 */
export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await request.json();
    const { action, query, category } = body;

    if (action === 'search') {
      const { searchKnowledge } = await import('@/lib/rag/knowledge-base');
      const results = await searchKnowledge(query, { category, limit: 5 });
      return NextResponse.json({ results });
    }

    if (action === 'seed') {
      const { seedKnowledgeBase } = await import('@/lib/rag/seed-knowledge');
      await seedKnowledgeBase();
      return NextResponse.json({ success: true, message: 'Base de connaissance initialisée' });
    }

    if (action === 'test_chatbot') {
      const { message, phone } = body;
      if (!message) {
        return NextResponse.json({ error: 'Message requis' }, { status: 400 });
      }
      const { testChatbot } = await import('@/lib/whatsapp/chatbot');
      const result = await testChatbot(message, 'Admin Test');
      return NextResponse.json({
        response: result.response,
        vehicles_found: result.vehicles_found,
        context_preview: result.context,
      });
    }

    if (action === 'list_conversations') {
      const { status } = body;
      let query = (supabaseAdmin as any)
        .from('whatsapp_conversations')
        .select('id, phone, user_id, status, last_message_at, created_at, context')
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: conversations } = await query;

      // Enrich with user names (from profile or conversation context)
      const enriched = await Promise.all(
        (conversations || []).map(async (conv: any) => {
          let user_name = null;
          if (conv.user_id) {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('full_name')
              .eq('id', conv.user_id)
              .single();
            user_name = profile?.full_name || null;
          }
          // Fallback: use contact_name from conversation context
          if (!user_name && conv.context?.contact_name) {
            user_name = conv.context.contact_name;
          }
          return { ...conv, user_name };
        })
      );

      return NextResponse.json({ conversations: enriched });
    }

    if (action === 'conversation_messages') {
      const { conversation_id } = body;
      if (!conversation_id) {
        return NextResponse.json({ error: 'conversation_id requis' }, { status: 400 });
      }

      // Get conversation with context (needed for recent_messages fallback)
      const { data: conv } = await (supabaseAdmin as any)
        .from('whatsapp_conversations')
        .select('user_id, phone, context')
        .eq('id', conversation_id)
        .single();

      if (!conv) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
      }

      // Get messages from chat_conversations/chat_messages (registered users)
      let messages: Array<{ sender_type: string; content: string; created_at: string }> = [];

      if (conv.user_id) {
        const { data: chatConv } = await supabaseAdmin
          .from('chat_conversations')
          .select('id')
          .eq('user_id', conv.user_id)
          .order('last_message_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (chatConv) {
          const { data: msgs } = await supabaseAdmin
            .from('chat_messages')
            .select('sender_type, content, created_at')
            .eq('conversation_id', chatConv.id)
            .order('created_at', { ascending: true })
            .limit(100);

          messages = msgs || [];
        }
      }

      // Fallback: use context.recent_messages from whatsapp_conversations
      const ctx = conv.context as { recent_messages?: string[] } | null;
      if (messages.length === 0 && ctx?.recent_messages && ctx.recent_messages.length > 0) {
        messages = ctx.recent_messages.map((msg: string, i: number) => ({
          sender_type: msg.startsWith('Bot:') ? 'bot' : msg.startsWith('Admin:') ? 'agent' : 'user',
          content: msg.replace(/^(Bot|User|Admin): /, ''),
          created_at: new Date(Date.now() - (ctx.recent_messages!.length - i) * 60000).toISOString(),
        }));
      }

      return NextResponse.json({ messages });
    }

    // --- Admin reply to WhatsApp conversation ---
    if (action === 'send_reply') {
      const { conversation_id, message } = body;
      if (!conversation_id || !message) {
        return NextResponse.json({ error: 'conversation_id et message requis' }, { status: 400 });
      }

      // Get conversation phone
      const { data: conv } = await (supabaseAdmin as any)
        .from('whatsapp_conversations')
        .select('phone, user_id, last_message_at')
        .eq('id', conversation_id)
        .single();

      if (!conv) {
        return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
      }

      // Check 24h window
      const lastMsg = new Date(conv.last_message_at);
      const hoursSince = (Date.now() - lastMsg.getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        return NextResponse.json({
          error: 'Fenêtre de 24h dépassée. Utilisez un template pour envoyer un message.',
          expired: true,
        }, { status: 400 });
      }

      // Send via Meta WhatsApp
      const { sendTextMessage } = await import('@/lib/whatsapp/meta-client');
      const sendResult = await sendTextMessage(conv.phone, message);

      if (!sendResult.success) {
        return NextResponse.json({ error: sendResult.error || 'Échec envoi' }, { status: 500 });
      }

      // Store agent message in chat_messages if user_id exists
      if (conv.user_id) {
        const { data: chatConv } = await supabaseAdmin
          .from('chat_conversations')
          .select('id')
          .eq('user_id', conv.user_id)
          .order('last_message_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (chatConv) {
          await supabaseAdmin.from('chat_messages').insert({
            conversation_id: chatConv.id,
            sender_type: 'agent',
            content: message,
            metadata: { source: 'admin_reply', whatsapp_conversation_id: conversation_id },
          });
        }
      }

      // Store admin reply in context.recent_messages (for all contacts)
      try {
        const { data: convCtx } = await (supabaseAdmin as any)
          .from('whatsapp_conversations')
          .select('context')
          .eq('id', conversation_id)
          .single();
        const ctx = (convCtx?.context || {}) as { recent_messages?: string[]; [key: string]: unknown };
        const recentMessages = ctx.recent_messages || [];
        recentMessages.push(`Admin: ${message.substring(0, 300)}`);
        if (recentMessages.length > 20) recentMessages.splice(0, recentMessages.length - 20);
        await (supabaseAdmin as any)
          .from('whatsapp_conversations')
          .update({
            context: { ...ctx, recent_messages: recentMessages },
            last_message_at: new Date().toISOString(),
            status: 'active',
          })
          .eq('id', conversation_id);
      } catch {
        // Fallback: just update status
        await (supabaseAdmin as any)
          .from('whatsapp_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            status: 'active',
          })
          .eq('id', conversation_id);
      }

      return NextResponse.json({ success: true, messageId: sendResult.messageId });
    }

    // --- Update conversation status ---
    if (action === 'update_conv_status') {
      const { conversation_id, status: newStatus } = body;
      if (!conversation_id || !newStatus) {
        return NextResponse.json({ error: 'conversation_id et status requis' }, { status: 400 });
      }

      await (supabaseAdmin as any)
        .from('whatsapp_conversations')
        .update({ status: newStatus })
        .eq('id', conversation_id);

      return NextResponse.json({ success: true });
    }

    // --- Daily Reports ---
    if (action === 'list_reports') {
      const { data: reports } = await (supabaseAdmin as any)
        .from('daily_reports')
        .select('id, report_date, summary, conversations_analyzed, added_to_knowledge_base, created_at')
        .order('report_date', { ascending: false })
        .limit(30);

      return NextResponse.json({ reports: reports || [] });
    }

    if (action === 'generate_report') {
      const { date } = body;
      const { generateDailyReport } = await import('@/lib/reports/daily-report');
      const report = await generateDailyReport(date);
      return NextResponse.json({ report });
    }

    if (action === 'add_report_to_kb') {
      const { report_id } = body;
      if (!report_id) {
        return NextResponse.json({ error: 'report_id requis' }, { status: 400 });
      }
      const { addReportToKnowledgeBase } = await import('@/lib/reports/daily-report');
      await addReportToKnowledgeBase(report_id);
      return NextResponse.json({ success: true });
    }

    if (action === 'sync_vehicle_knowledge') {
      const { syncVehicleKnowledge } = await import('@/lib/rag/vehicle-knowledge-sync');
      const result = await syncVehicleKnowledge();
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'get_report') {
      const { report_id } = body;
      if (!report_id) {
        return NextResponse.json({ error: 'report_id requis' }, { status: 400 });
      }
      const { data: report } = await (supabaseAdmin as any)
        .from('daily_reports')
        .select('*')
        .eq('id', report_id)
        .single();

      if (!report) {
        return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 });
      }
      return NextResponse.json({ report });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Knowledge action error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
