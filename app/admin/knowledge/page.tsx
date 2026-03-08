'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Plus, Search, Edit2, Trash2, Loader2, Eye, EyeOff,
  Database, Sparkles, X, Save, Upload, MessageSquare, Bot,
  Send, User, Brain, MessageCircle, ChevronRight,
} from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="h-7 w-7 text-purple-600" />
          Chatbot RAG & Base de connaissance
        </h1>
        <p className="text-gray-500 mt-1">Testez le chatbot, gérez la base de connaissance et suivez les conversations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
    } catch (err) {
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
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col" style={{ height: '600px' }}>
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <Bot className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-sm">Jason - Assistant Driveby Africa</p>
            <p className="text-xs text-gray-500">GPT-4.1 + RAG | Mode test admin</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[10px] ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
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
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Tapez un message pour tester le chatbot..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="p-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Side panel - Quick tests */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
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
                className="w-full text-left px-3 py-2 text-xs bg-gray-50 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-colors border border-gray-100"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            Info système
          </h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Modèle IA</span>
              <span className="font-mono text-gray-900">GPT-4.1</span>
            </div>
            <div className="flex justify-between">
              <span>Embeddings</span>
              <span className="font-mono text-gray-900">text-embedding-3-small</span>
            </div>
            <div className="flex justify-between">
              <span>Seuil RAG</span>
              <span className="font-mono text-gray-900">0.7</span>
            </div>
            <div className="flex justify-between">
              <span>Top K</span>
              <span className="font-mono text-gray-900">5</span>
            </div>
            <div className="flex justify-between">
              <span>Timeout contexte</span>
              <span className="font-mono text-gray-900">5s</span>
            </div>
          </div>
        </div>
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
        <p className="text-sm text-gray-500">{totalDocs} document{totalDocs !== 1 ? 's' : ''} dans la base RAG</p>
        <div className="flex gap-2">
          <button onClick={handleSeed} disabled={seeding}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Initialiser
          </button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importer
            <input type="file" accept=".txt,.md,.csv,.json" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
          <button onClick={() => setEditingDoc({ category: 'general', language: 'fr' })}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${filterCategory === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Tous ({totalDocs})
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.value} onClick={() => setFilterCategory(filterCategory === cat.value ? '' : cat.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${filterCategory === cat.value ? 'bg-gray-900 text-white' : `${cat.color} hover:opacity-80`}`}>
            {cat.label} ({stats[cat.value] || 0})
          </button>
        ))}
      </div>

      {/* Semantic search */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Recherche sémantique dans la base..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
          </div>
          <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Rechercher
          </button>
          {searchResults && (
            <button onClick={() => setSearchResults(null)} className="flex items-center px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchResults && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">{searchResults.length} résultat{searchResults.length !== 1 ? 's' : ''}</h3>
            {searchResults.map(r => (
              <div key={r.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-purple-900">{r.document_title}</span>
                  <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">{(r.similarity * 100).toFixed(1)}%</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{r.content}</p>
              </div>
            ))}
            {searchResults.length === 0 && <p className="text-sm text-gray-500">Aucun résultat.</p>}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold">{editingDoc.id ? 'Modifier le document' : 'Nouveau document'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input type="text" value={editingDoc.title || ''}
                  onChange={e => setEditingDoc(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500" placeholder="Titre du document" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select value={editingDoc.category || 'general'}
                  onChange={e => setEditingDoc(prev => prev ? { ...prev, category: e.target.value } : null)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                  {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
                <textarea value={editingDoc.content || ''}
                  onChange={e => setEditingDoc(prev => prev ? { ...prev, content: e.target.value } : null)}
                  rows={15} className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500"
                  placeholder="Contenu du document..." />
                {editingDoc.content && (
                  <p className="text-xs text-gray-400 mt-1">{editingDoc.content.length} car. ~{Math.ceil(editingDoc.content.length / 2000)} chunks</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditingDoc(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
                <button onClick={handleSave} disabled={saving || !editingDoc.title || !editingDoc.content}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingDoc.id ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun document</p>
          <p className="text-sm text-gray-400 mt-1">Cliquez sur &quot;Initialiser&quot; pour charger les documents de base</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const catStyle = getCategoryStyle(doc.category);
            return (
              <div key={doc.id} className={`bg-white rounded-lg border p-4 ${!doc.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catStyle.color}`}>{catStyle.label}</span>
                      {!doc.is_active && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">Inactif</span>}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{doc.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Source: {doc.source}</span>
                      <span>{doc.content.length} car.</span>
                      <span>Mis à jour: {new Date(doc.updated_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button onClick={() => handleToggleActive(doc)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title={doc.is_active ? 'Désactiver' : 'Activer'}>
                      {doc.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setEditingDoc(doc)} className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50" title="Modifier">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
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
    closed: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: '600px' }}>
      {/* Conversations list */}
      <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-sm">Conversations WhatsApp</h3>
          <div className="flex gap-1 mt-2">
            {['', 'active', 'escalated', 'closed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-[10px] rounded-full font-medium ${statusFilter === s ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {s || 'Toutes'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">Aucune conversation</div>
          ) : (
            conversations.map(conv => (
              <button key={conv.id} onClick={() => loadMessages(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${selectedConv === conv.id ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">{conv.user_name || `+${conv.phone}`}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${statusColors[conv.status] || 'bg-gray-100 text-gray-600'}`}>
                    {conv.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(conv.last_message_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages viewer */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Sélectionnez une conversation</p>
            </div>
          </div>
        ) : loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Aucun message</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    msg.sender_type === 'user'
                      ? 'bg-green-600 text-white rounded-br-md'
                      : msg.sender_type === 'bot'
                        ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                        : 'bg-blue-600 text-white rounded-bl-md'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {msg.sender_type === 'bot' && <Bot className="h-3 w-3 text-purple-500" />}
                      {msg.sender_type === 'user' && <User className="h-3 w-3" />}
                      {msg.sender_type === 'agent' && <User className="h-3 w-3" />}
                      <span className={`text-[10px] font-medium ${msg.sender_type === 'user' ? 'text-green-100' : msg.sender_type === 'bot' ? 'text-purple-500' : 'text-blue-100'}`}>
                        {msg.sender_type === 'bot' ? 'Jason (Bot)' : msg.sender_type === 'agent' ? 'Agent' : 'Client'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_type === 'user' ? 'text-green-200' : msg.sender_type === 'bot' ? 'text-gray-400' : 'text-blue-200'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
