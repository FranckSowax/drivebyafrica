'use client';

import { useState, useEffect } from 'react';
import { CollaboratorBadge } from './CollaboratorBadge';
import { Loader2, FileText, RefreshCw, History } from 'lucide-react';
import { format } from 'date-fns';
import { fr, zhCN, enUS } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  collaborator_id: string;
  collaborator_name: string | null;
  collaborator_color: string | null;
  action_type: string;
  details: {
    oldStatus?: string;
    newStatus?: string;
    documentName?: string;
    note?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

interface OrderActivityHistoryProps {
  orderId: string;
  locale?: 'fr' | 'en' | 'zh';
}

const dateLocales = {
  fr,
  en: enUS,
  zh: zhCN,
};

// Status labels for display
const statusLabels: Record<string, Record<string, string>> = {
  fr: {
    deposit_paid: 'Acompte paye',
    vehicle_locked: 'Vehicule bloque',
    inspection_sent: 'Inspection envoyee',
    full_payment_received: 'Paiement total recu',
    vehicle_purchased: 'Vehicule achete',
    export_customs: 'Douane export',
    in_transit: 'En transit',
    at_port: 'Au port',
    shipping: 'En mer',
    documents_ready: 'Documents prets',
    customs: 'En douane',
    ready_pickup: 'Pret pour retrait',
    delivered: 'Livre',
  },
  en: {
    deposit_paid: 'Deposit paid',
    vehicle_locked: 'Vehicle locked',
    inspection_sent: 'Inspection sent',
    full_payment_received: 'Full payment received',
    vehicle_purchased: 'Vehicle purchased',
    export_customs: 'Export customs',
    in_transit: 'In transit',
    at_port: 'At port',
    shipping: 'Shipping',
    documents_ready: 'Documents ready',
    customs: 'In customs',
    ready_pickup: 'Ready for pickup',
    delivered: 'Delivered',
  },
  zh: {
    deposit_paid: '已付定金',
    vehicle_locked: '车辆锁定',
    inspection_sent: '检查已发送',
    full_payment_received: '已收全款',
    vehicle_purchased: '车辆已购买',
    export_customs: '出口清关',
    in_transit: '运输中',
    at_port: '已到港口',
    shipping: '海运中',
    documents_ready: '文件就绪',
    customs: '清关中',
    ready_pickup: '准备提车',
    delivered: '已交付',
  },
};

const translations = {
  fr: {
    title: 'Historique des modifications',
    loading: 'Chargement...',
    error: 'Erreur de chargement',
    noActivity: 'Aucune activite',
    statusUpdate: 'Statut mis a jour',
    documentUpload: 'Document ajoute',
    to: 'vers',
  },
  en: {
    title: 'Modification History',
    loading: 'Loading...',
    error: 'Loading error',
    noActivity: 'No activity',
    statusUpdate: 'Status updated',
    documentUpload: 'Document added',
    to: 'to',
  },
  zh: {
    title: '修改历史',
    loading: '加载中...',
    error: '加载错误',
    noActivity: '无活动',
    statusUpdate: '状态已更新',
    documentUpload: '文件已添加',
    to: '至',
  },
};

export function OrderActivityHistory({ orderId, locale = 'fr' }: OrderActivityHistoryProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[locale] || translations.fr;
  const dateLocale = dateLocales[locale] || fr;
  const statusLabelMap = statusLabels[locale] || statusLabels.fr;

  const fetchActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/activity`);
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      console.error('Error fetching activity:', err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchActivity();
    }
  }, [orderId]);

  const getActionDescription = (activity: ActivityItem): string => {
    const { action_type, details } = activity;

    if (action_type === 'status_update') {
      const newStatusLabel = statusLabelMap[details.newStatus || ''] || details.newStatus;
      return `${t.statusUpdate} ${t.to} "${newStatusLabel}"`;
    }

    if (action_type === 'document_upload') {
      return `${t.documentUpload}: ${details.documentName || 'Document'}`;
    }

    return action_type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-mandarin" />
        <span className="ml-2 text-sm text-[var(--text-muted)]">{t.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-4 text-red-500">
        <span className="text-sm">{error}</span>
        <button onClick={fetchActivity} className="ml-2 p-1 hover:bg-red-100 rounded">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-4">
        <History className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
        <p className="text-sm text-[var(--text-muted)] mt-2">{t.noActivity}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-4">
      <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3 flex items-center gap-2">
        <History className="w-4 h-4" />
        {t.title}
      </h4>
      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 text-sm border-l-2 border-[var(--card-border)] pl-3 py-1"
          >
            <CollaboratorBadge
              collaboratorId={activity.collaborator_id}
              collaboratorName={activity.collaborator_name}
              badgeColor={activity.collaborator_color}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[var(--text-primary)] truncate">
                  {activity.collaborator_name || 'Unknown'}
                </span>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="text-[var(--text-secondary)]">
                  {getActionDescription(activity)}
                </span>
              </div>
              {activity.details.note && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 italic">
                  "{activity.details.note}"
                </p>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {format(new Date(activity.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
              </p>
            </div>
            {activity.action_type === 'document_upload' && (
              <FileText className="w-4 h-4 text-mandarin shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
