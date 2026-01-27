'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  User,
  Clock,
  RefreshCw,
  Loader2,
  Bot,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageCircle,
  Phone,
  ChevronLeft,
  Bell,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { authFetch } from '@/lib/supabase/auth-helpers';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'bot' | 'agent';
  content: string;
  metadata?: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  user_id: string;
  status: 'active' | 'closed' | 'waiting_agent';
  created_at: string;
  last_message_at: string;
  agent_requested_at: string | null;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp: string;
  customer_country: string;
  customer_avatar: string;
  unread_count: number;
  last_message: {
    content: string;
    sender_type: string;
    created_at: string;
  } | null;
}

interface Stats {
  total: number;
  active: number;
  waiting_agent: number;
  closed: number;
  unread_total: number;
}

// Country flag mapping
const countryFlags: Record<string, string> = {
  'Gabon': '🇬🇦',
  'Cameroun': '🇨🇲',
  'Congo': '🇨🇬',
  'RDC': '🇨🇩',
  "Côte d'Ivoire": '🇨🇮',
  'Sénégal': '🇸🇳',
  'Mali': '🇲🇱',
  'Burkina Faso': '🇧🇫',
  'Bénin': '🇧🇯',
  'Togo': '🇹🇬',
  'Niger': '🇳🇪',
  'Guinée': '🇬🇳',
  'Tchad': '🇹🇩',
  'Centrafrique': '🇨🇫',
};

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await authFetch(`/api/admin/messages?${params.toString()}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setConversations(data.conversations || []);
      setStats(data.stats || null);
    } catch (err) {
      setError('Erreur lors du chargement des conversations');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await authFetch(`/api/admin/messages?conversationId=${conversationId}`);
      if (!response.ok) throw new Error('Erreur lors du chargement des messages');

      const data = await response.json();
      setMessages(data.messages || []);

      // Update unread count locally
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConversation) {
        fetchMessages(selectedConversation.id);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchConversations, fetchMessages, selectedConversation]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    const messageContent = newMessage;
    setNewMessage('');

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_type: 'agent',
      content: messageContent,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await authFetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: messageContent,
        }),
      });

      if (!response.ok) throw new Error('Erreur');

      const data = await response.json();
      setMessages(prev =>
        prev.map(m => (m.id === tempMessage.id ? data.message : m))
      );

      // Update last message in conversation list
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? {
                ...c,
                last_message: {
                  content: messageContent,
                  sender_type: 'agent',
                  created_at: new Date().toISOString(),
                },
                status: 'active',
              }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const closeConversation = async () => {
    if (!selectedConversation) return;

    try {
      const response = await authFetch('/api/admin/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          status: 'closed',
        }),
      });

      if (response.ok) {
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation.id ? { ...c, status: 'closed' } : c
          )
        );
        setSelectedConversation(prev =>
          prev ? { ...prev, status: 'closed' } : null
        );
        // Reload messages to show system message
        fetchMessages(selectedConversation.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, 'HH:mm', { locale: fr });
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } else {
      return format(date, 'dd/MM/yyyy', { locale: fr });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'waiting_agent':
        return 'bg-orange-100 text-orange-700 ring-2 ring-orange-400 ring-offset-1';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'waiting_agent':
        return 'En attente';
      case 'closed':
        return 'Fermé';
      default:
        return status;
    }
  };

  const getFlag = (country: string) => {
    return countryFlags[country] || '🌍';
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.customer_phone?.includes(searchQuery)
  );

  // Sort: waiting_agent first, then by last_message_at
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.status === 'waiting_agent' && b.status !== 'waiting_agent') return -1;
    if (b.status === 'waiting_agent' && a.status !== 'waiting_agent') return 1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-mandarin/10 rounded-xl">
            <MessageSquare className="w-6 h-6 text-mandarin" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
            <p className="text-[var(--text-muted)]">
              {stats?.unread_total || 0} message{(stats?.unread_total || 0) > 1 ? 's' : ''} non lu{(stats?.unread_total || 0) > 1 ? 's' : ''}
              {stats?.waiting_agent ? ` • ${stats.waiting_agent} en attente` : ''}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={fetchConversations}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                <p className="text-xs text-[var(--text-muted)]">Total conversations</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.waiting_agent}</p>
                <p className="text-xs text-[var(--text-muted)]">En attente d&apos;agent</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.active}</p>
                <p className="text-xs text-[var(--text-muted)]">Actives</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.closed}</p>
                <p className="text-xs text-[var(--text-muted)]">Fermées</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Agent Request Alert Banner */}
      {stats && stats.waiting_agent > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-300 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-200 rounded-full">
              <Bell className="w-5 h-5 text-orange-700" />
            </div>
            <div>
              <p className="font-semibold text-orange-800">
                {stats.waiting_agent} client{stats.waiting_agent > 1 ? 's' : ''} attend{stats.waiting_agent > 1 ? 'ent' : ''} un agent
              </p>
              <p className="text-sm text-orange-600">
                Cliquez sur une conversation orange pour répondre
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setStatusFilter('waiting_agent')}
            className="bg-orange-500 hover:bg-orange-600"
          >
            Voir les demandes
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-14rem)]">
        {/* Conversations List */}
        <Card className={`lg:col-span-1 p-0 overflow-hidden flex flex-col ${selectedConversation ? 'hidden lg:flex' : ''}`}>
          {/* Search & Filter */}
          <div className="p-4 border-b border-[var(--card-border)] space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'waiting_agent', 'active', 'closed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-mandarin text-white'
                      : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-mandarin/10'
                  }`}
                >
                  {status === 'all' ? 'Tous' : getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {sortedConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-muted)]">Aucune conversation</p>
              </div>
            ) : (
              sortedConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)] transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-[var(--surface)]' : ''
                  } ${conv.status === 'waiting_agent' ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[var(--surface)] rounded-full flex items-center justify-center flex-shrink-0 border border-[var(--card-border)]">
                      <span className="text-lg">{getFlag(conv.customer_country)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[var(--text-primary)] truncate">{conv.customer_name}</p>
                        <div className="flex items-center gap-2">
                          {conv.unread_count > 0 && (
                            <span className="w-5 h-5 bg-mandarin text-white text-xs font-medium rounded-full flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getStatusColor(conv.status)}`}>
                            {getStatusLabel(conv.status)}
                          </span>
                        </div>
                      </div>
                      {conv.last_message && (
                        <p className="text-sm text-[var(--text-muted)] truncate mt-0.5">
                          {conv.last_message.sender_type === 'agent' && '✓ '}
                          {conv.last_message.content}
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className={`lg:col-span-2 p-0 overflow-hidden flex flex-col ${!selectedConversation ? 'hidden lg:flex' : ''}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden p-2 hover:bg-[var(--surface)] rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-[var(--surface)] rounded-full flex items-center justify-center border border-[var(--card-border)]">
                    <span className="text-lg">{getFlag(selectedConversation.customer_country)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{selectedConversation.customer_name}</p>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className={`px-2 py-0.5 rounded ${getStatusColor(selectedConversation.status)}`}>
                        {getStatusLabel(selectedConversation.status)}
                      </span>
                      {selectedConversation.customer_phone && (
                        <span>{selectedConversation.customer_phone}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConversation.customer_whatsapp && (
                    <a
                      href={`https://wa.me/${selectedConversation.customer_whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {selectedConversation.status !== 'closed' && (
                    <Button variant="outline" size="sm" onClick={closeConversation}>
                      Fermer
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-mandarin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                    Aucun message dans cette conversation
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.sender_type !== 'agent' && (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.sender_type === 'bot' ? 'bg-mandarin/10' : 'bg-blue-100'
                          }`}
                        >
                          {msg.sender_type === 'bot' ? (
                            <Bot className="w-4 h-4 text-mandarin" />
                          ) : (
                            <User className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          msg.sender_type === 'agent'
                            ? 'bg-mandarin text-white rounded-br-md'
                            : msg.sender_type === 'bot'
                            ? 'bg-gray-100 text-[var(--text-primary)] rounded-bl-md'
                            : 'bg-[var(--surface)] text-[var(--text-primary)] rounded-bl-md border border-[var(--card-border)]'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.sender_type === 'agent' ? 'text-white/70' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                      {msg.sender_type === 'agent' && (
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {selectedConversation.status !== 'closed' ? (
                <div className="p-4 border-t border-[var(--card-border)]">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Écrire un message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="flex-1 px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="px-4"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-[var(--card-border)] bg-gray-50">
                  <p className="text-center text-sm text-[var(--text-muted)]">
                    Cette conversation est fermée
                  </p>
                </div>
              )}
            </>
          ) : (
            // No conversation selected
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-mandarin/10 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-mandarin" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Sélectionnez une conversation
              </h2>
              <p className="text-[var(--text-muted)] max-w-md">
                Choisissez une conversation dans la liste pour voir les messages et répondre aux clients.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
