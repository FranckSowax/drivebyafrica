'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  Loader2,
  AlertTriangle,
  ArrowRightLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface Quote {
  id: string;
  quote_number: string;
  user_id: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number | null;
  vehicle_source: string;
  destination_id: string;
  destination_name: string;
  destination_country: string;
  shipping_type: string;
  shipping_cost_xaf: number | null;
  insurance_cost_xaf: number | null;
  inspection_fee_xaf: number | null;
  total_cost_xaf: number | null;
  status: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_currency?: string;
  // Price request fields
  quote_type?: 'quote' | 'price_request';
  admin_price_usd?: number | null;
  admin_notes?: string | null;
  notification_sent?: boolean;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  rateToUsd: number;
  countries: string[];
}

interface Stats {
  total: number;
  pending: number;
  validated: number;
  accepted: number;
  rejected: number;
  depositsToday: number;
  depositsThisMonth: number;
  depositsThisYear: number;
  totalDeposits: number;
  priceRequests?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusConfig = {
  pending: {
    label: 'Non validé',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: Clock,
  },
  validated: {
    label: 'En attente de paiement',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: CreditCard,
  },
  accepted: {
    label: 'Accepté',
    color: 'text-jewel',
    bg: 'bg-jewel/10',
    border: 'border-jewel/30',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Refusé',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: XCircle,
  },
  reassigned: {
    label: 'Réassigné',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: ArrowRightLeft,
  },
  price_received: {
    label: 'Prix envoyé',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: DollarSign,
  },
};

const countryFlags: Record<string, string> = {
  'Gabon': '🇬🇦',
  'Cameroun': '🇨🇲',
  'Congo': '🇨🇬',
  "Côte d'Ivoire": '🇨🇮',
  'Sénégal': '🇸🇳',
  'Togo': '🇹🇬',
  'Bénin': '🇧🇯',
  'Nigeria': '🇳🇬',
  'Ghana': '🇬🇭',
  'Kenya': '🇰🇪',
  'Tanzanie': '🇹🇿',
  'Afrique du Sud': '🇿🇦',
  'Maroc': '🇲🇦',
};

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [reassignModalQuote, setReassignModalQuote] = useState<Quote | null>(null);
  const [reassignReason, setReassignReason] = useState<string>('sold');
  const [isReassigning, setIsReassigning] = useState(false);
  // Price request state
  const [priceModalQuote, setPriceModalQuote] = useState<Quote | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [priceNotes, setPriceNotes] = useState<string>('');
  const [isSettingPrice, setIsSettingPrice] = useState(false);
  // Currency state for price conversion
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/admin/quotes?${params}`);
      const data = await response.json();

      if (data.quotes) {
        setQuotes(data.quotes);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Fetch currencies for price conversion
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await fetch('/api/admin/currencies');
        const data = await response.json();
        if (data.currencies) {
          setCurrencies(data.currencies);
        }
      } catch (error) {
        console.error('Error fetching currencies:', error);
      }
    };
    fetchCurrencies();
  }, []);

  // Get currency for a country
  const getCurrencyForCountry = (country: string): Currency | null => {
    // Find currency that includes this country
    const currency = currencies.find(c =>
      c.countries.some(ctry =>
        ctry.toLowerCase().includes(country.toLowerCase()) ||
        country.toLowerCase().includes(ctry.toLowerCase())
      )
    );
    return currency || currencies.find(c => c.code === 'XAF') || null;
  };

  // Convert USD to local currency
  const convertUsdToLocal = (usdAmount: number, country: string): { amount: number; currency: Currency } | null => {
    const currency = getCurrencyForCountry(country);
    if (!currency) return null;
    return {
      amount: usdAmount * currency.rateToUsd,
      currency,
    };
  };

  const updateQuoteStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch('/api/admin/quotes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (response.ok) {
        await fetchQuotes();
      }
    } catch (error) {
      console.error('Error updating quote:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  // Format with regular spaces as thousand separators
  const formatWithSpaces = (num: number): string => {
    return Math.round(num)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const formatCurrency = (value: number, currency: 'USD' | 'XAF' = 'XAF') => {
    if (currency === 'USD') {
      return `$${formatWithSpaces(value)}`;
    }
    return `${formatWithSpaces(value)} FCFA`;
  };

  const handleReassign = async () => {
    if (!reassignModalQuote) return;
    setIsReassigning(true);
    try {
      const response = await fetch('/api/admin/quotes/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: reassignModalQuote.id,
          reason: reassignReason,
        }),
      });

      if (response.ok) {
        await fetchQuotes();
        setReassignModalQuote(null);
        // Redirect to reassignments page
        window.location.href = '/admin/quotes/reassignments';
      } else {
        const data = await response.json();
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('Error reassigning quote:', error);
      alert('Erreur lors de la reassignation');
    } finally {
      setIsReassigning(false);
    }
  };

  // Handle setting price for price request
  const handleSetPrice = async () => {
    if (!priceModalQuote || !priceInput) return;

    const priceUsd = parseInt(priceInput);
    if (isNaN(priceUsd) || priceUsd <= 0) {
      alert('Veuillez entrer un prix valide');
      return;
    }

    setIsSettingPrice(true);
    try {
      const response = await fetch('/api/admin/quotes/set-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: priceModalQuote.id,
          priceUsd,
          notes: priceNotes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchQuotes();
        setPriceModalQuote(null);
        setPriceInput('');
        setPriceNotes('');
        alert('Prix défini et notification envoyée au client!');
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('Error setting price:', error);
      alert('Erreur lors de la définition du prix');
    } finally {
      setIsSettingPrice(false);
    }
  };

  // Check if quote is a price request
  const isPriceRequest = (quote: Quote) => quote.quote_type === 'price_request';

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-mandarin/10 rounded-xl">
            <FileText className="w-6 h-6 text-mandarin" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gestion des devis</h1>
            <p className="text-[var(--text-muted)]">
              {stats?.total || 0} devis au total
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/quotes/reassignments">
            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500/10">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Reassignations
            </Button>
          </Link>
          <Button onClick={fetchQuotes} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Non validés</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.pending || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">En attente paiement</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.validated || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-jewel/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-jewel" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Acceptés</p>
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
              <p className="text-xs text-[var(--text-muted)]">Refusés</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{stats?.rejected || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Deposit Stats */}
      <Card className="p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-mandarin" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Acomptes encaissés</h2>
          <span className="text-xs text-[var(--text-muted)]">(1 000 $ par devis accepté)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-[var(--surface)] rounded-xl">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Aujourd&apos;hui</span>
            </div>
            <p className="text-2xl font-bold text-mandarin">{formatCurrency(stats?.depositsToday || 0, 'USD')}</p>
          </div>
          <div className="text-center p-4 bg-[var(--surface)] rounded-xl">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Ce mois</span>
            </div>
            <p className="text-2xl font-bold text-jewel">{formatCurrency(stats?.depositsThisMonth || 0, 'USD')}</p>
          </div>
          <div className="text-center p-4 bg-[var(--surface)] rounded-xl">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Cette année</span>
            </div>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(stats?.depositsThisYear || 0, 'USD')}</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-mandarin/10 to-jewel/10 rounded-xl border border-mandarin/20">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <DollarSign className="w-4 h-4 text-mandarin" />
              <span className="text-xs text-[var(--text-muted)]">Total cumulé</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(stats?.totalDeposits || 0, 'USD')}</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher par numéro, marque ou modèle..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">Non validés</option>
          <option value="validated">En attente paiement</option>
          <option value="accepted">Acceptés</option>
          <option value="rejected">Refusés</option>
          <option value="reassigned">Réassignés</option>
          <option value="price_request">Demandes de prix</option>
        </select>
      </div>

      {/* Quotes Table */}
      <Card>
        {loading && quotes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mb-4" />
            <p className="text-[var(--text-muted)]">Aucun devis trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Numéro</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Véhicule</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Destination</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Statut</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => {
                  const status = statusConfig[quote.status as keyof typeof statusConfig] || statusConfig.pending;
                  const flag = countryFlags[quote.destination_country] || '🌍';
                  const isUpdating = updatingId === quote.id;

                  return (
                    <tr
                      key={quote.id}
                      className="border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-mandarin">{quote.quote_number}</span>
                            {isPriceRequest(quote) && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-500 rounded">
                                DEMANDE PRIX
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">
                            {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {quote.vehicle_make} {quote.vehicle_model}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {quote.vehicle_year} - {quote.vehicle_price_usd ? formatCurrency(quote.vehicle_price_usd, 'USD') : <span className="text-purple-500">Prix à définir</span>}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {quote.customer_name || 'Utilisateur'}
                          </p>
                          {quote.customer_email && (
                            <p className="text-xs text-[var(--text-muted)]">{quote.customer_email}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{flag}</span>
                          <div>
                            <p className="text-sm text-[var(--text-primary)]">{quote.destination_name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{quote.destination_country}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {quote.total_cost_xaf ? formatCurrency(quote.total_cost_xaf) : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} ${status.border} border`}>
                          <status.icon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-mandarin" />
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedQuote(quote)}
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {/* Price request or quote without price: show Set Price button for any non-final status */}
                              {(isPriceRequest(quote) || !quote.vehicle_price_usd) && ['pending', 'validated', 'accepted'].includes(quote.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPriceModalQuote(quote);
                                    setPriceInput('');
                                    setPriceNotes('');
                                  }}
                                  className="text-purple-500 hover:text-purple-600"
                                  title="Définir le prix"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              )}
                              {/* Note: L'utilisateur valide/refuse lui-même le devis, pas l'admin */}
                              {quote.status === 'validated' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuoteStatus(quote.id, 'accepted')}
                                  className="text-jewel hover:text-jewel/80"
                                  title="Marquer comme paye ($1000)"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--text-muted)]">
              Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
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
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Devis {selectedQuote.quote_number}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedQuote(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Vehicle Info */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Véhicule</h4>
                <div className="bg-[var(--surface)] rounded-xl p-4">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {selectedQuote.vehicle_make} {selectedQuote.vehicle_model} {selectedQuote.vehicle_year}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Prix: {selectedQuote.vehicle_price_usd ? formatCurrency(selectedQuote.vehicle_price_usd, 'USD') : <span className="text-purple-500">À définir</span>}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Source: {selectedQuote.vehicle_source}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Client</h4>
                <div className="bg-[var(--surface)] rounded-xl p-4 space-y-1">
                  <p className="font-medium text-[var(--text-primary)]">{selectedQuote.customer_name || 'Utilisateur'}</p>
                  {selectedQuote.customer_email && (
                    <p className="text-sm text-[var(--text-muted)]">{selectedQuote.customer_email}</p>
                  )}
                  {selectedQuote.customer_phone && (
                    <p className="text-sm text-[var(--text-muted)]">{selectedQuote.customer_phone}</p>
                  )}
                </div>
              </div>

              {/* Destination */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Destination</h4>
                <div className="bg-[var(--surface)] rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{countryFlags[selectedQuote.destination_country] || '🌍'}</span>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{selectedQuote.destination_name}</p>
                      <p className="text-sm text-[var(--text-muted)]">{selectedQuote.destination_country}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown - only show if not a price request without costs */}
              {(selectedQuote.shipping_cost_xaf || selectedQuote.quote_type !== 'price_request') && (
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">Détails du coût</h4>
                  <div className="bg-[var(--surface)] rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Transport ({selectedQuote.shipping_type})</span>
                      <span className="text-[var(--text-primary)]">{selectedQuote.shipping_cost_xaf ? formatCurrency(selectedQuote.shipping_cost_xaf) : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Assurance</span>
                      <span className="text-[var(--text-primary)]">{selectedQuote.insurance_cost_xaf ? formatCurrency(selectedQuote.insurance_cost_xaf) : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">Frais d&apos;inspection</span>
                      <span className="text-[var(--text-primary)]">{selectedQuote.inspection_fee_xaf ? formatCurrency(selectedQuote.inspection_fee_xaf) : '-'}</span>
                    </div>
                    <div className="border-t border-[var(--card-border)] pt-2 mt-2 flex justify-between font-semibold">
                      <span className="text-[var(--text-primary)]">Total</span>
                      <span className="text-mandarin">{selectedQuote.total_cost_xaf ? formatCurrency(selectedQuote.total_cost_xaf) : '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Request Info - Show for price requests OR quotes without price */}
              {(isPriceRequest(selectedQuote) || !selectedQuote.vehicle_price_usd) && ['pending', 'validated', 'accepted'].includes(selectedQuote.status) && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <p className="text-sm text-purple-500 font-medium">Prix non défini</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 mb-3">
                    Définissez le prix FOB pour ce véhicule et notifiez le client.
                  </p>
                  <Button
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                    onClick={() => {
                      setSelectedQuote(null);
                      setPriceModalQuote(selectedQuote);
                      setPriceInput('');
                      setPriceNotes('');
                    }}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Définir le prix
                  </Button>
                </div>
              )}

              {/* Dates */}
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">Créé le: </span>
                  <span className="text-[var(--text-primary)]">
                    {format(new Date(selectedQuote.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Valide jusqu&apos;au: </span>
                  <span className="text-[var(--text-primary)]">
                    {format(new Date(selectedQuote.valid_until), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 border-t border-[var(--card-border)]">
                {(selectedQuote.status === 'pending' || selectedQuote.status === 'validated') && (
                  <Button
                    variant="outline"
                    className="w-full border-orange-500 text-orange-500 hover:bg-orange-500/10"
                    onClick={() => {
                      setSelectedQuote(null);
                      setReassignModalQuote(selectedQuote);
                    }}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Réassigner (véhicule non disponible)
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedQuote(null)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignModalQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Vehicule non disponible
                  </h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setReassignModalQuote(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[var(--surface)] rounded-xl p-4">
                <p className="font-semibold text-[var(--text-primary)]">
                  {reassignModalQuote.vehicle_make} {reassignModalQuote.vehicle_model} {reassignModalQuote.vehicle_year}
                </p>
                <p className="text-sm text-mandarin">
                  {reassignModalQuote.vehicle_price_usd ? formatCurrency(reassignModalQuote.vehicle_price_usd, 'USD') : 'Prix non défini'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Client: {reassignModalQuote.customer_name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Raison de l&apos;indisponibilite
                </label>
                <select
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                >
                  <option value="sold">Vehicule vendu sur une autre marketplace</option>
                  <option value="unavailable">Vehicule non disponible</option>
                  <option value="priority_conflict">Un autre client a paye en premier</option>
                  <option value="price_change">Changement de prix significatif</option>
                  <option value="other">Autre raison</option>
                </select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-[var(--text-primary)]">
                  <strong>Le systeme va automatiquement:</strong>
                </p>
                <ul className="text-xs text-[var(--text-muted)] mt-2 space-y-1 list-disc list-inside">
                  <li>Rechercher 3 vehicules similaires (meme marque, modele, budget)</li>
                  <li>Creer un dossier de reassignation</li>
                  <li>Vous permettre d&apos;envoyer les alternatives via WhatsApp</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReassignModalQuote(null)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={handleReassign}
                  disabled={isReassigning}
                >
                  {isReassigning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recherche...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Reassigner
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Price Modal for Price Requests */}
      {priceModalQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    Définir le prix
                  </h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPriceModalQuote(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[var(--surface)] rounded-xl p-4">
                <p className="font-semibold text-[var(--text-primary)]">
                  {priceModalQuote.vehicle_make} {priceModalQuote.vehicle_model} {priceModalQuote.vehicle_year}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Client: {priceModalQuote.customer_name || 'Utilisateur'}
                </p>
                {priceModalQuote.customer_phone && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Tel: {priceModalQuote.customer_phone}
                  </p>
                )}
                {priceModalQuote.destination_country && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Destination: {priceModalQuote.destination_country}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Prix FOB (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Ex: 15000"
                    className="w-full pl-8 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-purple-500 focus:outline-none"
                  />
                </div>
                {/* Conversion en devise locale */}
                {priceInput && priceModalQuote.destination_country && (() => {
                  const conversion = convertUsdToLocal(parseFloat(priceInput), priceModalQuote.destination_country);
                  if (conversion) {
                    return (
                      <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-[var(--text-primary)]">
                          <span className="text-[var(--text-muted)]">Prix client ({conversion.currency.code}):</span>{' '}
                          <span className="font-bold text-green-500">
                            {conversion.currency.symbol} {conversion.amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Taux: 1 USD = {conversion.currency.rateToUsd.toLocaleString('fr-FR')} {conversion.currency.code}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={priceNotes}
                  onChange={(e) => setPriceNotes(e.target.value)}
                  placeholder="Informations supplémentaires sur le véhicule..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-sm text-[var(--text-primary)]">
                  <strong>Le client sera notifié par:</strong>
                </p>
                <ul className="text-xs text-[var(--text-muted)] mt-2 space-y-1 list-disc list-inside">
                  <li>Notification dans son tableau de bord</li>
                  <li>Message WhatsApp avec le prix et le lien vers le véhicule</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPriceModalQuote(null)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-purple-500 hover:bg-purple-600"
                  onClick={handleSetPrice}
                  disabled={isSettingPrice || !priceInput}
                >
                  {isSettingPrice ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Envoyer le prix
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
