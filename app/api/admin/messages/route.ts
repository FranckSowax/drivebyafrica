import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';

// GET: Fetch all conversations with their last messages
export async function GET(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = adminCheck.supabase;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const conversationId = searchParams.get('conversationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // If conversationId is provided, fetch messages for that conversation
    if (conversationId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseAny = supabase as any;

      const { data: messages, error } = await supabaseAny
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mark messages as read
      await supabaseAny
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .is('read_at', null)
        .neq('sender_type', 'agent');

      return NextResponse.json({ messages });
    }

    // Get all conversations with user info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    let query = supabaseAny
      .from('chat_conversations')
      .select('*', { count: 'exact' })
      .order('last_message_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: conversations, error, count } = await query;

    if (error) throw error;

    // Get user profiles for these conversations
    const userIds: string[] = [...new Set(conversations?.map((c: { user_id: string }) => c.user_id) || [])] as string[];
    let profiles: Record<string, { full_name: string | null; phone: string | null; whatsapp_number: string | null; country: string | null; avatar_url: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, whatsapp_number, country, avatar_url')
        .in('id', userIds as string[]);

      if (profilesData) {
        profiles = profilesData.reduce((acc, p) => {
          acc[p.id] = {
            full_name: p.full_name,
            phone: p.phone,
            whatsapp_number: p.whatsapp_number,
            country: p.country,
            avatar_url: p.avatar_url,
          };
          return acc;
        }, {} as typeof profiles);
      }
    }

    // Get unread counts and last message for each conversation
    const conversationIds = conversations?.map((c: { id: string }) => c.id) || [];
    const unreadCounts: Record<string, number> = {};
    const lastMessages: Record<string, { content: string; sender_type: string; created_at: string }> = {};

    if (conversationIds.length > 0) {
      // Get unread counts (messages not from agent that haven't been read)
      const { data: unreadData } = await supabaseAny
        .from('chat_messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .is('read_at', null)
        .neq('sender_type', 'agent');

      if (unreadData) {
        unreadData.forEach((m: { conversation_id: string }) => {
          unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1;
        });
      }

      // Get last message for each conversation
      for (const convId of conversationIds) {
        const { data: lastMsg } = await supabaseAny
          .from('chat_messages')
          .select('content, sender_type, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMsg) {
          lastMessages[convId] = lastMsg;
        }
      }
    }

    // Filter by search if provided
    let filteredConversations = conversations || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredConversations = filteredConversations.filter((c: { user_id: string }) => {
        const profile = profiles[c.user_id];
        return (
          profile?.full_name?.toLowerCase().includes(searchLower) ||
          profile?.phone?.includes(search) ||
          profile?.whatsapp_number?.includes(search)
        );
      });
    }

    // Enrich conversations with user info
    const enrichedConversations = filteredConversations.map((c: { id: string; user_id: string; status: string; created_at: string; last_message_at: string; agent_requested_at: string | null }) => ({
      ...c,
      customer_name: profiles[c.user_id]?.full_name || 'Utilisateur',
      customer_phone: profiles[c.user_id]?.phone || '',
      customer_whatsapp: profiles[c.user_id]?.whatsapp_number || profiles[c.user_id]?.phone || '',
      customer_country: profiles[c.user_id]?.country || '',
      customer_avatar: profiles[c.user_id]?.avatar_url || '',
      unread_count: unreadCounts[c.id] || 0,
      last_message: lastMessages[c.id] || null,
    }));

    // Calculate stats
    const stats = {
      total: count || 0,
      active: conversations?.filter((c: { status: string }) => c.status === 'active').length || 0,
      waiting_agent: conversations?.filter((c: { status: string }) => c.status === 'waiting_agent').length || 0,
      closed: conversations?.filter((c: { status: string }) => c.status === 'closed').length || 0,
      unread_total: Object.values(unreadCounts).reduce((a, b) => a + b, 0),
    };

    return NextResponse.json({
      conversations: enrichedConversations,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des conversations' },
      { status: 500 }
    );
  }
}

// POST: Send a message as agent
export async function POST(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = adminCheck.supabase;
    const body = await request.json();
    const { conversationId, content } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: 'Conversation ID et contenu requis' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    // Insert agent message
    const { data: message, error: msgError } = await supabaseAny
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        content,
        metadata: { type: 'agent_response' },
      })
      .select()
      .single();

    if (msgError) throw msgError;

    // Update conversation status to active (agent responded)
    await supabaseAny
      .from('chat_conversations')
      .update({
        status: 'active',
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}

// PUT: Update conversation status
export async function PUT(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = adminCheck.supabase;
    const body = await request.json();
    const { conversationId, status } = body;

    if (!conversationId || !status) {
      return NextResponse.json(
        { error: 'Conversation ID et statut requis' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['active', 'closed', 'waiting_agent'].includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    const { error } = await supabaseAny
      .from('chat_conversations')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) throw error;

    // Add system message if closing
    if (status === 'closed') {
      await supabaseAny.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_type: 'bot',
        content: 'Cette conversation a été fermée. Merci de nous avoir contactés!',
        metadata: { type: 'system_closed' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la conversation' },
      { status: 500 }
    );
  }
}
