'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, BarChart3, Check, Percent, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { authFetch } from '@/lib/supabase/auth-helpers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminRoute {
  id: string;
  destination_id: string;
  destination_name: string;
  destination_country: string;
  destination_flag: string;
  korea_cost_usd: number;
  china_cost_usd: number;
  dubai_cost_usd: number;
  korea_cost_40ft_usd: number;
  china_cost_40ft_usd: number;
  dubai_cost_40ft_usd: number;
  is_active: boolean;
}

interface PartnerQuoteRoute {
  destination_id: string;
  destination_name: string;
  korea_cost_usd: number | null;
  china_cost_usd: number | null;
  dubai_cost_usd: number | null;
  korea_cost_40ft_usd: number | null;
  china_cost_40ft_usd: number | null;
  dubai_cost_40ft_usd: number | null;
  is_active: boolean;
}

interface PartnerQuoteData {
  partner: { id: string; company_name: string; contact_person: string; country: string };
  quote: { id: string; submitted_at: string; notes: string | null };
  routes: PartnerQuoteRoute[];
}

type Origin = 'korea' | 'china' | 'dubai';

export default function AdminComparisonPage() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [adminRates, setAdminRates] = useState<AdminRoute[]>([]);
  const [partnerQuotes, setPartnerQuotes] = useState<PartnerQuoteData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [applyingCell, setApplyingCell] = useState<string | null>(null);

  // Markup modal state
  const [markupModal, setMarkupModal] = useState<{
    destId: string;
    destName: string;
    origin: Origin;
    originLabel: string;
    basePrice: number;
    adminPrice: number;
    is40ft?: boolean;
  } | null>(null);
  const [markupPercent, setMarkupPercent] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch('/api/admin/shipping/comparison');
        const data = await res.json();
        setAdminRates(data.adminRates || []);
        setPartnerQuotes(data.partnerQuotes || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredRates = useMemo(
    () =>
      adminRates.filter(
        (r) =>
          r.destination_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.destination_country.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [adminRates, searchQuery]
  );

  // Get price diff class
  const getDiffClass = (adminPrice: number, partnerPrice: number | null): string => {
    if (partnerPrice === null || partnerPrice === 0) return 'text-[var(--text-muted)]';
    if (partnerPrice < adminPrice) return 'text-jewel font-semibold';
    if (partnerPrice > adminPrice) return 'text-red-500 font-semibold';
    return 'text-[var(--text-primary)]';
  };

  // Open markup modal before applying
  const openMarkupModal = (destId: string, destName: string, origin: Origin, originLabel: string, basePrice: number, adminPrice: number, is40ft = false) => {
    setMarkupPercent(0);
    setMarkupModal({ destId, destName, origin, originLabel, basePrice, adminPrice, is40ft });
  };

  const getFinalPrice = () => {
    if (!markupModal) return 0;
    return Math.round(markupModal.basePrice * (1 + markupPercent / 100));
  };

  const confirmApplyRate = () => {
    if (!markupModal) return;
    applyRate(markupModal.destId, markupModal.origin, getFinalPrice(), markupModal.is40ft);
    setMarkupModal(null);
  };

  // Apply a partner price to admin rates
  const applyRate = async (destId: string, origin: Origin, value: number, is40ft?: boolean) => {
    const cellKey = `${destId}-${origin}${is40ft ? '-40ft' : ''}`;
    setApplyingCell(cellKey);
    try {
      const field = is40ft ? `${origin}_cost_40ft_usd` : `${origin}_cost_usd`;
      const updatedRoutes = adminRates.map((r) =>
        r.destination_id === destId ? { ...r, [field]: value } : r
      );

      const res = await authFetch('/api/admin/shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: updatedRoutes }),
      });

      if (!res.ok) throw new Error('Failed');

      setAdminRates(updatedRoutes);
      toast.success(`Tarif mis à jour: ${destId} ${origin} → $${value}`);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setApplyingCell(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-8">
        <div className="container mx-auto px-4 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
        </div>
      </div>
    );
  }

  type ContainerSize = '20ft' | '40ft';

  const origins: { key: Origin; label: string; flag: string }[] = [
    { key: 'korea', label: 'Corée', flag: '🇰🇷' },
    { key: 'china', label: 'Chine', flag: '🇨🇳' },
    { key: 'dubai', label: 'Dubaï', flag: '🇦🇪' },
  ];

  const getAdminPrice = (rate: AdminRoute, origin: Origin, size: ContainerSize): number => {
    if (size === '40ft') {
      const field = `${origin}_cost_40ft_usd` as keyof AdminRoute;
      return (rate[field] as number) || 0;
    }
    const field = `${origin}_cost_usd` as keyof AdminRoute;
    return rate[field] as number;
  };

  const getPartnerPriceBySize = (
    partnerData: PartnerQuoteData,
    destId: string,
    origin: Origin,
    size: ContainerSize
  ): number | null => {
    const route = partnerData.routes.find((r) => r.destination_id === destId);
    if (!route || !route.is_active) return null;
    const field = size === '40ft'
      ? `${origin}_cost_40ft_usd` as keyof PartnerQuoteRoute
      : `${origin}_cost_usd` as keyof PartnerQuoteRoute;
    return route[field] as number | null;
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/shipping"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-mandarin transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au transport
          </Link>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            <BarChart3 className="inline-block w-8 h-8 text-mandarin mr-2 -mt-1" />
            <span className="text-mandarin">Comparaison</span> des tarifs
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Comparez les devis partenaires avec vos tarifs actuels
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-jewel" />
            <span className="text-[var(--text-muted)]">Moins cher que admin</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[var(--text-muted)]">Plus cher que admin</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-[var(--text-muted)]">Pas de prix</span>
          </div>
        </div>

        {partnerQuotes.length === 0 ? (
          <Card className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-primary)] font-medium">Aucun devis partenaire</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Les devis soumis par vos partenaires apparaîtront ici
            </p>
          </Card>
        ) : (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Rechercher une destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
                />
              </div>
            </div>

            {/* Comparison per origin */}
            {origins.map((origin) => (
              <Card key={origin.key} className="mb-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                  {origin.flag} {origin.label}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--card-border)]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)] sticky left-0 bg-[var(--card-bg)] z-10 min-w-[200px]">
                          Destination
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-mandarin min-w-[100px]">
                          Admin
                        </th>
                        {partnerQuotes.map((pq) => (
                          <th key={pq.partner.id} className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)] min-w-[140px]">
                            <div>{pq.partner.company_name}</div>
                            <div className="text-xs font-normal">
                              {format(new Date(pq.quote.submitted_at), 'dd/MM/yy', { locale: fr })}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRates.map((rate) => (
                        (['20ft', '40ft'] as ContainerSize[]).map((size) => {
                          const adminPrice = getAdminPrice(rate, origin.key, size);
                          const is40ft = size === '40ft';

                          return (
                            <tr
                              key={`${rate.destination_id}-${size}`}
                              className={`border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/30 ${is40ft ? 'bg-mandarin/[0.03]' : ''}`}
                            >
                              <td className={`py-2 px-4 sticky left-0 z-10 ${is40ft ? 'bg-mandarin/[0.03]' : 'bg-[var(--card-bg)]'}`}>
                                {!is40ft ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{rate.destination_flag}</span>
                                    <div>
                                      <p className="text-sm font-medium text-[var(--text-primary)]">{rate.destination_name}</p>
                                      <p className="text-xs text-[var(--text-muted)]">{rate.destination_country}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="pl-8">
                                    <span className="text-xs font-medium text-mandarin/70">↳ 40ft</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-4 text-center font-medium text-mandarin text-sm">
                                {adminPrice > 0 ? `$${adminPrice.toLocaleString()}` : '—'}
                              </td>
                              {partnerQuotes.map((pq) => {
                                const partnerPrice = getPartnerPriceBySize(pq, rate.destination_id, origin.key, size);
                                const cellKey = `${rate.destination_id}-${origin.key}${is40ft ? '-40ft' : ''}`;
                                const isApplying = applyingCell === cellKey;

                                return (
                                  <td key={pq.partner.id} className="py-2 px-4 text-center">
                                    {partnerPrice !== null && partnerPrice > 0 ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <span className={`text-sm ${getDiffClass(adminPrice, partnerPrice)}`}>
                                          ${partnerPrice.toLocaleString()}
                                        </span>
                                        {partnerPrice !== adminPrice && (
                                          <button
                                            onClick={() => openMarkupModal(rate.destination_id, rate.destination_name, origin.key, `${origin.label} ${size}`, partnerPrice, adminPrice, is40ft)}
                                            disabled={isApplying}
                                            className="p-1 rounded hover:bg-mandarin/10 text-mandarin transition-colors"
                                            title="Appliquer ce tarif"
                                          >
                                            {isApplying ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <Check className="w-3 h-3" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[var(--text-muted)]">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Markup Modal */}
      {markupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMarkupModal(null)} />
          <div className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <button
              onClick={() => setMarkupModal(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)]"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">
              Appliquer le tarif
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {markupModal.destName} — {markupModal.originLabel}
            </p>

            {/* Current prices */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-[var(--surface)] rounded-lg">
                <p className="text-xs text-[var(--text-muted)]">Tarif admin actuel</p>
                <p className="text-lg font-bold text-mandarin">${markupModal.adminPrice.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-[var(--surface)] rounded-lg">
                <p className="text-xs text-[var(--text-muted)]">Prix partenaire</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">${markupModal.basePrice.toLocaleString()}</p>
              </div>
            </div>

            {/* Markup slider */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
                <Percent className="w-4 h-4" />
                Marge à ajouter
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(parseInt(e.target.value))}
                  className="flex-1 accent-mandarin"
                />
                <div className="relative w-20">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-3 pr-8 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-center text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">%</span>
                </div>
              </div>
              {/* Quick presets */}
              <div className="flex gap-2 mt-3">
                {[0, 5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setMarkupPercent(pct)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      markupPercent === pct
                        ? 'bg-mandarin text-white'
                        : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {pct === 0 ? 'Brut' : `+${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Final price */}
            <div className="p-4 bg-mandarin/10 rounded-xl mb-6">
              <p className="text-sm text-[var(--text-muted)]">Nouveau tarif admin</p>
              <p className="text-2xl font-bold text-mandarin">
                ${getFinalPrice().toLocaleString()}
              </p>
              {markupPercent > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  ${markupModal.basePrice.toLocaleString()} + {markupPercent}% = ${getFinalPrice().toLocaleString()}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setMarkupModal(null)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={confirmApplyRate}>
                Appliquer ${getFinalPrice().toLocaleString()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
