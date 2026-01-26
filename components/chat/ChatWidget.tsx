'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  UserPlus,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'bot' | 'agent';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface Conversation {
  id: string;
  status: 'active' | 'closed' | 'waiting_agent';
  agent_requested_at: string | null;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRequestingAgent, setIsRequestingAgent] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Fetch conversations and messages
  const fetchConversation = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat');
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      const conversations = data.conversations || [];

      if (conversations.length > 0) {
        // Get the most recent active conversation
        const activeConv = conversations.find((c: Conversation) => c.status !== 'closed') || conversations[0];
        setConversation(activeConv);

        // Fetch messages for this conversation
        const messagesResponse = await fetch(`/api/chat?conversationId=${activeConv.id}`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData.messages || []);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchConversation();
    }
  }, [isOpen, isAuthenticated, fetchConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          // Increment unread if chat is minimized or closed and message is from bot/agent
          if ((isMinimized || !isOpen) && newMessage.sender_type !== 'user') {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('Chat realtime subscription error:', err.message);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, isOpen, isMinimized, supabase]);

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation?.id || '',
      sender_type: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      // Send user message
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation?.id,
          content: messageContent,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Update conversation ID if new
      if (!conversation?.id && data.conversationId) {
        setConversation({
          id: data.conversationId,
          status: 'active',
          agent_requested_at: null,
        });
      }

      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? data.message : m))
      );

      // Call AI endpoint to get bot response
      const aiResponse = await fetch('/api/chat/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: data.conversationId || conversation?.id,
          userMessage: messageContent,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        if (aiData.message) {
          setMessages((prev) => [...prev, aiData.message]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setInputValue(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  // Request human agent
  const requestAgent = async () => {
    if (!conversation?.id || isRequestingAgent) return;

    setIsRequestingAgent(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          action: 'request_agent',
        }),
      });

      if (!response.ok) throw new Error('Failed to request agent');

      setConversation((prev) =>
        prev ? { ...prev, status: 'waiting_agent', agent_requested_at: new Date().toISOString() } : null
      );

      // Refetch messages to get the system message
      const messagesResponse = await fetch(`/api/chat?conversationId=${conversation.id}`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
      }
    } catch (error) {
      console.error('Error requesting agent:', error);
    } finally {
      setIsRequestingAgent(false);
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
      setUnreadCount(0);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      setUnreadCount(0);
    }
  };

  // Don't render for unauthenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-mandarin text-white rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Ouvrir le chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : '500px',
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-mandarin to-orange-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Driveby Africa</h3>
                  <p className="text-white/80 text-xs">
                    {conversation?.status === 'waiting_agent'
                      ? 'En attente d\'un agent'
                      : 'Assistant virtuel'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMinimize}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label={isMinimized ? 'Agrandir' : 'Réduire'}
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-mandarin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-mandarin/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="w-8 h-8 text-mandarin" />
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Bienvenue sur Driveby Africa!
                      </h4>
                      <p className="text-gray-500 text-sm">
                        Comment puis-je vous aider?
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${
                          msg.sender_type === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.sender_type !== 'user' && (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              msg.sender_type === 'agent'
                                ? 'bg-green-100'
                                : 'bg-mandarin/10'
                            }`}
                          >
                            {msg.sender_type === 'agent' ? (
                              <User className="w-4 h-4 text-green-600" />
                            ) : (
                              <Bot className="w-4 h-4 text-mandarin" />
                            )}
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                            msg.sender_type === 'user'
                              ? 'bg-mandarin text-white rounded-br-md'
                              : msg.sender_type === 'agent'
                              ? 'bg-green-100 text-gray-800 rounded-bl-md'
                              : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              msg.sender_type === 'user'
                                ? 'text-white/70'
                                : 'text-gray-400'
                            }`}
                          >
                            {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Request Agent Button */}
                {conversation && conversation.status !== 'waiting_agent' && conversation.status !== 'closed' && (
                  <div className="px-4 py-2 border-t border-gray-100 bg-white">
                    <button
                      onClick={requestAgent}
                      disabled={isRequestingAgent}
                      className="w-full py-2 px-4 text-sm text-royal-blue hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isRequestingAgent ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      Parler à un agent Driveby
                    </button>
                  </div>
                )}

                {/* Waiting Agent Notice */}
                {conversation?.status === 'waiting_agent' && (
                  <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-100">
                    <p className="text-xs text-yellow-700 text-center">
                      Un agent va vous répondre très bientôt. Temps de réponse moyen: moins de 2 heures.
                    </p>
                  </div>
                )}

                {/* Input Area */}
                {conversation?.status !== 'closed' && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Écrivez votre message..."
                        className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:border-mandarin focus:outline-none focus:ring-2 focus:ring-mandarin/20"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!inputValue.trim() || isSending}
                        size="sm"
                        className="rounded-xl px-3"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
