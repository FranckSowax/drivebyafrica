'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Megaphone,
  ArrowLeft,
  Save,
  Loader2,
  Users,
  Play,
  Pause,
  XCircle,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Clock,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  template_name: string;
  template_language: string;
  template_components: unknown[];
  target_segment: {
    countries?: string[];
    has_orders?: boolean;
    has_quotes?: boolean;
    has_whatsapp?: boolean;
  };
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: { total: number; sent: number; delivered: number; read: number; failed: number };
  created_at: string;
}

interface Recipient {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
}

const COUNTRIES = [
  { value: 'GA', label: 'Gabon' },
  { value: 'CM', label: 'Cameroun' },
  { value: 'SN', label: 'Sénégal' },
  { value: 'CI', label: 'Côte d\'Ivoire' },
  { value: 'CD', label: 'RD Congo' },
  { value: 'CG', label: 'Congo' },
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'ML', label: 'Mali' },
  { value: 'GN', label: 'Guinée' },
  { value: 'BJ', label: 'Bénin' },
  { value: 'TG', label: 'Togo' },
];

export default function CampaignEditorPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const isNew = campaignId === 'new';

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLang] = useState('fr');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [hasOrders, setHasOrders] = useState(false);
  const [hasQuotes, setHasQuotes] = useState(false);
  const [hasWhatsapp, setHasWhatsapp] = useState(true);

  const fetchCampaign = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/campaigns`);
      const data = await res.json();
      const found = data.campaigns?.find((c: Campaign) => c.id === campaignId);
      if (found) {
        setCampaign(found);
        setName(found.name);
        setDescription(found.description || '');
        setTemplateName(found.template_name);
        setTemplateLang(found.template_language || 'fr');
        setScheduledAt(found.scheduled_at ? found.scheduled_at.slice(0, 16) : '');
        const seg = found.target_segment || {};
        setSelectedCountries(seg.countries || []);
        setHasOrders(seg.has_orders || false);
        setHasQuotes(seg.has_quotes || false);
        setHasWhatsapp(seg.has_whatsapp !== false);
      }
    } catch (error) {
      console.error('Fetch campaign error:', error);
    } finally {
      setLoading(false);
    }
  }, [campaignId, isNew]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  const handleSave = async () => {
    if (!name.trim() || !templateName.trim()) {
      alert('Nom et template requis');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...(isNew ? {} : { id: campaignId }),
        name: name.trim(),
        description: description.trim() || null,
        template_name: templateName.trim(),
        template_language: templateLanguage,
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
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erreur');
        return;
      }
      if (isNew && data.campaign?.id) {
        router.replace(`/admin/campaigns/${data.campaign.id}`);
      } else {
        await fetchCampaign();
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: string) => {
    if (action === 'send' && !confirm('Lancer l\'envoi de cette campagne ?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erreur');
        return;
      }
      if (action === 'populate') {
        alert(`${data.recipients_count} destinataires ajoutés`);
      }
      await fetchCampaign();
    } catch (error) {
      console.error('Action error:', error);
      alert('Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette campagne ? Cette action est irréversible.')) return;
    try {
      const res = await fetch(`/api/admin/campaigns?id=${campaignId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/campaigns');
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur');
      }
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const isEditable = isNew || (campaign && ['draft', 'scheduled'].includes(campaign.status));
  const stats = campaign?.stats || { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/admin/campaigns')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Megaphone className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">{isNew ? 'Nouvelle campagne' : campaign?.name || 'Campagne'}</h1>
        {campaign && (
          <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            campaign.status === 'draft' ? 'bg-gray-100 text-gray-700' :
            campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
            campaign.status === 'sending' ? 'bg-yellow-100 text-yellow-700' :
            campaign.status === 'sent' ? 'bg-green-100 text-green-700' :
            campaign.status === 'paused' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>
            {campaign.status === 'draft' ? 'Brouillon' :
             campaign.status === 'scheduled' ? 'Programmée' :
             campaign.status === 'sending' ? 'En cours' :
             campaign.status === 'sent' ? 'Envoyée' :
             campaign.status === 'paused' ? 'En pause' : 'Annulée'}
          </span>
        )}
      </div>

      {/* Stats (for existing campaigns) */}
      {!isNew && stats.total > 0 && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'text-gray-600' },
            { label: 'Envoyés', value: stats.sent, icon: Send, color: 'text-yellow-600' },
            { label: 'Livrés', value: stats.delivered, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Lus', value: stats.read, icon: CheckCircle2, color: 'text-blue-600' },
            { label: 'Échecs', value: stats.failed, icon: AlertCircle, color: 'text-red-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold">Informations</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la campagne *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!isEditable}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            placeholder="Ex: Promo véhicules Corée Mars 2026"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={!isEditable}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            placeholder="Description interne de la campagne..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du template Meta *</label>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              disabled={!isEditable}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              placeholder="Ex: promo_vehicule_mars"
            />
            <p className="text-xs text-gray-400 mt-1">Le template doit être approuvé dans Meta Business Manager</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Langue du template</label>
            <select
              value={templateLanguage}
              onChange={e => setTemplateLang(e.target.value)}
              disabled={!isEditable}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="zh_CN">中文</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Programmation (optionnel)
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            disabled={!isEditable}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          />
        </div>
      </div>

      {/* Segmentation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 mt-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Segmentation
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pays cibles</label>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map(country => (
              <button
                key={country.value}
                onClick={() => isEditable && toggleCountry(country.value)}
                disabled={!isEditable}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCountries.includes(country.value)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {country.label}
              </button>
            ))}
          </div>
          {selectedCountries.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Tous les pays si aucun sélectionné</p>
          )}
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasWhatsapp}
              onChange={e => setHasWhatsapp(e.target.checked)}
              disabled={!isEditable}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Numéro WhatsApp renseigné</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasOrders}
              onChange={e => setHasOrders(e.target.checked)}
              disabled={!isEditable}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">A passé une commande</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasQuotes}
              onChange={e => setHasQuotes(e.target.checked)}
              disabled={!isEditable}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">A demandé un devis</span>
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-2">
          {!isNew && isEditable && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {!isNew && isEditable && (
            <>
              <button
                onClick={() => handleAction('populate')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Peupler destinataires
              </button>
              <button
                onClick={() => handleAction('send')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Lancer l'envoi
              </button>
            </>
          )}

          {campaign?.status === 'sending' && (
            <button
              onClick={() => handleAction('pause')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}

          {campaign?.status === 'paused' && (
            <>
              <button
                onClick={() => handleAction('send')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Reprendre
              </button>
              <button
                onClick={() => handleAction('cancel')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Annuler
              </button>
            </>
          )}

          {isEditable && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isNew ? 'Créer' : 'Enregistrer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
