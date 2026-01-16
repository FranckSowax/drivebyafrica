'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Save,
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
  Globe,
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

  // Filter currencies based on search query
  const filteredCurrencies = currencies.filter(
    (currency) =>
      currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.countries.some((c) =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // Group currencies by type
  const cfaZone = filteredCurrencies.filter((c) =>
    ['XAF', 'XOF'].includes(c.code)
  );
  const otherCurrencies = filteredCurrencies.filter(
    (c) => !['XAF', 'XOF'].includes(c.code)
  );

  // Fetch currencies from API
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await fetch('/api/admin/currencies?withHistory=true');
        const data = await response.json();

        if (data.currencies) {
          setCurrencies(data.currencies);
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

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
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

  const CurrencyCard = ({ currency }: { currency: CurrencyRate }) => {
    const rateChange = getRateChange(currency);
    const isEditing = editingId === currency.id;
    const showingHistory = showHistory === currency.id;

    return (
      <Card
        className={`relative ${!currency.isActive ? 'opacity-60' : ''}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-mandarin/10 flex items-center justify-center">
              <span className="text-lg font-bold text-mandarin">
                {currency.symbol}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-primary)]">
                {currency.code}
              </h3>
              <p className="text-sm text-[var(--text-muted)]">{currency.name}</p>
            </div>
          </div>
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

        {/* Rate */}
        <div className="mb-4">
          <p className="text-sm text-[var(--text-muted)] mb-1">
            Taux pour 1 USD
          </p>
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  step="0.01"
                  className="flex-1 px-3 py-2 bg-[var(--surface)] border border-mandarin rounded-lg text-[var(--text-primary)] focus:outline-none"
                  autoFocus
                />
                <span className="text-[var(--text-muted)]">{currency.symbol}</span>
              </div>
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Note (optionnel)"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => saveRate(currency)}
                  disabled={isSaving}
                  leftIcon={
                    isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )
                  }
                >
                  Enregistrer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditing}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {currency.rateToUsd.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}
              </span>
              <span className="text-[var(--text-muted)]">{currency.symbol}</span>
              {rateChange && (
                <span
                  className={`flex items-center gap-1 text-sm ${
                    rateChange.isPositive ? 'text-jewel' : 'text-red-500'
                  }`}
                >
                  {rateChange.isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {rateChange.percent}%
                </span>
              )}
              <button
                onClick={() => startEditing(currency)}
                className="ml-auto p-2 hover:bg-[var(--surface)] rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
          )}
        </div>

        {/* Countries */}
        {currency.countries.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">Pays</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {currency.countries.map((country) => (
                <span
                  key={country}
                  className="px-2 py-1 bg-[var(--surface)] rounded text-xs text-[var(--text-secondary)]"
                >
                  {country}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Last update */}
        <div className="flex items-center justify-between text-sm text-[var(--text-muted)] pt-3 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {formatDistanceToNow(new Date(currency.updatedAt), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
          <button
            onClick={() =>
              setShowHistory(showingHistory ? null : currency.id)
            }
            className="flex items-center gap-1 hover:text-mandarin transition-colors"
          >
            <History className="w-3 h-3" />
            <span>Historique</span>
          </button>
        </div>

        {/* History Panel */}
        {showingHistory && currency.history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Historique des modifications
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {currency.history.slice(0, 10).map((h, i) => (
                <div
                  key={h.id || i}
                  className="flex items-center justify-between text-sm p-2 bg-[var(--surface)] rounded-lg"
                >
                  <div>
                    <span className="text-[var(--text-muted)]">
                      {h.old_rate.toLocaleString('fr-FR')}
                    </span>
                    <span className="mx-2 text-[var(--text-muted)]">→</span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {h.new_rate.toLocaleString('fr-FR')}
                    </span>
                    {h.note && (
                      <span className="ml-2 text-[var(--text-muted)] italic">
                        "{h.note}"
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {format(new Date(h.changed_at), 'dd/MM/yy HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  };

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
          </div>
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
                l'affichage.
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
            {filteredCurrencies.length} devise
            {filteredCurrencies.length > 1 ? 's' : ''} sur {currencies.length}
          </p>
        </div>

        {/* CFA Zone */}
        {cfaZone.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-mandarin/10 flex items-center justify-center text-mandarin">
                F
              </span>
              Zone Franc CFA
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cfaZone.map((currency) => (
                <CurrencyCard key={currency.id} currency={currency} />
              ))}
            </div>
          </div>
        )}

        {/* Other Currencies */}
        {otherCurrencies.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-jewel/10 flex items-center justify-center text-jewel">
                <DollarSign className="w-4 h-4" />
              </span>
              Autres devises
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherCurrencies.map((currency) => (
                <CurrencyCard key={currency.id} currency={currency} />
              ))}
            </div>
          </div>
        )}

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
        <Card className="mt-8">
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
