import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiRateLimiter,
  getClientIP,
  checkRateLimit,
  rateLimitResponse,
  isRateLimitConfigured,
} from '@/lib/rate-limit';

// GET - Fetch user's conversations and messages
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Fetch messages for a specific conversation
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return NextResponse.json({ messages });
    }

    // Fetch all conversations for the user
    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        chat_messages (
          id,
          content,
          sender_type,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des messages' },
      { status: 500 }
    );
  }
}

// POST - Create a new message or conversation
export async function POST(request: Request) {
  try {
    // Rate limiting check (if configured)
    if (isRateLimitConfigured()) {
      const ip = getClientIP(request);
      const rateLimit = await checkRateLimit(apiRateLimiter, ip);
      if (!rateLimit.success) {
        return rateLimitResponse(rateLimit.reset);
      }
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, content, action } = body;

    // Validate message length (max 5000 characters)
    if (content && typeof content === 'string' && content.length > 5000) {
      return NextResponse.json(
        { error: 'Message trop long (max 5000 caractères)' },
        { status: 400 }
      );
    }

    // Handle request for human agent
    if (action === 'request_agent') {
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          status: 'waiting_agent',
          agent_requested_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Add system message about agent request
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_type: 'bot',
        content: "Votre demande d'assistance a ete transmise a notre equipe. Un agent vous repondra dans les plus brefs delais. Temps de reponse moyen: moins de 2 heures pendant les horaires d'ouverture (Lun-Ven 8h-18h).",
        metadata: { type: 'agent_request' },
      });

      // Get user profile for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();

      // Create admin notification for agent request
      await supabase.from('admin_notifications').insert({
        type: 'agent_request',
        title: 'Demande d\'agent - Chat',
        message: `${profile?.full_name || 'Un client'} demande à parler à un agent Driveby.`,
        priority: 'high',
        action_url: '/admin/messages',
        action_label: 'Voir les messages',
        icon: 'message-circle',
        related_entity_type: 'chat_conversation',
        related_entity_id: conversationId,
        data: {
          user_id: user.id,
          user_name: profile?.full_name || 'Client',
          user_phone: profile?.phone || null,
          conversation_id: conversationId,
        },
      });

      return NextResponse.json({ success: true, status: 'waiting_agent' });
    }

    let currentConversationId = conversationId;

    // Create new conversation if needed
    if (!currentConversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          status: 'active',
        })
        .select()
        .single();

      if (convError) throw convError;
      currentConversationId = newConversation.id;

      // Add welcome message from bot
      await supabase.from('chat_messages').insert({
        conversation_id: currentConversationId,
        sender_type: 'bot',
        content: "Bonjour! Je suis l'assistant virtuel de Driveby Africa. Je peux vous aider avec des questions sur nos vehicules, le processus d'importation, les prix et les delais de livraison. Comment puis-je vous aider?",
        metadata: { type: 'welcome' },
      });
    }

    // Insert user message
    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: currentConversationId,
        user_id: user.id,
        sender_type: 'user',
        content,
      })
      .select()
      .single();

    if (msgError) throw msgError;

    return NextResponse.json({
      message,
      conversationId: currentConversationId,
    });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    );
  }
}
