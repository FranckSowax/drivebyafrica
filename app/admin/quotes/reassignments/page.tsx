'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  Send,
  Eye,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  X,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface ProposedVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  current_price_usd: number | null;
  mileage: number | null;
  images: string[] | null;
  source: string;
  source_url: string | null;
  similarity_score: number;
}

interface Reassignment {
  id: string;
  original_quote_id: string;
  user_id: string;
  original_vehicle_id: string;
  original_vehicle_make: string;
  original_vehicle_model: string;
  original_vehicle_year: number;
  original_vehicle_price_usd: number;
  reason: string;
  status: string;
  proposed_vehicles: ProposedVehicle[];
  selected_vehicle_id: string | null;
  new_quote_id: string | null;
  whatsapp_sent_at: string | null;
  whatsapp_message_id: string | null;
  customer_response: string | null;
  customer_responded_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
}

interface Stats {
  total: number;
  pending: number;
  contacted: number;
  accepted: number;
  declined: number;
}

const statusConfig = {
  pending: {
    label: 'En attente',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: Clock,
  },
  contacted: {
    label: 'Contacte',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: MessageCircle,
  },
  accepted: {
    label: 'Accepte',
    color: 'text-jewel',
    bg: 'bg-jewel/10',
    border: 'border-jewel/30',
    icon: CheckCircle,
  },
  declined: {
    label: 'Refuse',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: XCircle,
  },
};

export default function ReassignmentsPage() {
  const [reassignments, setReassignments] = useState<Reassignment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReassignment, setSelectedReassignment] = useState<Reassignment | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);
  const [refreshingVehicles, setRefreshingVehicles] = useState<string | null>(null);

  const fetchReassignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/admin/quotes/reassign?${params}`);
      const data = await response.json();

      if (data.reassignments) {
        setReassignments(data.reassignments);
        setStats(data.stats);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching reassignments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchReassignments();
  }, [fetchReassignments]);

  const sendWhatsApp = async (id: string) => {
    setSendingWhatsApp(id);
    try {
      const response = await fetch('/api/admin/quotes/reassign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'send_whatsapp' }),
      });

      const data = await response.json();
      if (response.ok) {
        await fetchReassignments();
        alert('Message WhatsApp envoye avec succes!');
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const refreshVehicles = async (id: string) => {
    setRefreshingVehicles(id);
    try {
      const response = await fetch('/api/admin/quotes/reassign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchReassignments();
      }
    } catch (error) {
      console.error('Error refreshing vehicles:', error);
    } finally {
      setRefreshingVehicles(null);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/quotes/reassign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        await fetchReassignments();
        setSelectedReassignment(null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const formatCurrency = (value: number) => {
    // Format with regular spaces as thousand separators
    const formatted = Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `$${formatted}`;
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/quotes"
            className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-muted)]" />
          </Link>
          <div className="p-3 bg-mandarin/10 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-mandarin" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reassignations de devis</h1>
            <p className="text-[var(--text-muted)]">
              Vehicules non disponibles - Propositions alternatives
            </p>
          </div>
        </div>
        <Button onClick={fetchReassignments} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--surface)] rounded-lg">
              <Car className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Total</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.total || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">En attente</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.pending || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Contactes</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.contacted || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-jewel/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-jewel" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Acceptes</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.accepted || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Refuses</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.declined || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="contacted">Contactes</option>
          <option value="accepted">Acceptes</option>
          <option value="declined">Refuses</option>
        </select>
      </div>

      {/* Reassignments List */}
      <Card>
        {loading && reassignments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
          </div>
        ) : reassignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-jewel mb-4" />
            <p className="text-[var(--text-primary)] font-medium">Aucune reassignation en cours</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Les devis avec des vehicules non disponibles apparaitront ici
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {reassignments.map((r) => {
              const status = statusConfig[r.status as keyof typeof statusConfig] || statusConfig.pending;
              const isSending = sendingWhatsApp === r.id;
              const isRefreshing = refreshingVehicles === r.id;

              return (
                <div key={r.id} className="p-4 hover:bg-[var(--surface)]/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Vehicle & Customer Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} ${status.border} border`}>
                          <status.icon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>

                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {r.original_vehicle_make} {r.original_vehicle_model} {r.original_vehicle_year}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        Prix original: {formatCurrency(r.original_vehicle_price_usd)}
                      </p>

                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-[var(--text-primary)]">{r.customer_name}</span>
                        {r.customer_phone && (
                          <span className="text-[var(--text-muted)]">{r.customer_phone}</span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-red-400">
                        Raison: {r.reason}
                      </p>
                    </div>

                    {/* Middle: Proposed Vehicles */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-[var(--text-muted)]">
                          {r.proposed_vehicles?.length || 0} vehicules proposes
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshVehicles(r.id)}
                          disabled={isRefreshing}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        {r.proposed_vehicles?.slice(0, 3).map((v, i) => (
                          <Link
                            key={v.id}
                            href={`/cars/${v.id}`}
                            target="_blank"
                            className="relative group"
                          >
                            <div className="w-16 h-12 bg-[var(--surface)] rounded-lg overflow-hidden relative">
                              {v.images?.[0] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={v.images[0]}
                                  alt={`${v.make} ${v.model}`}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Car className="w-6 h-6 text-[var(--text-muted)]" />
                                </div>
                              )}
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-mandarin rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                              {i + 1}
                            </div>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <ExternalLink className="w-4 h-4 text-white" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReassignment(r)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {r.status === 'pending' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => sendWhatsApp(r.id)}
                          disabled={isSending}
                          className="bg-[#25D366] hover:bg-[#128C7E]"
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" />
                              WhatsApp
                            </>
                          )}
                        </Button>
                      )}
                      {r.status === 'contacted' && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(r.id, 'accepted')}
                            className="text-jewel hover:bg-jewel/10"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(r.id, 'declined')}
                            className="text-red-500 hover:bg-red-500/10"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--text-muted)]">
              Page {currentPage} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedReassignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Details de la reassignation
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedReassignment(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Original Vehicle */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Vehicule original</h4>
                <div className="bg-[var(--surface)] rounded-xl p-4">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {selectedReassignment.original_vehicle_make} {selectedReassignment.original_vehicle_model} {selectedReassignment.original_vehicle_year}
                  </p>
                  <p className="text-sm text-mandarin font-medium">
                    {formatCurrency(selectedReassignment.original_vehicle_price_usd)}
                  </p>
                  <p className="text-xs text-red-400 mt-2">
                    {selectedReassignment.reason}
                  </p>
                </div>
              </div>

              {/* Customer */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Client</h4>
                <div className="bg-[var(--surface)] rounded-xl p-4">
                  <p className="font-medium text-[var(--text-primary)]">{selectedReassignment.customer_name}</p>
                  {selectedReassignment.customer_phone && (
                    <p className="text-sm text-[var(--text-muted)]">{selectedReassignment.customer_phone}</p>
                  )}
                </div>
              </div>

              {/* Proposed Vehicles */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-[var(--text-muted)]">Vehicules proposes</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshVehicles(selectedReassignment.id)}
                    disabled={refreshingVehicles === selectedReassignment.id}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${refreshingVehicles === selectedReassignment.id ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedReassignment.proposed_vehicles?.map((v, i) => (
                    <Link
                      key={v.id}
                      href={`/cars/${v.id}`}
                      target="_blank"
                      className="flex items-center gap-4 p-3 bg-[var(--surface)] rounded-xl hover:bg-mandarin/10 transition-colors"
                    >
                      <div className="w-6 h-6 bg-mandarin rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="w-20 h-14 bg-[var(--card-bg)] rounded-lg overflow-hidden relative flex-shrink-0">
                        {v.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.images[0]}
                            alt={`${v.make} ${v.model}`}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Car className="w-8 h-8 text-[var(--text-muted)]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-primary)] truncate">
                          {v.make} {v.model} {v.year || ''}
                        </p>
                        <p className="text-sm text-mandarin font-medium">
                          {v.current_price_usd ? formatCurrency(v.current_price_usd) : 'Prix N/A'}
                        </p>
                        {v.mileage && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {v.mileage.toLocaleString()} km
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-jewel/10 text-jewel text-xs rounded-full">
                          {v.similarity_score}% similaire
                        </span>
                        <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    </Link>
                  ))}
                  {(!selectedReassignment.proposed_vehicles || selectedReassignment.proposed_vehicles.length === 0) && (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                      Aucun vehicule similaire trouve
                    </div>
                  )}
                </div>
              </div>

              {/* WhatsApp Status */}
              {selectedReassignment.whatsapp_sent_at && (
                <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[#25D366]">
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">Message WhatsApp envoye</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Le {format(new Date(selectedReassignment.whatsapp_sent_at), 'dd/MM/yyyy a HH:mm', { locale: fr })}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--card-border)]">
                {selectedReassignment.status === 'pending' && (
                  <Button
                    className="flex-1 bg-[#25D366] hover:bg-[#128C7E]"
                    onClick={() => {
                      sendWhatsApp(selectedReassignment.id);
                      setSelectedReassignment(null);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer via WhatsApp
                  </Button>
                )}
                {selectedReassignment.status === 'contacted' && (
                  <>
                    <Button
                      className="flex-1 bg-jewel hover:bg-jewel/90"
                      onClick={() => updateStatus(selectedReassignment.id, 'accepted')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Client accepte
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                      onClick={() => updateStatus(selectedReassignment.id, 'declined')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Client refuse
                    </Button>
                  </>
                )}
                {(selectedReassignment.status === 'accepted' || selectedReassignment.status === 'declined') && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedReassignment(null)}
                  >
                    Fermer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
