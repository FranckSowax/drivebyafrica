'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Plus, Search, Edit2, Trash2, Loader2, Eye, EyeOff,
  Database, Sparkles, X, Save, Upload, MessageSquare, Bot,
  Send, User, Brain, MessageCircle, FileText, Calendar,
  CheckCircle, AlertCircle, BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// --- Types ---

interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  language: string;
  source: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  document_title: string;
  category: string;
}

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  vehicles?: number;
}

interface Conversation {
  id: string;
  phone: string;
  user_id: string | null;
  status: string;
  context: Record<string, unknown>;
  last_message_at: string;
  created_at: string;
  user_name?: string;
}

// --- Constants ---

const TABS = [
  { id: 'chatbot', label: 'Chatbot RAG', icon: Bot },
  { id: 'knowledge', label: 'Base de connaissance', icon: BookOpen },
  { id: 'conversations', label: 'Conversations', icon: MessageCircle },
  { id: 'rapports', label: 'Rapports', icon: BarChart3 },
] as const;

type TabId = typeof TABS[number]['id'];

const CATEGORIES = [
  { value: 'faq', label: 'FAQ', color: 'bg-blue-100 text-blue-800' },
  { value: 'process', label: 'Processus', color: 'bg-green-100 text-green-800' },
  { value: 'pricing', label: 'Tarification', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'policy', label: 'Politique', color: 'bg-purple-100 text-purple-800' },
  { value: 'vehicle_info', label: 'Véhicules', color: 'bg-orange-100 text-orange-800' },
  { value: 'shipping', label: 'Expédition', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'general', label: 'Général', color: 'bg-gray-100 text-gray-800' },
];

function getCategoryStyle(category: string) {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
}

// ─── Main Page ───────────────────────────────────────────

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<TabId>('chatbot');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Brain className="h-7 w-7 text-mandarin" />
          Chatbot RAG & Base de connaissance
        </h1>
        <p className="text-[var(--text-muted)] mt-1">Testez le chatbot, gérez la base de connaissance et suivez les conversations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--card-border)]">
        <div className="flex gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-mandarin text-mandarin'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--card-border)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'chatbot' && <ChatbotTestTab />}
      {activeTab === 'knowledge' && <KnowledgeBaseTab />}
      {activeTab === 'conversations' && <ConversationsTab />}
      {activeTab === 'rapports' && <RapportsTab />}
    </div>
  );
}

// ─── Tab 1: Chatbot Test ─────────────────────────────────

function ChatbotTestTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', content: 'Bonjour ! Je suis Jason, votre assistant Driveby Africa. Testez-moi en posant une question sur les véhicules, les prix ou l\'importation.', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [testPhone] = useState('test_admin');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput('');

    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setSending(true);

    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_chatbot', message: userMessage, phone: testPhone }),
      });
      const data = await res.json();

      if (res.ok && data.response) {
        setMessages(prev => [...prev, {
          role: 'bot',
          content: data.response,
          timestamp: new Date(),
          vehicles: data.vehicles_found || 0,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'bot',
          content: data.error || 'Erreur lors du test du chatbot.',
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: 'Erreur de connexion au serveur.',
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chat area */}
      <Card className="lg:col-span-2 flex flex-col overflow-hidden h-[600px]">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-mandarin/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-mandarin" />
          </div>
          <div>
            <p className="font-medium text-sm text-[var(--text-primary)]">Jason - Assistant Driveby Africa</p>
            <p className="text-xs text-[var(--text-muted)]">GPT-4.1 + RAG | Mode test admin</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--surface)]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-mandarin text-white rounded-br-md'
                  : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-bl-md'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[10px] ${msg.role === 'user' ? 'text-orange-200' : 'text-[var(--text-muted)]'}`}>
                    {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.vehicles !== undefined && msg.vehicles > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      {msg.vehicles} véhicule{msg.vehicles > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-mandarin/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-mandarin/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-mandarin/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[var(--card-border)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Tapez un message pour tester le chatbot..."
              className="flex-1 px-4 py-2.5 border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] rounded-full text-sm focus:ring-2 focus:ring-mandarin focus:border-transparent"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="p-2.5 bg-mandarin text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Side panel - Quick tests */}
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-medium text-sm text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-mandarin" />
            Tests rapides
          </h3>
          <div className="space-y-2">
            {[
              'Je cherche un Jetour à moins de 15 millions',
              'Quels Toyota avez-vous en stock ?',
              'Comment fonctionne l\'importation ?',
              'Je veux un SUV BYD pour le Gabon',
              'Quels sont vos délais de livraison ?',
              'Hyundai Tucson prix',
              'Je veux parler à un agent',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => { setInput(q); }}
                className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] bg-[var(--surface)] rounded-lg hover:bg-mandarin/10 hover:text-mandarin transition-colors border border-[var(--card-border)]"
              >
                {q}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-sm text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-royal-blue" />
            Info système
          </h3>
          <div className="space-y-2 text-xs text-[var(--text-muted)]">
            {[
              ['Modèle IA', 'GPT-4.1'],
              ['Embeddings', 'text-embedding-3-small'],
              ['Seuil RAG', '0.7'],
              ['Top K', '5'],
              ['Timeout contexte', '5s'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span>{label}</span>
                <span className="font-mono text-[var(--text-primary)]">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 2: Knowledge Base ───────────────────────────────

function KnowledgeBaseTab() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [editingDoc, setEditingDoc] = useState<Partial<KnowledgeDocument> | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      const res = await fetch(`/api/admin/knowledge?${params}`);
      const data = await res.json();
      setDocuments(data.documents || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleSave = async () => {
    if (!editingDoc?.title || !editingDoc?.content || !editingDoc?.category) return;
    setSaving(true);
    try {
      const isNew = !editingDoc.id;
      const res = await fetch('/api/admin/knowledge', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDoc),
      });
      if (res.ok) { setEditingDoc(null); fetchDocuments(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch { alert('Erreur de connexion'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document et ses embeddings ?')) return;
    try {
      const res = await fetch(`/api/admin/knowledge?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchDocuments();
    } catch (err) { console.error('Delete error:', err); }
  };

  const handleToggleActive = async (doc: KnowledgeDocument) => {
    try {
      await fetch('/api/admin/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, is_active: !doc.is_active }),
      });
      fetchDocuments();
    } catch (err) { console.error('Toggle error:', err); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: searchQuery }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) { console.error('Search error:', err); }
    finally { setSearching(false); }
  };

  const handleSeed = async () => {
    if (!confirm('Initialiser la base de connaissance avec les documents de base ?')) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const data = await res.json();
      if (res.ok) { alert(data.message || 'Base initialisée'); fetchDocuments(); }
      else { alert(data.error || 'Erreur'); }
    } catch { alert('Erreur de connexion'); }
    finally { setSeeding(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const category = prompt('Catégorie (faq, process, pricing, policy, vehicle_info, shipping, general)', 'general');
    if (!category) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      const res = await fetch('/api/admin/knowledge/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) { alert(data.message || 'Importé'); fetchDocuments(); }
      else { alert(data.error || 'Erreur'); }
    } catch { alert('Erreur de connexion'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const totalDocs = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">{totalDocs} document{totalDocs !== 1 ? 's' : ''} dans la base RAG</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}
            leftIcon={seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}>
            Initialiser
          </Button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg hover:bg-[var(--surface)] cursor-pointer text-[var(--text-primary)]">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importer
            <input type="file" accept=".txt,.md,.csv,.json" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
          <Button size="sm" onClick={() => setEditingDoc({ category: 'general', language: 'fr' })}
            leftIcon={<Plus className="h-4 w-4" />}>
            Ajouter
          </Button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${filterCategory === '' ? 'bg-mandarin text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'}`}>
          Tous ({totalDocs})
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.value} onClick={() => setFilterCategory(filterCategory === cat.value ? '' : cat.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${filterCategory === cat.value ? 'bg-mandarin text-white' : `${cat.color} hover:opacity-80`}`}>
            {cat.label} ({stats[cat.value] || 0})
          </button>
        ))}
      </div>

      {/* Semantic search */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Recherche sémantique dans la base..."
              className="w-full pl-10 pr-4 py-2 border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-mandarin focus:border-transparent" />
          </div>
          <Button size="sm" onClick={handleSearch} disabled={searching || !searchQuery.trim()}
            leftIcon={searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>
            Rechercher
          </Button>
          {searchResults && (
            <button onClick={() => setSearchResults(null)} className="flex items-center px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchResults && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">{searchResults.length} résultat{searchResults.length !== 1 ? 's' : ''}</h3>
            {searchResults.map(r => (
              <div key={r.id} className="p-3 bg-mandarin/5 rounded-lg border border-mandarin/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{r.document_title}</span>
                  <span className="text-xs bg-mandarin/10 text-mandarin px-2 py-0.5 rounded-full font-medium">{(r.similarity * 100).toFixed(1)}%</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{r.content}</p>
              </div>
            ))}
            {searchResults.length === 0 && <p className="text-sm text-[var(--text-muted)]">Aucun résultat.</p>}
          </div>
        )}
      </Card>

      {/* Editor modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{editingDoc.id ? 'Modifier le document' : 'Nouveau document'}</h2>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Titre</label>
                <input type="text" value={editingDoc.title || ''}
                  onChange={e => setEditingDoc(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-mandarin" placeholder="Titre du document" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Catégorie</label>
                <select value={editingDoc.category || 'general'}
                  onChange={e => setEditingDoc(prev => prev ? { ...prev, category: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] rounded-lg text-sm focus:ring-2 focus:ring-mandarin">
                  {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Contenu</label>
                <textarea value={editingDoc.content || ''}
                  onChange={e => setEditingDoc(prev => prev ? { ...prev, content: e.target.value } : null)}
                  rows={15} className="w-full px-3 py-2 border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] rounded-lg text-sm font-mono focus:ring-2 focus:ring-mandarin"
                  placeholder="Contenu du document..." />
                {editingDoc.content && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{editingDoc.content.length} car. ~{Math.ceil(editingDoc.content.length / 2000)} chunks</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditingDoc(null)}>Annuler</Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !editingDoc.title || !editingDoc.content}
                  leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>
                  {editingDoc.id ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-mandarin" /></div>
      ) : documents.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpen className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
          <p className="text-[var(--text-muted)]">Aucun document</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Cliquez sur &quot;Initialiser&quot; pour charger les documents de base</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const catStyle = getCategoryStyle(doc.category);
            return (
              <Card key={doc.id} className={`p-4 ${!doc.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-[var(--text-primary)] truncate">{doc.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catStyle.color}`}>{catStyle.label}</span>
                      {!doc.is_active && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">Inactif</span>}
                    </div>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2">{doc.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                      <span>Source: {doc.source}</span>
                      <span>{doc.content.length} car.</span>
                      <span>Mis à jour: {new Date(doc.updated_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button onClick={() => handleToggleActive(doc)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface)]"
                      title={doc.is_active ? 'Désactiver' : 'Activer'}>
                      {doc.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setEditingDoc(doc)} className="p-2 text-[var(--text-muted)] hover:text-mandarin rounded-lg hover:bg-mandarin/10" title="Modifier">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(doc.id)} className="p-2 text-[var(--text-muted)] hover:text-red-600 rounded-lg hover:bg-red-50" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Conversations ────────────────────────────────

function ConversationsTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ sender_type: string; content: string; created_at: string }>>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const selectedConvData = conversations.find(c => c.id === selectedConv);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConv || sendingReply) return;
    const text = replyText.trim();
    setReplyText('');
    setSendingReply(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_reply', conversation_id: selectedConv, message: text }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(prev => [...prev, {
          sender_type: 'agent',
          content: text,
          created_at: new Date().toISOString(),
        }]);
      } else {
        alert(data.error || 'Échec envoi');
        setReplyText(text);
      }
    } catch {
      alert('Erreur de connexion');
      setReplyText(text);
    } finally {
      setSendingReply(false);
    }
  };

  const updateConvStatus = async (convId: string, newStatus: string) => {
    try {
      await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_conv_status', conversation_id: convId, status: newStatus }),
      });
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_conversations', status: statusFilter }),
      });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Fetch conversations error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Client-side search filter
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (conv.user_name || '').toLowerCase();
    const phone = (conv.phone || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  const loadMessages = async (conversationId: string) => {
    setSelectedConv(conversationId);
    setLoadingMessages(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'conversation_messages', conversation_id: conversationId }),
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    escalated: 'bg-red-100 text-red-700',
    closed: 'bg-[var(--surface)] text-[var(--text-muted)]',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: '600px' }}>
      {/* Conversations list */}
      <Card className="flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--card-border)]">
          <h3 className="font-medium text-sm text-[var(--text-primary)]">Conversations WhatsApp</h3>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher par nom, numéro, mot-clé..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-mandarin"
            />
          </div>
          <div className="flex gap-1 mt-2">
            {['', 'active', 'escalated', 'closed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-[10px] rounded-full font-medium ${statusFilter === s ? 'bg-mandarin text-white' : 'bg-[var(--surface)] text-[var(--text-muted)]'}`}>
                {s || 'Toutes'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-mandarin" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--text-muted)]">{searchQuery ? 'Aucun résultat' : 'Aucune conversation'}</div>
          ) : (
            filteredConversations.map(conv => (
              <button key={conv.id} onClick={() => loadMessages(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--card-border)] hover:bg-[var(--surface)] transition ${selectedConv === conv.id ? 'bg-mandarin/5 border-l-2 border-l-mandarin' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-[var(--text-primary)]">{conv.user_name || `+${conv.phone}`}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${statusColors[conv.status] || 'bg-[var(--surface)] text-[var(--text-muted)]'}`}>
                    {conv.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {new Date(conv.last_message_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Messages viewer + reply */}
      <Card className="lg:col-span-2 flex flex-col overflow-hidden">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sélectionnez une conversation</p>
            </div>
          </div>
        ) : loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-mandarin" />
          </div>
        ) : (
          <>
            {/* Status bar */}
            {selectedConvData && (
              <div className="px-4 py-2 border-b border-[var(--card-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-[var(--text-primary)]">{selectedConvData.user_name || `+${selectedConvData.phone}`}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${statusColors[selectedConvData.status] || 'bg-[var(--surface)] text-[var(--text-muted)]'}`}>
                    {selectedConvData.status}
                  </span>
                </div>
                <div className="flex gap-1">
                  {['active', 'escalated', 'closed'].map(s => (
                    <button key={s} onClick={() => updateConvStatus(selectedConv!, s)}
                      className={`px-2 py-1 text-[10px] rounded font-medium ${selectedConvData.status === s ? 'bg-mandarin text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'}`}>
                      {s === 'active' ? 'Actif' : s === 'escalated' ? 'Escaladé' : 'Fermé'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--surface)]">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-[var(--text-muted)] py-8">Aucun message</p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      msg.sender_type === 'user'
                        ? 'bg-green-600 text-white rounded-br-md'
                        : msg.sender_type === 'bot'
                          ? 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-bl-md'
                          : 'bg-royal-blue text-white rounded-bl-md'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {msg.sender_type === 'bot' && <Bot className="h-3 w-3 text-mandarin" />}
                        {msg.sender_type === 'user' && <User className="h-3 w-3" />}
                        {msg.sender_type === 'agent' && <User className="h-3 w-3" />}
                        <span className={`text-[10px] font-medium ${msg.sender_type === 'user' ? 'text-green-100' : msg.sender_type === 'bot' ? 'text-mandarin' : 'text-blue-100'}`}>
                          {msg.sender_type === 'bot' ? 'Jason (Bot)' : msg.sender_type === 'agent' ? 'Agent' : 'Client'}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender_type === 'user' ? 'text-green-200' : msg.sender_type === 'bot' ? 'text-[var(--text-muted)]' : 'text-blue-200'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply input */}
            <div className="px-4 py-3 border-t border-[var(--card-border)]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                  placeholder="Répondre au client via WhatsApp..."
                  className="flex-1 px-4 py-2.5 border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] rounded-full text-sm focus:ring-2 focus:ring-mandarin focus:border-transparent"
                  disabled={sendingReply}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="p-2.5 bg-mandarin text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ─── Tab 4: Rapports ─────────────────────────────────────

interface Report {
  id: string;
  report_date: string;
  summary: string;
  content?: string;
  conversations_analyzed: number;
  added_to_knowledge_base: boolean;
  created_at: string;
}

function RapportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [addingToKb, setAddingToKb] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_reports' }),
      });
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleGenerate = async (date?: string) => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_report', date }),
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setSelectedReport(data.report);
        fetchReports();
      } else {
        alert(data.error || 'Erreur de génération');
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setGenerating(false);
    }
  };

  const loadFullReport = async (reportId: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_report', report_id: reportId }),
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setSelectedReport(data.report);
      }
    } catch (err) {
      console.error('Load report error:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleAddToKb = async (reportId: string) => {
    setAddingToKb(reportId);
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_report_to_kb', report_id: reportId }),
      });
      if (res.ok) {
        fetchReports();
        if (selectedReport?.id === reportId) {
          setSelectedReport(prev => prev ? { ...prev, added_to_knowledge_base: true } : null);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur');
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setAddingToKb(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Reports list */}
      <Card className="flex flex-col h-[600px]">
        <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
          <h3 className="font-medium text-sm text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-mandarin" />
            Rapports quotidiens
          </h3>
          <Button size="sm" onClick={() => handleGenerate()} disabled={generating}
            leftIcon={generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}>
            Générer
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-mandarin" /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">Aucun rapport</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Cliquez sur Générer pour créer le premier</p>
            </div>
          ) : (
            reports.map(report => (
              <button key={report.id} onClick={() => loadFullReport(report.id)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--card-border)] hover:bg-[var(--surface)] transition ${selectedReport?.id === report.id ? 'bg-mandarin/5 border-l-2 border-l-mandarin' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    {new Date(report.report_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  {report.added_to_knowledge_base && (
                    <CheckCircle className="h-3.5 w-3.5 text-jewel" />
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{report.summary}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{report.conversations_analyzed} conversation{report.conversations_analyzed !== 1 ? 's' : ''} analysée{report.conversations_analyzed !== 1 ? 's' : ''}</p>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Report viewer */}
      <Card className="lg:col-span-2 flex flex-col h-[600px]">
        {!selectedReport ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sélectionnez un rapport ou générez-en un nouveau</p>
            </div>
          </div>
        ) : loadingReport ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-mandarin" />
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm text-[var(--text-primary)]">
                  Rapport du {new Date(selectedReport.report_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedReport.conversations_analyzed} conversations analysées</p>
              </div>
              <div className="flex gap-2">
                {selectedReport.added_to_knowledge_base ? (
                  <span className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-100 text-jewel rounded-lg font-medium">
                    <CheckCircle className="h-3 w-3" /> Dans la KB
                  </span>
                ) : (
                  <Button variant="outline" size="sm"
                    onClick={() => handleAddToKb(selectedReport.id)}
                    disabled={addingToKb === selectedReport.id}
                    leftIcon={addingToKb === selectedReport.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}>
                    Ajouter à la KB
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none">
              {(selectedReport.content || selectedReport.summary).split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-[var(--text-primary)] mt-4 mb-2">{line.replace('## ', '')}</h2>;
                if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-[var(--text-primary)] mt-4 mb-2">{line.replace('# ', '')}</h1>;
                if (line.startsWith('- ')) return <li key={i} className="text-[var(--text-secondary)] ml-4">{line.replace('- ', '')}</li>;
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-[var(--text-primary)]">{line.replace(/\*\*/g, '')}</p>;
                if (line.trim() === '') return <br key={i} />;
                return <p key={i} className="text-[var(--text-secondary)]">{line}</p>;
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
