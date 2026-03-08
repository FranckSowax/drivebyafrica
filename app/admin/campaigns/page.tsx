'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  XCircle,
  Eye,
  Calendar,
  Users,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  template_name: string;
  template_language: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: { total: number; sent: number; delivered: number; read: number; failed: number };
  created_at: string;
}

const STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', icon: Clock },
  scheduled: { label: 'Programmée', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  sending: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700', icon: Send },
  sent: { label: 'Envoyée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  paused: { label: 'En pause', color: 'bg-orange-100 text-orange-700', icon: Pause },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    setActionLoading(campaignId);
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
      await fetchCampaigns();
    } catch (error) {
      console.error('Action error:', error);
      alert('Erreur lors de l\'action');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Supprimer cette campagne ?')) return;
    setActionLoading(campaignId);
    try {
      const res = await fetch(`/api/admin/campaigns?id=${campaignId}`, { method: 'DELETE' });
      if (res.ok) await fetchCampaigns();
      else {
        const data = await res.json();
        alert(data.error || 'Erreur');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusStyle = (status: string) => STATUS_STYLES[status] || STATUS_STYLES.draft;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Campagnes WhatsApp</h1>
            <p className="text-sm text-gray-500">Gérez vos campagnes marketing via templates Meta</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCampaigns}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/admin/campaigns/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nouvelle campagne
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !filterStatus ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Toutes
        </button>
        {Object.entries(STATUS_STYLES).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">Aucune campagne</h3>
          <p className="text-sm text-gray-400 mt-1">Créez votre première campagne marketing WhatsApp</p>
          <button
            onClick={() => router.push('/admin/campaigns/new')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer une campagne
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => {
            const style = getStatusStyle(campaign.status);
            const StatusIcon = style.icon;
            const stats = campaign.stats || { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
            const progressPct = stats.total > 0 ? Math.round(((stats.sent + stats.failed) / stats.total) * 100) : 0;

            return (
              <div key={campaign.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {style.label}
                      </span>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-gray-500 mb-2">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Template: <strong className="text-gray-600">{campaign.template_name}</strong></span>
                      <span>Langue: {campaign.template_language}</span>
                      <span>Créée le {new Date(campaign.created_at).toLocaleDateString('fr-FR')}</span>
                      {campaign.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Programmée: {new Date(campaign.scheduled_at).toLocaleString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-4">
                    {actionLoading === campaign.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : (
                      <>
                        <button
                          onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title="Voir / Modifier"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>

                        {['draft', 'scheduled'].includes(campaign.status) && (
                          <>
                            <button
                              onClick={() => handleAction(campaign.id, 'populate')}
                              className="p-2 rounded-lg hover:bg-blue-50"
                              title="Peupler les destinataires"
                            >
                              <Users className="w-4 h-4 text-blue-500" />
                            </button>
                            <button
                              onClick={() => handleAction(campaign.id, 'send')}
                              className="p-2 rounded-lg hover:bg-green-50"
                              title="Lancer l'envoi"
                            >
                              <Play className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              className="p-2 rounded-lg hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </>
                        )}

                        {campaign.status === 'sending' && (
                          <button
                            onClick={() => handleAction(campaign.id, 'pause')}
                            className="p-2 rounded-lg hover:bg-orange-50"
                            title="Mettre en pause"
                          >
                            <Pause className="w-4 h-4 text-orange-500" />
                          </button>
                        )}

                        {campaign.status === 'paused' && (
                          <>
                            <button
                              onClick={() => handleAction(campaign.id, 'send')}
                              className="p-2 rounded-lg hover:bg-green-50"
                              title="Reprendre"
                            >
                              <Play className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleAction(campaign.id, 'cancel')}
                              className="p-2 rounded-lg hover:bg-red-50"
                              title="Annuler"
                            >
                              <XCircle className="w-4 h-4 text-red-500" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Stats bar */}
                {stats.total > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{stats.total} destinataires</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        {stats.read > 0 && (
                          <div className="bg-blue-500 h-full" style={{ width: `${(stats.read / stats.total) * 100}%` }} />
                        )}
                        {(stats.delivered - stats.read) > 0 && (
                          <div className="bg-green-500 h-full" style={{ width: `${((stats.delivered - stats.read) / stats.total) * 100}%` }} />
                        )}
                        {(stats.sent - stats.delivered) > 0 && (
                          <div className="bg-yellow-400 h-full" style={{ width: `${((stats.sent - stats.delivered) / stats.total) * 100}%` }} />
                        )}
                        {stats.failed > 0 && (
                          <div className="bg-red-400 h-full" style={{ width: `${(stats.failed / stats.total) * 100}%` }} />
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Lu: {stats.read}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Livré: {stats.delivered}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Envoyé: {stats.sent}</span>
                      {stats.failed > 0 && (
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Échec: {stats.failed}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
