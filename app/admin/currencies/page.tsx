'use client';

import React, { useState, useEffect, Fragment } from 'react';
import {
  DollarSign,
  Loader2,
  AlertCircle,
  Search,
  Clock,
  History,
  Edit3,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CurrencyRate {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rateToUsd: number;
  countries: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  history: {
    id: string;
    old_rate: number;
    new_rate: number;
    changed_at: string;
    note: string;
  }[];
}

export default function AdminCurrenciesPage() {
  const toast = useToast();
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Filter currencies based on search query
  const filteredCurrencies = currencies.filter(
    (currency) =>
      currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.countries.some((c) =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // Fetch currencies from API
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await fetch('/api/admin/currencies?withHistory=true');
        const data = await response.json();

        if (data.currencies) {
          setCurrencies(data.currencies);
          // Find the most recent update
          const mostRecent = data.currencies.reduce(
            (latest: string | null, c: CurrencyRate) => {
              if (!latest) return c.updatedAt;
              return new Date(c.updatedAt) > new Date(latest) ? c.updatedAt : latest;
            },
            null
          );
          setLastUpdatedAt(mostRecent);
        }
      } catch (error) {
        console.error('Error fetching currencies:', error);
        toast.error('Erreur lors du chargement des devises');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrencies();
  }, []);

  // Seed all African currencies
  const seedCurrencies = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch('/api/admin/currencies', {
        method: 'PATCH',
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        // Refresh the list
        const refreshResponse = await fetch('/api/admin/currencies?withHistory=true');
        const refreshData = await refreshResponse.json();
        if (refreshData.currencies) {
          setCurrencies(refreshData.currencies);
        }
      } else {
        toast.error(data.error || 'Erreur lors de l\'ajout des devises');
      }
    } catch (error) {
      console.error('Error seeding currencies:', error);
      toast.error('Erreur lors de l\'ajout des devises');
    } finally {
      setIsSeeding(false);
    }
  };

  const startEditing = (currency: CurrencyRate) => {
    setEditingId(currency.id);
    setEditRate(currency.rateToUsd.toString());
    setEditNote('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditRate('');
    setEditNote('');
  };

  const saveRate = async (currency: CurrencyRate) => {
    const newRate = parseFloat(editRate);

    if (isNaN(newRate) || newRate <= 0) {
      toast.error('Le taux doit être un nombre positif');
      return;
    }

    if (newRate === currency.rateToUsd) {
      cancelEditing();
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/currencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currency.code,
          rateToUsd: newRate,
          note: editNote || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      // Update local state
      setCurrencies((prev) =>
        prev.map((c) =>
          c.id === currency.id
            ? {
                ...c,
                rateToUsd: newRate,
                updatedAt: new Date().toISOString(),
                history: [
                  {
                    id: 'new',
                    old_rate: currency.rateToUsd,
                    new_rate: newRate,
                    changed_at: new Date().toISOString(),
                    note: editNote,
                  },
                  ...c.history,
                ],
              }
            : c
        )
      );

      setLastUpdatedAt(new Date().toISOString());
      toast.success(`Taux ${currency.code} mis à jour`);
      cancelEditing();
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (currency: CurrencyRate) => {
    try {
      const response = await fetch(
        `/api/admin/currencies?code=${currency.code}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to toggle');
      }

      const data = await response.json();

      setCurrencies((prev) =>
        prev.map((c) =>
          c.id === currency.id ? { ...c, isActive: data.isActive } : c
        )
      );

      toast.success(
        data.isActive ? `${currency.code} activé` : `${currency.code} désactivé`
      );
    } catch (error) {
      console.error('Error toggling currency:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const getRateChange = (currency: CurrencyRate) => {
    if (currency.history.length < 1) return null;
    const lastChange = currency.history[0];
    const diff = lastChange.new_rate - lastChange.old_rate;
    const percent = ((diff / lastChange.old_rate) * 100).toFixed(2);
    return { diff, percent, isPositive: diff > 0 };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              <span className="text-mandarin">Taux</span> de Change
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Gérez les taux de conversion des devises africaines
            </p>
            {lastUpdatedAt && (
              <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-muted)]">
                <Clock className="w-4 h-4" />
                <span>
                  Dernière mise à jour : {format(new Date(lastUpdatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  {' '}({formatDistanceToNow(new Date(lastUpdatedAt), { addSuffix: true, locale: fr })})
                </span>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            onClick={seedCurrencies}
            disabled={isSeeding}
            leftIcon={
              isSeeding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )
            }
          >
            {isSeeding ? 'Ajout en cours...' : 'Ajouter devises manquantes'}
          </Button>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-royal-blue/10 border-royal-blue/20">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-royal-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[var(--text-primary)] font-medium">
                Taux de conversion USD → Devises locales
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Ces taux sont utilisés pour afficher les prix des véhicules et
                les estimations de transport dans la devise sélectionnée par
                l'utilisateur. Les prix sont stockés en USD et convertis à
                l'affichage. Cliquez sur le taux pour le modifier.
              </p>
            </div>
          </div>
        </Card>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher une devise ou un pays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
            />
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {filteredCurrencies.length} devise{filteredCurrencies.length > 1 ? 's' : ''} sur {currencies.length}
          </p>
        </div>

        {/* Currencies Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    Devise
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    Symbole
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    Taux (1 USD =)
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    Pays
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    Mis à jour
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    Actif
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCurrencies.map((currency) => {
                  const isEditing = editingId === currency.id;
                  const rateChange = getRateChange(currency);
                  const isShowingHistory = showHistory === currency.id;

                  return (
                    <Fragment key={currency.id}>
                      <tr
                        className={`border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/50 transition-colors ${
                          !currency.isActive ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Currency Code & Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-mandarin/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-mandarin">
                                {currency.symbol}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">
                                {currency.code}
                              </p>
                              <p className="text-sm text-[var(--text-muted)]">
                                {currency.name}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Symbol */}
                        <td className="py-4 px-4 text-center">
                          <span className="text-lg font-medium text-[var(--text-primary)]">
                            {currency.symbol}
                          </span>
                        </td>

                        {/* Rate */}
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={editRate}
                                  onChange={(e) => setEditRate(e.target.value)}
                                  step="0.01"
                                  className="w-32 px-3 py-2 bg-[var(--surface)] border border-mandarin rounded-lg text-center text-[var(--text-primary)] focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveRate(currency);
                                    if (e.key === 'Escape') cancelEditing();
                                  }}
                                />
                                <button
                                  onClick={() => saveRate(currency)}
                                  disabled={isSaving}
                                  className="p-2 bg-jewel text-white rounded-lg hover:bg-jewel/90 transition-colors disabled:opacity-50"
                                >
                                  {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-2 bg-[var(--surface)] text-[var(--text-muted)] rounded-lg hover:bg-[var(--card-border)] transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startEditing(currency)}
                                  className="group flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-lg hover:bg-mandarin/10 transition-colors"
                                >
                                  <span className="font-mono font-medium text-[var(--text-primary)]">
                                    {currency.rateToUsd.toLocaleString('fr-FR', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 4,
                                    })}
                                  </span>
                                  <Edit3 className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                {rateChange && (
                                  <span
                                    className={`flex items-center gap-1 text-xs ${
                                      rateChange.isPositive ? 'text-jewel' : 'text-red-500'
                                    }`}
                                  >
                                    {rateChange.isPositive ? (
                                      <TrendingUp className="w-3 h-3" />
                                    ) : (
                                      <TrendingDown className="w-3 h-3" />
                                    )}
                                    {rateChange.percent}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Countries */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {currency.countries.slice(0, 3).map((country) => (
                              <span
                                key={country}
                                className="px-2 py-0.5 bg-[var(--surface)] rounded text-xs text-[var(--text-secondary)]"
                              >
                                {country}
                              </span>
                            ))}
                            {currency.countries.length > 3 && (
                              <span className="px-2 py-0.5 bg-[var(--surface)] rounded text-xs text-[var(--text-muted)]">
                                +{currency.countries.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Last Update */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm text-[var(--text-muted)]">
                              {formatDistanceToNow(new Date(currency.updatedAt), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </span>
                            <button
                              onClick={() =>
                                setShowHistory(isShowingHistory ? null : currency.id)
                              }
                              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-mandarin transition-colors"
                            >
                              <History className="w-3 h-3" />
                              Historique
                            </button>
                          </div>
                        </td>

                        {/* Active Toggle */}
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => toggleActive(currency)}
                              className={`w-12 h-6 rounded-full transition-colors ${
                                currency.isActive ? 'bg-jewel' : 'bg-[var(--card-border)]'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                  currency.isActive ? 'translate-x-6' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* History Row */}
                      {isShowingHistory && currency.history.length > 0 && (
                        <tr key={`${currency.id}-history`}>
                          <td colSpan={6} className="px-4 py-4 bg-[var(--surface)]/50">
                            <div className="ml-12">
                              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                                Historique des modifications - {currency.code}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {currency.history.slice(0, 6).map((h, i) => (
                                  <div
                                    key={h.id || i}
                                    className="flex items-center justify-between text-sm p-2 bg-[var(--background)] rounded-lg"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[var(--text-muted)]">
                                        {h.old_rate.toLocaleString('fr-FR')}
                                      </span>
                                      <span className="text-[var(--text-muted)]">→</span>
                                      <span className="text-[var(--text-primary)] font-medium">
                                        {h.new_rate.toLocaleString('fr-FR')}
                                      </span>
                                    </div>
                                    <span className="text-xs text-[var(--text-muted)]">
                                      {format(new Date(h.changed_at), 'dd/MM HH:mm')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Empty State */}
        {filteredCurrencies.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">
              Aucune devise trouvée pour "{searchQuery}"
            </p>
          </div>
        )}

        {/* Summary Card */}
        <Card className="mt-6">
          <h3 className="font-bold text-[var(--text-primary)] mb-4">
            Récapitulatif des devises
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[var(--surface)] rounded-lg">
              <p className="text-sm text-[var(--text-muted)]">Total devises</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {currencies.length}
              </p>
            </div>
            <div className="p-4 bg-[var(--surface)] rounded-lg">
              <p className="text-sm text-[var(--text-muted)]">Devises actives</p>
              <p className="text-2xl font-bold text-jewel">
                {currencies.filter((c) => c.isActive).length}
              </p>
            </div>
            <div className="p-4 bg-[var(--surface)] rounded-lg">
              <p className="text-sm text-[var(--text-muted)]">Zone CFA</p>
              <p className="text-2xl font-bold text-mandarin">
                {currencies.filter((c) => ['XAF', 'XOF'].includes(c.code)).length}
              </p>
            </div>
            <div className="p-4 bg-[var(--surface)] rounded-lg">
              <p className="text-sm text-[var(--text-muted)]">Pays couverts</p>
              <p className="text-2xl font-bold text-royal-blue">
                {new Set(currencies.flatMap((c) => c.countries)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
