'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Plus, Search, Loader2, RefreshCw, Trash2, Play, Pause,
  XCircle, Eye, Calendar, Users, Send, CheckCircle2, Clock, AlertCircle,
  Image, Video, FileText, Type, Globe, Save, Edit2, Copy, X,
  ChevronDown, Filter, BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ─── Types ───────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  template_name: string;
  template_language: string;
  template_components: TemplateComponent[];
  target_segment: TargetSegment;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: CampaignStats;
  created_at: string;
}

interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

interface TargetSegment {
  countries?: string[];
  has_orders?: boolean;
  has_quotes?: boolean;
  has_whatsapp?: boolean;
}

interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: Array<{
    type: 'text' | 'image' | 'document' | 'video';
    text?: string;
    image?: { link: string };
    document?: { link: string; filename?: string };
    video?: { link: string };
  }>;
  sub_type?: 'url' | 'quick_reply';
  index?: number;
}

// ─── Constants ───────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', icon: Clock },
  scheduled: { label: 'Programmée', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  sending: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700', icon: Send },
  sent: { label: 'Envoyée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  paused: { label: 'En pause', color: 'bg-orange-100 text-orange-700', icon: Pause },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const COUNTRIES = [
  { value: 'GA', label: '🇬🇦 Gabon' },
  { value: 'CM', label: '🇨🇲 Cameroun' },
  { value: 'SN', label: '🇸🇳 Sénégal' },
  { value: 'CI', label: '🇨🇮 Côte d\'Ivoire' },
  { value: 'CD', label: '🇨🇩 RD Congo' },
  { value: 'CG', label: '🇨🇬 Congo' },
  { value: 'BF', label: '🇧🇫 Burkina Faso' },
  { value: 'ML', label: '🇲🇱 Mali' },
  { value: 'GN', label: '🇬🇳 Guinée' },
  { value: 'BJ', label: '🇧🇯 Bénin' },
  { value: 'TG', label: '🇹🇬 Togo' },
];

const TABS = [
  { id: 'campaigns', label: 'Campagnes', icon: Megaphone },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'segmentation', label: 'Segmentation', icon: Users },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Main Page ───────────────────────────────────────────

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('campaigns');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-mandarin/10 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-mandarin" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Campagnes WhatsApp</h1>
            <p className="text-[var(--text-muted)] text-sm">Créez des templates, segmentez vos audiences et gérez vos campagnes</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--surface)] p-1 rounded-xl w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--card-bg)] text-mandarin shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'segmentation' && <SegmentationTab />}
    </div>
  );
}

// ─── Tab 1: Campagnes ────────────────────────────────────

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/campaigns?${params}`);
      const data = await res.json();
      if (data.campaigns) setCampaigns(data.campaigns);
    } catch (error) {
      console.error('Fetch campaigns error:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleAction = async (campaignId: string, action: string) => {
    if (action === 'send' && !confirm('Lancer l\'envoi de cette campagne ?')) return;
    setActionLoading(campaignId);
    try {
      const res = await fetch('/api/admin/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, action }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Erreur'); return; }
      if (action === 'populate') alert(`${data.recipients_count} destinataires ajoutés`);
      await fetchCampaigns();
    } catch { alert('Erreur'); } finally { setActionLoading(null); }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Supprimer cette campagne ?')) return;
    setActionLoading(campaignId);
    try {
      const res = await fetch(`/api/admin/campaigns?id=${campaignId}`, { method: 'DELETE' });
      if (res.ok) await fetchCampaigns();
      else { const d = await res.json(); alert(d.error || 'Erreur'); }
    } finally { setActionLoading(null); }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.template_name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text" placeholder="Rechercher une campagne..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-mandarin"
            />
          </div>
          <button onClick={fetchCampaigns} className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--surface)]">
            <RefreshCw className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {['', ...Object.keys(STATUS_CONFIG)].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                  filterStatus === s ? 'bg-mandarin text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {s ? STATUS_CONFIG[s].label : 'Toutes'}
              </button>
            ))}
          </div>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateForm(true)}>
            Nouvelle
          </Button>
        </div>
      </div>

      {/* Create form (inline) */}
      {showCreateForm && (
        <CampaignForm
          onSave={async () => { setShowCreateForm(false); await fetchCampaigns(); }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Campaigns table */}
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-mandarin" /></div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-10 h-10 text-[var(--text-muted)] opacity-30 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">{searchQuery ? 'Aucun résultat' : 'Aucune campagne'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--surface)]">
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Campagne</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Template</th>
                  <th className="text-center px-4 py-3 font-medium text-[var(--text-muted)]">Statut</th>
                  <th className="text-center px-4 py-3 font-medium text-[var(--text-muted)]">Destinataires</th>
                  <th className="text-center px-4 py-3 font-medium text-[var(--text-muted)]">Progression</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map(campaign => {
                  const style = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                  const StatusIcon = style.icon;
                  const stats = campaign.stats || { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
                  const progressPct = stats.total > 0 ? Math.round(((stats.sent + stats.failed) / stats.total) * 100) : 0;
                  const isEditing = editingCampaign === campaign.id;

                  return (
                    <tr key={campaign.id} className="border-b border-[var(--card-border)] last:border-b-0 hover:bg-[var(--surface)] transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text-primary)]">{campaign.name}</div>
                        {campaign.description && <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-[200px]">{campaign.description}</div>}
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
                          {campaign.scheduled_at && (
                            <span className="ml-2 inline-flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(campaign.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-[var(--surface)] px-2 py-1 rounded text-[var(--text-secondary)]">{campaign.template_name}</span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-1">{campaign.template_language}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.color}`}>
                          <StatusIcon className="w-3 h-3" />{style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{stats.total}</span>
                      </td>
                      <td className="px-4 py-3">
                        {stats.total > 0 ? (
                          <div className="min-w-[120px]">
                            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                              <span>{progressPct}%</span>
                              <span>{stats.read} lus</span>
                            </div>
                            <div className="w-full h-1.5 bg-[var(--surface)] rounded-full overflow-hidden flex">
                              {stats.read > 0 && <div className="bg-royal-blue h-full" style={{ width: `${(stats.read / stats.total) * 100}%` }} />}
                              {(stats.delivered - stats.read) > 0 && <div className="bg-green-500 h-full" style={{ width: `${((stats.delivered - stats.read) / stats.total) * 100}%` }} />}
                              {(stats.sent - stats.delivered) > 0 && <div className="bg-yellow-400 h-full" style={{ width: `${((stats.sent - stats.delivered) / stats.total) * 100}%` }} />}
                              {stats.failed > 0 && <div className="bg-red-400 h-full" style={{ width: `${(stats.failed / stats.total) * 100}%` }} />}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {actionLoading === campaign.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-mandarin" />
                          ) : (
                            <>
                              {['draft', 'scheduled'].includes(campaign.status) && (
                                <>
                                  <button onClick={() => setEditingCampaign(isEditing ? null : campaign.id)}
                                    className="p-1.5 rounded-lg hover:bg-mandarin/10" title="Modifier">
                                    <Edit2 className="w-3.5 h-3.5 text-mandarin" />
                                  </button>
                                  <button onClick={() => handleAction(campaign.id, 'populate')}
                                    className="p-1.5 rounded-lg hover:bg-royal-blue/10" title="Peupler destinataires">
                                    <Users className="w-3.5 h-3.5 text-royal-blue" />
                                  </button>
                                  <button onClick={() => handleAction(campaign.id, 'send')}
                                    className="p-1.5 rounded-lg hover:bg-green-50" title="Lancer l'envoi">
                                    <Play className="w-3.5 h-3.5 text-green-600" />
                                  </button>
                                  <button onClick={() => handleDelete(campaign.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50" title="Supprimer">
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                </>
                              )}
                              {campaign.status === 'sending' && (
                                <button onClick={() => handleAction(campaign.id, 'pause')}
                                  className="p-1.5 rounded-lg hover:bg-orange-50" title="Pause">
                                  <Pause className="w-3.5 h-3.5 text-orange-500" />
                                </button>
                              )}
                              {campaign.status === 'paused' && (
                                <>
                                  <button onClick={() => handleAction(campaign.id, 'send')}
                                    className="p-1.5 rounded-lg hover:bg-green-50" title="Reprendre">
                                    <Play className="w-3.5 h-3.5 text-green-600" />
                                  </button>
                                  <button onClick={() => handleAction(campaign.id, 'cancel')}
                                    className="p-1.5 rounded-lg hover:bg-red-50" title="Annuler">
                                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit campaign inline */}
      {editingCampaign && (
        <CampaignForm
          campaignId={editingCampaign}
          onSave={async () => { setEditingCampaign(null); await fetchCampaigns(); }}
          onCancel={() => setEditingCampaign(null)}
        />
      )}
    </div>
  );
}

// ─── Campaign Form (Create / Edit) ──────────────────────

function CampaignForm({ campaignId, onSave, onCancel }: { campaignId?: string; onSave: () => void; onCancel: () => void }) {
  const isNew = !campaignId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('fr');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [hasOrders, setHasOrders] = useState(false);
  const [hasQuotes, setHasQuotes] = useState(false);
  const [hasWhatsapp, setHasWhatsapp] = useState(true);
  // Template components
  const [headerType, setHeaderType] = useState<'none' | 'image' | 'video' | 'document'>('none');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [bodyVariables, setBodyVariables] = useState<string[]>([]);

  useEffect(() => {
    if (!campaignId) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/campaigns`);
        const data = await res.json();
        const found = data.campaigns?.find((c: Campaign) => c.id === campaignId);
        if (found) {
          setName(found.name);
          setDescription(found.description || '');
          setTemplateName(found.template_name);
          setTemplateLanguage(found.template_language || 'fr');
          setScheduledAt(found.scheduled_at ? found.scheduled_at.slice(0, 16) : '');
          const seg = found.target_segment || {};
          setSelectedCountries(seg.countries || []);
          setHasOrders(seg.has_orders || false);
          setHasQuotes(seg.has_quotes || false);
          setHasWhatsapp(seg.has_whatsapp !== false);
          // Parse existing components
          if (found.template_components?.length) {
            const header = found.template_components.find((c: TemplateComponent) => c.type === 'header');
            if (header?.parameters?.[0]) {
              const p = header.parameters[0];
              if (p.type === 'image') { setHeaderType('image'); setHeaderMediaUrl(p.image?.link || ''); }
              if (p.type === 'video') { setHeaderType('video'); setHeaderMediaUrl(p.video?.link || ''); }
              if (p.type === 'document') { setHeaderType('document'); setHeaderMediaUrl(p.document?.link || ''); }
            }
            const body = found.template_components.find((c: TemplateComponent) => c.type === 'body');
            if (body?.parameters) {
              setBodyVariables(body.parameters.filter((p: { type: string; text?: string }) => p.type === 'text').map((p: { text?: string }) => p.text || ''));
            }
          }
        }
      } finally { setLoading(false); }
    })();
  }, [campaignId]);

  const buildComponents = (): TemplateComponent[] => {
    const components: TemplateComponent[] = [];
    if (headerType !== 'none' && headerMediaUrl.trim()) {
      const param: TemplateComponent['parameters'] = [];
      if (headerType === 'image') param.push({ type: 'image', image: { link: headerMediaUrl.trim() } });
      if (headerType === 'video') param.push({ type: 'video', video: { link: headerMediaUrl.trim() } });
      if (headerType === 'document') param.push({ type: 'document', document: { link: headerMediaUrl.trim() } });
      components.push({ type: 'header', parameters: param });
    }
    if (bodyVariables.some(v => v.trim())) {
      components.push({
        type: 'body',
        parameters: bodyVariables.filter(v => v.trim()).map(v => ({ type: 'text' as const, text: v.trim() })),
      });
    }
    return components;
  };

  const handleSave = async () => {
    if (!name.trim() || !templateName.trim()) { alert('Nom et template requis'); return; }
    setSaving(true);
    try {
      const payload = {
        ...(isNew ? {} : { id: campaignId }),
        name: name.trim(),
        description: description.trim() || null,
        template_name: templateName.trim(),
        template_language: templateLanguage,
        template_components: buildComponents(),
        target_segment: {
          countries: selectedCountries.length > 0 ? selectedCountries : undefined,
          has_orders: hasOrders || undefined,
          has_quotes: hasQuotes || undefined,
          has_whatsapp: hasWhatsapp || undefined,
        },
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        ...(scheduledAt ? { status: 'scheduled' } : {}),
      };
      const res = await fetch('/api/admin/campaigns', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Erreur'); return; }
      onSave();
    } catch { alert('Erreur'); } finally { setSaving(false); }
  };

  if (loading) return <Card><div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-mandarin" /></div></Card>;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{isNew ? 'Nouvelle campagne' : 'Modifier la campagne'}</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-[var(--surface)]"><X className="w-4 h-4 text-[var(--text-muted)]" /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Campaign info */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Nom de la campagne *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
              placeholder="Ex: Promo véhicules Mars 2026" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
              placeholder="Description interne..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Template Meta *</label>
              <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                placeholder="nom_du_template" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Langue</label>
              <select value={templateLanguage} onChange={e => setTemplateLanguage(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin">
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="zh_CN">中文</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Programmation</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin" />
          </div>
        </div>

        {/* Right column: Template components + Segmentation */}
        <div className="space-y-3">
          {/* Header media */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">En-tête du template</label>
            <div className="flex gap-1 mb-2">
              {(['none', 'image', 'video', 'document'] as const).map(t => {
                const icons = { none: Type, image: Image, video: Video, document: FileText };
                const labels = { none: 'Texte', image: 'Image', video: 'Vidéo', document: 'Document' };
                const Icon = icons[t];
                return (
                  <button key={t} onClick={() => setHeaderType(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                      headerType === t ? 'bg-mandarin text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />{labels[t]}
                  </button>
                );
              })}
            </div>
            {headerType !== 'none' && (
              <input type="url" value={headerMediaUrl} onChange={e => setHeaderMediaUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                placeholder={headerType === 'image' ? 'https://example.com/image.jpg' : headerType === 'video' ? 'https://example.com/video.mp4' : 'https://example.com/doc.pdf'} />
            )}
          </div>

          {/* Body variables */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Variables du body</label>
              <button onClick={() => setBodyVariables(prev => [...prev, ''])}
                className="text-xs text-mandarin hover:underline flex items-center gap-0.5">
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
            {bodyVariables.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Aucune variable (texte statique)</p>
            ) : (
              <div className="space-y-1.5">
                {bodyVariables.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)] w-12">{`{{${i + 1}}}`}</span>
                    <input type="text" value={v} onChange={e => {
                      const next = [...bodyVariables]; next[i] = e.target.value; setBodyVariables(next);
                    }}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                      placeholder={`Valeur pour {{${i + 1}}}`} />
                    <button onClick={() => setBodyVariables(prev => prev.filter((_, j) => j !== i))}
                      className="p-1 rounded hover:bg-red-50">
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inline segmentation */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ciblage</label>
            <div className="flex flex-wrap gap-1">
              {COUNTRIES.map(c => (
                <button key={c.value} onClick={() => setSelectedCountries(prev =>
                  prev.includes(c.value) ? prev.filter(x => x !== c.value) : [...prev, c.value]
                )}
                  className={`px-2 py-1 text-[10px] rounded-full font-medium transition ${
                    selectedCountries.includes(c.value) ? 'bg-mandarin text-white' : 'bg-[var(--surface)] text-[var(--text-muted)]'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
            {selectedCountries.length === 0 && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Tous les pays si aucun sélectionné</p>}
            <div className="flex gap-4 mt-2">
              {[
                { label: 'WhatsApp', checked: hasWhatsapp, set: setHasWhatsapp },
                { label: 'Commandes', checked: hasOrders, set: setHasOrders },
                { label: 'Devis', checked: hasQuotes, set: setHasQuotes },
              ].map(f => (
                <label key={f.label} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input type="checkbox" checked={f.checked} onChange={e => f.set(e.target.checked)}
                    className="rounded border-[var(--input-border)] text-mandarin focus:ring-mandarin h-3.5 w-3.5" />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--card-border)]">
        <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
        <Button size="sm" isLoading={saving} leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
          {isNew ? 'Créer' : 'Enregistrer'}
        </Button>
      </div>
    </Card>
  );
}

// ─── Tab 2: Templates ────────────────────────────────────

function TemplatesTab() {
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('fr');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');

  const bodyVariableCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;

  const buildPayload = () => {
    const components: Array<Record<string, unknown>> = [];

    if (headerType !== 'NONE') {
      if (headerType === 'TEXT') {
        components.push({ type: 'HEADER', format: 'TEXT', text: headerText });
      } else {
        components.push({ type: 'HEADER', format: headerType, example: { header_handle: [headerMediaUrl] } });
      }
    }

    if (bodyText) {
      const comp: Record<string, unknown> = { type: 'BODY', text: bodyText };
      if (bodyVariableCount > 0) {
        comp.example = { body_text: [Array.from({ length: bodyVariableCount }, (_, i) => `exemple_${i + 1}`)] };
      }
      components.push(comp);
    }

    if (footerText) {
      components.push({ type: 'FOOTER', text: footerText });
    }

    if (ctaUrl && ctaLabel) {
      components.push({
        type: 'BUTTONS',
        buttons: [{ type: 'URL', text: ctaLabel, url: ctaUrl }],
      });
    }

    return {
      name: templateName,
      category,
      language,
      components,
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Template Builder */}
      <div className="space-y-4">
        <Card>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-mandarin" />
            Créer un template Meta
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Nom du template *</label>
                <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                  placeholder="promo_vehicule_mars" />
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Lettres minuscules, chiffres et underscores uniquement</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Catégorie</label>
                  <select value={category} onChange={e => setCategory(e.target.value as typeof category)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin">
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utilitaire</option>
                    <option value="AUTHENTICATION">Authentification</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Langue</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin">
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="zh_CN">中文</option>
                    <option value="ar">العربية</option>
                    <option value="pt_BR">Português</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Header */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">En-tête</label>
              <div className="flex gap-1 mb-2">
                {(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'] as const).map(t => {
                  const icons: Record<string, React.ElementType> = { NONE: X, TEXT: Type, IMAGE: Image, VIDEO: Video, DOCUMENT: FileText };
                  const labels: Record<string, string> = { NONE: 'Aucun', TEXT: 'Texte', IMAGE: 'Image', VIDEO: 'Vidéo', DOCUMENT: 'PDF' };
                  const Icon = icons[t];
                  return (
                    <button key={t} onClick={() => setHeaderType(t)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                        headerType === t ? 'bg-mandarin text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />{labels[t]}
                    </button>
                  );
                })}
              </div>
              {headerType === 'TEXT' && (
                <input type="text" value={headerText} onChange={e => setHeaderText(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                  placeholder="Titre du message" maxLength={60} />
              )}
              {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
                <div>
                  <input type="url" value={headerMediaUrl} onChange={e => setHeaderMediaUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                    placeholder={headerType === 'IMAGE' ? 'https://example.com/image.jpg' : headerType === 'VIDEO' ? 'https://example.com/video.mp4' : 'https://example.com/doc.pdf'} />
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {headerType === 'IMAGE' ? 'JPG ou PNG, max 5 MB' : headerType === 'VIDEO' ? 'MP4, max 16 MB' : 'PDF, max 100 MB'}
                  </p>
                </div>
              )}
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Corps du message * <span className="text-[var(--text-muted)] font-normal">— Utilisez {'{{1}}'}, {'{{2}}'} pour les variables</span>
              </label>
              <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                placeholder="Bonjour {{1}}, découvrez nos nouveaux véhicules !" maxLength={1024} />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
                <span>{bodyVariableCount > 0 ? `${bodyVariableCount} variable(s)` : ''}</span>
                <span>{bodyText.length}/1024</span>
              </div>
            </div>

            {/* Footer */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Pied de page</label>
              <input type="text" value={footerText} onChange={e => setFooterText(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                placeholder="Driveby Africa — Votre partenaire auto" maxLength={60} />
            </div>

            {/* CTA Button */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Bouton CTA (optionnel)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                  placeholder="Texte du bouton" maxLength={25} />
                <input type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg bg-[var(--surface)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-mandarin"
                  placeholder="https://driveby-africa.com/..." />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--card-border)] flex items-center justify-between">
            <p className="text-[10px] text-[var(--text-muted)]">Le template sera soumis à Meta pour approbation</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" leftIcon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => navigator.clipboard.writeText(JSON.stringify(buildPayload(), null, 2))}>
                Copier JSON
              </Button>
              <Button size="sm" leftIcon={<Send className="w-3.5 h-3.5" />}
                disabled={!templateName || !bodyText}
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(buildPayload(), null, 2));
                  alert('Payload JSON copié ! Soumettez-le via l\'API Meta ou le Business Manager.\n\nEndpoint: POST https://graph.facebook.com/v21.0/{WABA_ID}/message_templates');
                }}>
                Générer template
              </Button>
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card>
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Comment utiliser</h4>
          <ol className="text-xs text-[var(--text-muted)] space-y-1.5 list-decimal list-inside">
            <li>Créez votre template avec le formulaire ci-dessus</li>
            <li>Cliquez sur <strong className="text-[var(--text-secondary)]">Copier JSON</strong> pour obtenir le payload</li>
            <li>Soumettez-le dans le <strong className="text-[var(--text-secondary)]">Meta Business Manager</strong> ou via l'API</li>
            <li>Attendez l'approbation par Meta (quelques minutes à 24h)</li>
            <li>Créez une campagne avec le nom du template approuvé</li>
          </ol>
        </Card>
      </div>

      {/* Preview */}
      <div>
        <Card>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-royal-blue" />
            Aperçu WhatsApp
          </h3>
          <div className="bg-[#e5ddd5] rounded-xl p-4 min-h-[400px] flex items-end justify-center">
            <div className="bg-white rounded-xl shadow-lg max-w-[280px] w-full overflow-hidden">
              {/* Header */}
              {headerType === 'IMAGE' && (
                <div className="bg-gray-200 h-36 flex items-center justify-center">
                  {headerMediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={headerMediaUrl} alt="Header" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Image className="w-8 h-8 text-gray-400" />
                  )}
                </div>
              )}
              {headerType === 'VIDEO' && (
                <div className="bg-gray-800 h-36 flex items-center justify-center">
                  <Video className="w-8 h-8 text-white" />
                  <span className="text-white text-xs ml-2">Vidéo</span>
                </div>
              )}
              {headerType === 'DOCUMENT' && (
                <div className="bg-gray-100 h-20 flex items-center justify-center gap-2">
                  <FileText className="w-6 h-6 text-red-500" />
                  <span className="text-xs text-gray-600">document.pdf</span>
                </div>
              )}
              {headerType === 'TEXT' && headerText && (
                <div className="px-3 pt-3">
                  <p className="font-bold text-sm text-gray-900">{headerText}</p>
                </div>
              )}

              {/* Body */}
              <div className="px-3 py-2">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {bodyText || 'Votre message ici...'}
                </p>
              </div>

              {/* Footer */}
              {footerText && (
                <div className="px-3 pb-2">
                  <p className="text-[11px] text-gray-400">{footerText}</p>
                </div>
              )}

              {/* Timestamp */}
              <div className="px-3 pb-2 text-right">
                <span className="text-[10px] text-gray-400">
                  {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* CTA */}
              {ctaLabel && (
                <div className="border-t border-gray-100 px-3 py-2.5 text-center">
                  <span className="text-sm text-blue-500 font-medium">{ctaLabel}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 3: Segmentation ─────────────────────────────────

function SegmentationTab() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [hasWhatsapp, setHasWhatsapp] = useState(true);
  const [hasOrders, setHasOrders] = useState(false);
  const [hasQuotes, setHasQuotes] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [audienceDetails, setAudienceDetails] = useState<Array<{ name: string; phone: string; country: string }>>([]);

  const estimateAudience = async () => {
    setEstimating(true);
    try {
      // Create a temporary campaign to populate, then check count
      const segment: TargetSegment = {
        countries: selectedCountries.length > 0 ? selectedCountries : undefined,
        has_whatsapp: hasWhatsapp || undefined,
        has_orders: hasOrders || undefined,
        has_quotes: hasQuotes || undefined,
      };

      // Use the campaign API to estimate (create temp campaign, populate, get count, delete)
      const createRes = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `_estimation_${Date.now()}`,
          template_name: 'estimation_temp',
          target_segment: segment,
        }),
      });
      const { campaign } = await createRes.json();
      if (!campaign?.id) { setEstimatedCount(0); return; }

      // Populate
      const popRes = await fetch('/api/admin/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, action: 'populate' }),
      });
      const popData = await popRes.json();
      setEstimatedCount(popData.recipients_count || 0);

      // Delete temp campaign
      await fetch(`/api/admin/campaigns?id=${campaign.id}`, { method: 'DELETE' });
    } catch {
      setEstimatedCount(0);
    } finally {
      setEstimating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Segment builder */}
      <div className="lg:col-span-2">
        <Card>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-mandarin" />
            Constructeur de segments
          </h3>

          <div className="space-y-5">
            {/* Countries */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Pays cibles</label>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map(c => (
                  <button key={c.value} onClick={() => setSelectedCountries(prev =>
                    prev.includes(c.value) ? prev.filter(x => x !== c.value) : [...prev, c.value]
                  )}
                    className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
                      selectedCountries.includes(c.value) ? 'bg-mandarin text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
              {selectedCountries.length === 0 && <p className="text-xs text-[var(--text-muted)] mt-1">Tous les pays si aucun sélectionné</p>}
            </div>

            {/* Filters */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Filtres comportementaux</label>
              <div className="space-y-2">
                {[
                  { label: 'Numéro WhatsApp renseigné', desc: 'Seuls les contacts avec un numéro WhatsApp', checked: hasWhatsapp, set: setHasWhatsapp, icon: Send },
                  { label: 'A passé au moins une commande', desc: 'Clients ayant déjà commandé un véhicule', checked: hasOrders, set: setHasOrders, icon: CheckCircle2 },
                  { label: 'A demandé un devis', desc: 'Prospects ayant demandé un devis', checked: hasQuotes, set: setHasQuotes, icon: FileText },
                ].map(f => (
                  <label key={f.label} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    f.checked ? 'border-mandarin bg-mandarin/5' : 'border-[var(--card-border)] hover:border-[var(--input-border)]'
                  }`}>
                    <input type="checkbox" checked={f.checked} onChange={e => f.set(e.target.checked)}
                      className="mt-0.5 rounded border-[var(--input-border)] text-mandarin focus:ring-mandarin" />
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                        <f.icon className="w-3.5 h-3.5 text-mandarin" />{f.label}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{f.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--card-border)]">
            <Button leftIcon={<Users className="w-4 h-4" />} isLoading={estimating} onClick={estimateAudience}>
              Estimer l'audience
            </Button>
          </div>
        </Card>
      </div>

      {/* Estimation result */}
      <div>
        <Card>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-royal-blue" />
            Estimation
          </h3>

          {estimatedCount === null ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-[var(--text-muted)] opacity-30 mx-auto mb-3" />
              <p className="text-sm text-[var(--text-muted)]">Configurez vos critères puis estimez l'audience</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-mandarin mb-1">{estimatedCount}</div>
              <p className="text-sm text-[var(--text-muted)]">contacts correspondants</p>

              <div className="mt-4 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Pays</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {selectedCountries.length > 0 ? selectedCountries.join(', ') : 'Tous'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">WhatsApp requis</span>
                  <span className="font-medium text-[var(--text-primary)]">{hasWhatsapp ? 'Oui' : 'Non'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Commandes</span>
                  <span className="font-medium text-[var(--text-primary)]">{hasOrders ? 'Oui' : 'Tous'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Devis</span>
                  <span className="font-medium text-[var(--text-primary)]">{hasQuotes ? 'Oui' : 'Tous'}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--card-border)]">
                <p className="text-[10px] text-[var(--text-muted)]">
                  Utilisez ce segment en créant une campagne avec les mêmes critères
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Quick tips */}
        <Card className="mt-4">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Bonnes pratiques</h4>
          <ul className="text-xs text-[var(--text-muted)] space-y-1.5">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
              Ciblez par pays pour des offres pertinentes
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
              Les clients avec commandes sont plus réceptifs aux promos
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
              Limitez la fréquence : max 2 campagnes par semaine
            </li>
            <li className="flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
              Meta peut bloquer les envois massifs sans template approuvé
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
