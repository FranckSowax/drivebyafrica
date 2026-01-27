'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Loader2,
  UserPlus,
  Clock,
  Sparkles,
  HelpCircle,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/Toast';
import { authFetch } from '@/lib/supabase/auth-helpers';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'bot' | 'agent';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const QUICK_QUESTIONS = [
  "Comment obtenir un devis?",
  "Quels sont les delais de livraison?",
  "Quels modes de paiement acceptez-vous?",
  "Comment fonctionne l'inspection?",
];

// Render message content with clickable links
function renderMessageContent(content: string): React.ReactNode {
  // Parse markdown links: [text](/path) or [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const linkText = match[1];
    const linkUrl = match[2];

    // Check if it's an internal link (starts with /)
    if (linkUrl.startsWith('/')) {
      parts.push(
        <Link
          key={match.index}
          href={linkUrl}
          className="text-mandarin hover:underline font-medium"
        >
          {linkText}
        </Link>
      );
    } else {
      // External link
      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-mandarin hover:underline font-medium"
        >
          {linkText}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last link
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  // If no links found, return original content
  if (parts.length === 0) {
    return content;
  }

  return <>{parts}</>;
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const toast = useToast();
  const searchParams = useSearchParams();
  const { currency, currencyInfo } = useCurrency();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<string>('active');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [vehicleContext, setVehicleContext] = useState<{
    id: string;
    make: string;
    model: string;
    year: string;
  } | null>(null);
  const [hasAutoSentVehicleQuestion, setHasAutoSentVehicleQuestion] = useState(false);

  // Check for vehicle context from URL params
  useEffect(() => {
    const vehicleId = searchParams.get('vehicle');
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const year = searchParams.get('year');

    if (vehicleId && make && model && year) {
      setVehicleContext({ id: vehicleId, make, model, year });
    }
  }, [searchParams]);

  // Load existing conversation or create new one
  useEffect(() => {
    loadConversation();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const response = await authFetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        const conversations = data.conversations || [];

        if (conversations.length > 0) {
          // Use the most recent conversation
          const latestConversation = conversations[0];
          setConversationId(latestConversation.id);
          setConversationStatus(latestConversation.status);

          // Load messages for this conversation
          const messagesResponse = await fetch(
            `/api/chat?conversationId=${latestConversation.id}`
          );
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            setMessages(messagesData.messages || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    setInputMessage('');

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || '',
      sender_type: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Send user message
      const response = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Update conversation ID if new
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempUserMessage.id ? data.message : msg
        )
      );

      // Show typing indicator
      setIsTyping(true);

      // Get AI response with currency context
      const aiResponse = await authFetch('/api/chat/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: data.conversationId,
          userMessage: content,
          currency: currency,
          exchangeRate: currencyInfo?.rateToUsd || 1,
        }),
      });

      setIsTyping(false);

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        setMessages((prev) => [...prev, aiData.message]);
      } else {
        // Add fallback message on error
        const errorData = await aiResponse.json();
        if (errorData.fallbackMessage) {
          const fallbackMessage: Message = {
            id: `fallback-${Date.now()}`,
            conversation_id: data.conversationId,
            sender_type: 'bot',
            content: errorData.fallbackMessage,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, fallbackMessage]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur', "Impossible d'envoyer le message");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));
      setInputMessage(content);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const requestHumanAgent = async () => {
    if (!conversationId) {
      toast.error('Erreur', 'Aucune conversation active');
      return;
    }

    try {
      const response = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'request_agent',
        }),
      });

      if (response.ok) {
        setConversationStatus('waiting_agent');
        toast.success('Demande envoyee', 'Un agent vous repondra bientot');

        // Reload messages to get the system message
        const messagesResponse = await fetch(
          `/api/chat?conversationId=${conversationId}`
        );
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData.messages || []);
        }
      }
    } catch (error) {
      console.error('Error requesting agent:', error);
      toast.error('Erreur', "Impossible d'envoyer la demande");
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-mandarin/10 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-mandarin" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              Assistant Driveby
            </h1>
            <div className="flex items-center gap-2 text-xs">
              {conversationStatus === 'waiting_agent' ? (
                <>
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span className="text-yellow-500">En attente d'un agent</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[var(--text-muted)]">En ligne</span>
                </>
              )}
            </div>
          </div>
        </div>
        {conversationStatus !== 'waiting_agent' && (
          <button
            onClick={requestHumanAgent}
            disabled={!conversationId}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-royal-blue/10 border border-royal-blue/20 rounded-lg text-royal-blue text-xs hover:bg-royal-blue/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Parler à un agent</span>
          </button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          // Welcome state
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-mandarin/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-mandarin" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Bienvenue sur l'assistant Driveby!
            </h2>
            <p className="text-[var(--text-muted)] mb-6 max-w-md">
              Je peux repondre a vos questions sur nos vehicules, le processus d'achat,
              les prix et les delais de livraison.
            </p>

            {/* Vehicle Context Banner */}
            {vehicleContext && (
              <div className="w-full max-w-md mb-6 p-4 bg-royal-blue/10 border border-royal-blue/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-royal-blue/20 rounded-lg">
                    <Car className="w-5 h-5 text-royal-blue" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Question sur: {vehicleContext.make} {vehicleContext.model} {vehicleContext.year}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Posez votre question ci-dessous
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {vehicleContext ? (
                // Vehicle-specific quick questions
                <>
                  <button
                    onClick={() => handleQuickQuestion(`Bonjour, j'aimerais avoir plus d'informations sur le ${vehicleContext.make} ${vehicleContext.model} ${vehicleContext.year}.`)}
                    className="p-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-sm text-[var(--text-primary)] hover:border-mandarin hover:bg-mandarin/5 transition-colors text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-mandarin inline mr-2" />
                    Plus d'informations
                  </button>
                  <button
                    onClick={() => handleQuickQuestion(`Quel est le délai de livraison pour le ${vehicleContext.make} ${vehicleContext.model}?`)}
                    className="p-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-sm text-[var(--text-primary)] hover:border-mandarin hover:bg-mandarin/5 transition-colors text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-mandarin inline mr-2" />
                    Délai de livraison
                  </button>
                  <button
                    onClick={() => handleQuickQuestion(`Ce ${vehicleContext.make} ${vehicleContext.model} est-il en bon état? Avez-vous un rapport d'inspection?`)}
                    className="p-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-sm text-[var(--text-primary)] hover:border-mandarin hover:bg-mandarin/5 transition-colors text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-mandarin inline mr-2" />
                    État du véhicule
                  </button>
                  <button
                    onClick={() => handleQuickQuestion(`Quels sont les frais totaux pour importer le ${vehicleContext.make} ${vehicleContext.model} au Gabon?`)}
                    className="p-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-sm text-[var(--text-primary)] hover:border-mandarin hover:bg-mandarin/5 transition-colors text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-mandarin inline mr-2" />
                    Coût total d'importation
                  </button>
                </>
              ) : (
                // Generic quick questions
                QUICK_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="p-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-sm text-[var(--text-primary)] hover:border-mandarin hover:bg-mandarin/5 transition-colors text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-mandarin inline mr-2" />
                    {question}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          // Messages list
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex gap-3',
                  message.sender_type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.sender_type !== 'user' && (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      message.sender_type === 'agent'
                        ? 'bg-green-100'
                        : 'bg-mandarin/10'
                    )}
                  >
                    {message.sender_type === 'agent' ? (
                      <User className="w-4 h-4 text-green-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-mandarin" />
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    message.sender_type === 'user'
                      ? 'bg-mandarin text-white rounded-br-md'
                      : 'bg-[var(--surface)] text-[var(--text-primary)] rounded-bl-md border border-[var(--card-border)]'
                  )}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.sender_type === 'user'
                      ? message.content
                      : renderMessageContent(message.content)}
                  </div>
                  <p
                    className={cn(
                      'text-[10px] mt-1',
                      message.sender_type === 'user'
                        ? 'text-white/70'
                        : 'text-[var(--text-muted)]'
                    )}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>

                {message.sender_type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-royal-blue/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-royal-blue" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-mandarin/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-mandarin" />
            </div>
            <div className="bg-[var(--surface)] border border-[var(--card-border)] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>


      {/* Waiting Agent Banner */}
      {conversationStatus === 'waiting_agent' && (
        <div className="py-2">
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
            <Clock className="w-4 h-4" />
            <span>Un agent va vous repondre sous peu. Temps moyen: moins de 2h.</span>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="pt-4 border-t border-[var(--card-border)]">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ecrivez votre message..."
              rows={1}
              className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-mandarin focus:outline-none resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!inputMessage.trim() || isSending}
            className="h-12 w-12 p-0"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
          Appuyez sur Entree pour envoyer • Shift+Entree pour un saut de ligne
        </p>
      </form>
    </div>
  );
}
