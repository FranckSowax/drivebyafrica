import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, content, action } = body;

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
