'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  Sparkles,
  Filter,
  X,
  Save,
  ChevronDown,
  Upload,
} from 'lucide-react';

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

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('');

  // Editor state
  const [editingDoc, setEditingDoc] = useState<Partial<KnowledgeDocument> | null>(null);
  const [saving, setSaving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Seed state
  const [seeding, setSeeding] = useState(false);

  // Upload state
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

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

      if (res.ok) {
        setEditingDoc(null);
        fetchDocuments();
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document et ses embeddings ?')) return;

    try {
      const res = await fetch(`/api/admin/knowledge?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchDocuments();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleToggleActive = async (doc: KnowledgeDocument) => {
    try {
      await fetch('/api/admin/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, is_active: !doc.is_active }),
      });
      fetchDocuments();
    } catch (err) {
      console.error('Toggle error:', err);
    }
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
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm('Initialiser la base de connaissance avec les documents de base ? Cela nécessite OPENAI_API_KEY.')) return;
    setSeeding(true);

    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Base initialisée');
        fetchDocuments();
      } else {
        alert(data.error || 'Erreur');
      }
    } catch (err) {
      console.error('Seed error:', err);
      alert('Erreur de connexion');
    } finally {
      setSeeding(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const category = prompt('Catégorie du document (faq, process, pricing, policy, vehicle_info, shipping, general)', 'general');
    if (!category) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const res = await fetch('/api/admin/knowledge/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Document importé');
        fetchDocuments();
      } else {
        alert(data.error || 'Erreur lors de l\'import');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erreur de connexion');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const totalDocs = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7" />
            Base de connaissance
          </h1>
          <p className="text-gray-500 mt-1">{totalDocs} document{totalDocs !== 1 ? 's' : ''} dans la base RAG</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Initialiser
          </button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importer fichier
            <input
              type="file"
              accept=".txt,.md,.csv,.json"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setEditingDoc({ category: 'general', language: 'fr' })}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
            filterCategory === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tous ({totalDocs})
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(filterCategory === cat.value ? '' : cat.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
              filterCategory === cat.value ? 'bg-gray-900 text-white' : `${cat.color} hover:opacity-80`
            }`}
          >
            {cat.label} ({stats[cat.value] || 0})
          </button>
        ))}
      </div>

      {/* Semantic Search */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Recherche sémantique dans la base de connaissance..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Rechercher
          </button>
          {searchResults && (
            <button
              onClick={() => setSearchResults(null)}
              className="flex items-center px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {searchResults && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              {searchResults.length} résultat{searchResults.length !== 1 ? 's' : ''} trouvé{searchResults.length !== 1 ? 's' : ''}
            </h3>
            {searchResults.map(r => (
              <div key={r.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-purple-900">{r.document_title}</span>
                  <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                    {(r.similarity * 100).toFixed(1)}% match
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{r.content}</p>
              </div>
            ))}
            {searchResults.length === 0 && (
              <p className="text-sm text-gray-500">Aucun résultat. Essayez une autre requête ou réduisez le seuil de similarité.</p>
            )}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold">
                {editingDoc.id ? 'Modifier le document' : 'Nouveau document'}
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  type="text"
                  value={editingDoc.title || ''}
                  onChange={e => setEditingDoc(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre du document"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select
                  value={editingDoc.category || 'general'}
                  onChange={e => setEditingDoc(prev => prev ? { ...prev, category: e.target.value } : null)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
                <textarea
                  value={editingDoc.content || ''}
                  onChange={e => setEditingDoc(prev => prev ? { ...prev, content: e.target.value } : null)}
                  rows={15}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  placeholder="Contenu du document..."
                />
                {editingDoc.content && (
                  <p className="text-xs text-gray-400 mt-1">
                    {editingDoc.content.length} caractères, ~{Math.ceil(editingDoc.content.length / 2000)} chunk{Math.ceil(editingDoc.content.length / 2000) > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editingDoc.title || !editingDoc.content}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
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
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun document dans la base de connaissance</p>
          <p className="text-sm text-gray-400 mt-1">Cliquez sur &quot;Initialiser&quot; pour charger les documents de base</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const catStyle = getCategoryStyle(doc.category);
            return (
              <div
                key={doc.id}
                className={`bg-white rounded-lg border p-4 ${!doc.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catStyle.color}`}>
                        {catStyle.label}
                      </span>
                      {!doc.is_active && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Inactif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{doc.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Source: {doc.source}</span>
                      <span>{doc.content.length} car.</span>
                      <span>Mis à jour: {new Date(doc.updated_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleToggleActive(doc)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title={doc.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {doc.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setEditingDoc(doc)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Supprimer"
                    >
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
