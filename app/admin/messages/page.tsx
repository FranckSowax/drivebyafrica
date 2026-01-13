'use client';

import { useState } from 'react';
import { MessageSquare, Search, Send, User, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Mock data for messages
const mockConversations = [
  {
    id: '1',
    customer: 'Jean Mbarga',
    flag: '🇬🇦',
    lastMessage: 'Bonjour, je voudrais savoir si le Toyota Land Cruiser est toujours disponible?',
    timestamp: 'Il y a 5 min',
    unread: 2,
    status: 'active',
  },
  {
    id: '2',
    customer: 'Marie Nguema',
    flag: '🇨🇲',
    lastMessage: 'Merci pour les informations, je vais réfléchir.',
    timestamp: 'Il y a 2h',
    unread: 0,
    status: 'resolved',
  },
  {
    id: '3',
    customer: 'Paul Essono',
    flag: '🇨🇬',
    lastMessage: 'Quand est-ce que ma commande sera expédiée?',
    timestamp: 'Il y a 4h',
    unread: 1,
    status: 'active',
  },
  {
    id: '4',
    customer: 'Sophie Mba',
    flag: '🇨🇮',
    lastMessage: 'D\'accord, je vous envoie les documents demain.',
    timestamp: 'Hier',
    unread: 0,
    status: 'pending',
  },
];

const mockMessages = [
  {
    id: '1',
    sender: 'customer',
    text: 'Bonjour, je voudrais savoir si le Toyota Land Cruiser 2023 est toujours disponible?',
    timestamp: '10:30',
  },
  {
    id: '2',
    sender: 'admin',
    text: 'Bonjour Jean! Oui, le véhicule est toujours disponible. Souhaitez-vous plus d\'informations?',
    timestamp: '10:35',
  },
  {
    id: '3',
    sender: 'customer',
    text: 'Oui, j\'aimerais connaître le prix total livré à Libreville.',
    timestamp: '10:40',
  },
];

export default function AdminMessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const filteredConversations = mockConversations.filter((conv) =>
    conv.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-mandarin/10 rounded-xl">
          <MessageSquare className="w-6 h-6 text-mandarin" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
          <p className="text-[var(--text-muted)]">{mockConversations.filter((c) => c.unread > 0).length} conversations non lues</p>
        </div>
      </div>

      {/* Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-6rem)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1 p-0 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-[var(--card-border)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 text-left border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)] transition-colors ${
                  selectedConversation.id === conv.id ? 'bg-[var(--surface)]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[var(--surface)] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{conv.flag}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[var(--text-primary)] truncate">{conv.customer}</p>
                      {conv.unread > 0 && (
                        <span className="ml-2 w-5 h-5 bg-mandarin text-white text-xs font-medium rounded-full flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-muted)] truncate mt-0.5">{conv.lastMessage}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{conv.timestamp}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-[var(--card-border)] flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--surface)] rounded-full flex items-center justify-center">
              <span className="text-lg">{selectedConversation.flag}</span>
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">{selectedConversation.customer}</p>
              <p className="text-xs text-[var(--text-muted)]">En ligne</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mockMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    msg.sender === 'admin'
                      ? 'bg-mandarin text-white rounded-br-md'
                      : 'bg-[var(--surface)] text-[var(--text-primary)] rounded-bl-md'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'admin' ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-[var(--card-border)]">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Écrire un message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
              />
              <Button className="px-4">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
