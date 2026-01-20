'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Car,
  MapPin,
  Calendar,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/Toast';
import { QuotePDFModal } from '@/components/vehicles/QuotePDFModal';
import { QuoteValidationModal } from '@/components/vehicles/QuoteValidationModal';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { getExportTax } from '@/lib/utils/pricing';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';

interface Quote {
  id: string;
  quote_number: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number;
  vehicle_source: 'korea' | 'china' | 'dubai';
  destination_id: string;
  destination_name: string;
  destination_country: string;
  shipping_type?: 'container' | 'groupage';
  shipping_cost_xaf: number;
  insurance_cost_xaf: number;
  inspection_fee_xaf: number;
  total_cost_xaf: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  valid_until: string;
  created_at: string;
  vehicles?: {
    images?: string[];
  };
}

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const SOURCE_NAMES: Record<string, string> = {
  korea: 'Coree du Sud',
  china: 'Chine',
  dubai: 'Dubai',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: {
    label: 'En attente',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    icon: Clock,
  },
  accepted: {
    label: 'Accepte',
    color: 'text-jewel',
    bg: 'bg-jewel/10',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Refuse',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    icon: XCircle,
  },
  expired: {
    label: 'Expire',
    color: 'text-[var(--text-muted)]',
    bg: 'bg-[var(--surface)]',
    icon: AlertCircle,
  },
};

// Default config for unknown statuses
const DEFAULT_STATUS_CONFIG = {
  label: 'Inconnu',
  color: 'text-gray-500',
  bg: 'bg-gray-500/10',
  icon: AlertCircle,
};

// Logo base64 will be loaded dynamically
let logoBase64: string | null = null;

export default function QuotesPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, isInitialized } = useAuthStore();
  const toast = useToast();
  const { availableCurrencies } = useCurrency();

  // Get XAF rate dynamically from currency API (default to 615 if not available)
  const xafRate = useMemo(() => {
    const xafCurrency = availableCurrencies.find(c => c.code === 'XAF');
    return xafCurrency?.rateToUsd || 615;
  }, [availableCurrencies]);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !authLoading && !user) {
      router.push('/login?redirect=/dashboard/quotes');
    }
  }, [user, authLoading, isInitialized, router]);

  useEffect(() => {
    if (user) {
      fetchQuotes();
      loadLogo();
    }
  }, [user]);

  const loadLogo = async () => {
    try {
      const response = await fetch('/logo-driveby-africa-dark.png');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result as string;
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  };

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes');
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchQuotes();
  };

  const handleDeleteQuote = async (quoteId: string, quoteNumber: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le devis ${quoteNumber} ?`)) {
      return;
    }

    setDeletingQuote(quoteId);
    try {
      const response = await fetch(`/api/quotes?id=${quoteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Devis supprimé avec succès');
        setQuotes(quotes.filter(q => q.id !== quoteId));
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingQuote(null);
    }
  };

  const formatCurrency = (amount: number) => {
    // Format with regular spaces as thousand separators
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} FCFA`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const handleOpenQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };

  const handleValidateQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsValidationModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQuote(null);
  };

  const handleCloseValidationModal = () => {
    setIsValidationModalOpen(false);
    setSelectedQuote(null);
  };

  // Convert Quote to QuoteData format for the modal
  const getQuoteDataForModal = (quote: Quote) => {
    if (!quote) return null;
    // Pour les véhicules chinois, ajouter silencieusement la taxe export (980$)
    const exportTaxUSD = getExportTax(quote.vehicle_source);
    const effectivePriceUSD = quote.vehicle_price_usd + exportTaxUSD;
    const vehiclePriceXAF = effectivePriceUSD * xafRate;
    return {
      vehicleId: quote.vehicle_id,
      vehicleMake: quote.vehicle_make,
      vehicleModel: quote.vehicle_model,
      vehicleYear: quote.vehicle_year,
      vehiclePriceUSD: quote.vehicle_price_usd,
      vehicleSource: quote.vehicle_source,
      destination: {
        id: quote.destination_id,
        name: quote.destination_name,
        country: quote.destination_country,
        flag: '', // Will be displayed without flag
      },
      shippingType: (quote.shipping_type || 'container') as 'container' | 'groupage',
      shippingTypeName: quote.shipping_type === 'groupage' ? 'Groupage maritime' : 'Container seul 20HQ',
      calculations: {
        vehiclePrice: vehiclePriceXAF,
        shippingCost: quote.shipping_cost_xaf,
        insuranceCost: quote.insurance_cost_xaf,
        inspectionFee: quote.inspection_fee_xaf,
        total: quote.total_cost_xaf,
        hasExportTax: exportTaxUSD > 0,
      },
      userId: user?.id || '',
      userEmail: user?.email || '',
      validUntil: quote.valid_until, // Add valid_until for expiration check in modal
    };
  };

  const generatePDF = async (quote: Quote) => {
    if (!user) return;

    setGeneratingPDF(quote.id);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let y = margin;

      // Colors
      const mandarin = '#F97316';
      const darkGray = '#1a1a1a';
      const mediumGray = '#666666';
      const lightGray = '#999999';

      // Header
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, y, 50, 20);
      } else {
        doc.setFontSize(24);
        doc.setTextColor(mandarin);
        doc.setFont('helvetica', 'bold');
        doc.text('driveby', margin, y + 12);
        doc.setTextColor(darkGray);
        doc.text('AFRICA', margin + 35, y + 12);
      }

      doc.setFontSize(10);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Devis N° ${quote.quote_number}`, pageWidth - margin, y + 5, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(lightGray);
      doc.text(formatDate(quote.created_at), pageWidth - margin, y + 10, { align: 'right' });

      y += 28;

      doc.setDrawColor(mandarin);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);

      y += 12;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text("DEVIS D'IMPORTATION VEHICULE", margin, y);

      y += 15;

      // Client Section
      doc.setFontSize(11);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMATIONS CLIENT', margin, y);

      y += 8;

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');

      doc.setFontSize(9);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Email', margin + 5, y + 6);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(user.email || '', margin + 5, y + 12);

      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Date de demande', margin + contentWidth / 2, y + 6);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(formatDate(quote.created_at), margin + contentWidth / 2, y + 12);

      y += 28;

      // Vehicle Section
      doc.setFontSize(11);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('VEHICULE', margin, y);

      y += 8;

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'F');

      doc.setFontSize(9);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Marque / Modele', margin + 5, y + 6);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(`${quote.vehicle_make} ${quote.vehicle_model}`, margin + 5, y + 12);

      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Annee', margin + contentWidth / 2, y + 6);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(quote.vehicle_year.toString(), margin + contentWidth / 2, y + 12);

      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Origine', margin + 5, y + 21);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(SOURCE_NAMES[quote.vehicle_source] || quote.vehicle_source, margin + 5, y + 27);

      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Destination', margin + contentWidth / 2, y + 21);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(`${quote.destination_name}, ${quote.destination_country}`, margin + contentWidth / 2, y + 27);

      y += 43;

      // Costs Table
      doc.setFontSize(11);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAIL DES COUTS', margin, y);

      y += 8;

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentWidth, 10, 'F');

      doc.setFontSize(9);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', margin + 5, y + 7);
      doc.text('Montant', pageWidth - margin - 5, y + 7, { align: 'right' });

      y += 10;

      // Pour les véhicules chinois, ajouter silencieusement la taxe export (980$)
      const exportTaxUSD = getExportTax(quote.vehicle_source);
      const effectivePriceUSD = quote.vehicle_price_usd + exportTaxUSD;
      const vehiclePriceXAF = effectivePriceUSD * xafRate;
      const hasExportTax = exportTaxUSD > 0;
      const costs = [
        { label: hasExportTax ? 'Prix du vehicule (FOB, inclut taxe export)' : 'Prix du vehicule (FOB)', value: vehiclePriceXAF },
        { label: `Transport maritime (${SOURCE_NAMES[quote.vehicle_source] || quote.vehicle_source} -> ${quote.destination_name})`, value: quote.shipping_cost_xaf },
        { label: 'Assurance cargo (2.5%)', value: quote.insurance_cost_xaf },
        { label: 'Inspection & Documents', value: quote.inspection_fee_xaf },
      ];

      doc.setFont('helvetica', 'normal');
      costs.forEach((cost, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(margin, y, contentWidth, 12, 'F');
        }

        doc.setTextColor(darkGray);
        doc.setFontSize(10);
        doc.text(cost.label, margin + 5, y + 8);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(cost.value), pageWidth - margin - 5, y + 8, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(margin, y + 12, pageWidth - margin, y + 12);

        y += 12;
      });

      // Total
      doc.setFillColor(255, 247, 237);
      doc.rect(margin, y, contentWidth, hasExportTax ? 18 : 14, 'F');

      doc.setFontSize(11);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL ESTIME', margin + 5, y + (hasExportTax ? 7 : 10));
      if (hasExportTax) {
        doc.setFontSize(7);
        doc.setTextColor(mediumGray);
        doc.setFont('helvetica', 'normal');
        doc.text('Inclut taxe et douane export', margin + 5, y + 13);
      }
      doc.setTextColor(mandarin);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(quote.total_cost_xaf), pageWidth - margin - 5, y + (hasExportTax ? 10 : 10), { align: 'right' });

      y += 22;

      // Notes
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);

      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(mediumGray);
      doc.setFont('helvetica', 'bold');
      doc.text('Note importante:', margin, y);

      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const noteText = `Ce devis est une estimation et n'inclut pas les frais de dedouanement qui varient selon la reglementation locale de ${quote.destination_country}. Ce devis est valable 7 jours a compter de sa date d'emission.`;
      const noteLines = doc.splitTextToSize(noteText, contentWidth);
      doc.text(noteLines, margin, y);

      y += noteLines.length * 4 + 10;

      // Footer Contact
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F');

      doc.setFontSize(10);
      doc.setTextColor(mandarin);
      doc.setFont('helvetica', 'bold');
      doc.text('Contact', margin + 5, y + 7);

      doc.setFontSize(9);
      doc.setTextColor(darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Driveby Africa', margin + 5, y + 14);
      doc.text('Email: contact@drivebyafrica.com', margin + 5, y + 20);
      doc.text('WhatsApp: +241 77 00 00 00', margin + contentWidth / 2, y + 14);
      doc.text('Site: www.drivebyafrica.com', margin + contentWidth / 2, y + 20);

      // Page Footer
      doc.setFontSize(8);
      doc.setTextColor(lightGray);
      doc.text(
        `Driveby Africa - Votre partenaire d'importation automobile en Afrique`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      doc.save(`Devis-${quote.quote_number}.pdf`);
      toast.success('PDF telecharge!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la generation du PDF');
    } finally {
      setGeneratingPDF(null);
    }
  };

  // Filter quotes
  const filteredQuotes = quotes.filter((quote) => {
    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
    const matchesSearch =
      searchQuery === '' ||
      quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.vehicle_make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.vehicle_model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Count by status
  const statusCounts = {
    all: quotes.length,
    pending: quotes.filter((q) => q.status === 'pending').length,
    accepted: quotes.filter((q) => q.status === 'accepted').length,
    rejected: quotes.filter((q) => q.status === 'rejected').length,
    expired: quotes.filter((q) => q.status === 'expired').length,
  };

  // Show loading while checking auth or if not authenticated (will redirect)
  if (!isInitialized || authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mes devis</h1>
          <p className="text-[var(--text-muted)]">
            Consultez et telechargez vos devis d&apos;importation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Actualiser
          </Button>
          <Link href="/cars">
            <Button variant="primary" size="sm">
              Nouveau devis
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher par numero, marque ou modele..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-mandarin focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'pending', 'accepted', 'rejected', 'expired'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? 'bg-mandarin text-white'
                    : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {status === 'all' ? 'Tous' : STATUS_CONFIG[status].label} ({statusCounts[status]})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            {quotes.length === 0 ? 'Aucun devis' : 'Aucun resultat'}
          </h3>
          <p className="text-[var(--text-muted)] mb-6">
            {quotes.length === 0
              ? "Vous n'avez pas encore demande de devis"
              : 'Modifiez vos filtres pour voir plus de resultats'}
          </p>
          {quotes.length === 0 && (
            <Link href="/cars">
              <Button variant="primary">Explorer les vehicules</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => {
            const status = STATUS_CONFIG[quote.status] || DEFAULT_STATUS_CONFIG;
            const StatusIcon = status.icon;
            const expired = isExpired(quote.valid_until) && quote.status === 'pending';
            const canValidate = quote.status === 'pending' && !expired;
            const canDelete = quote.status !== 'accepted';

            const vehicleImage = quote.vehicles?.images?.[0];

            return (
              <Card key={quote.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex gap-4">
                  {/* Vehicle thumbnail */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--surface)]">
                    {vehicleImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getProxiedImageUrl(vehicleImage)}
                        alt={`${quote.vehicle_make} ${quote.vehicle_model}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Car className="w-8 h-8 text-[var(--text-muted)]" />
                      </div>
                    )}
                    {/* Source flag overlay */}
                    <div className="absolute top-1 left-1 w-6 h-6 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full text-sm">
                      {SOURCE_FLAGS[quote.vehicle_source] || '🚗'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header with status badge */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {expired ? 'Expiré' : status.label}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {quote.quote_number}
                      </span>
                    </div>

                    {/* Vehicle title */}
                    <button
                      onClick={() => handleOpenQuote(quote)}
                      className="text-left w-full group"
                    >
                      <h3 className="font-bold text-[var(--text-primary)] group-hover:text-mandarin transition-colors text-sm sm:text-base leading-tight truncate">
                        {quote.vehicle_make} {quote.vehicle_model} ({quote.vehicle_year})
                      </h3>
                    </button>

                    {/* Info row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-muted)] mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {quote.destination_name || 'À définir'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(quote.created_at)}
                      </span>
                    </div>

                    {/* Price - inline, smaller */}
                    <div className="mt-2">
                      <span className="text-base sm:text-lg font-bold text-mandarin">
                        {quote.total_cost_xaf > 0 ? formatCurrency(quote.total_cost_xaf) : 'À calculer'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {/* Primary action - Validate (only for pending non-expired) */}
                  {canValidate && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleValidateQuote(quote)}
                      leftIcon={<CheckCircle className="w-4 h-4" />}
                      className="flex-1 sm:flex-none"
                    >
                      Valider le devis
                    </Button>
                  )}

                  {/* View details */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenQuote(quote)}
                    leftIcon={<Eye className="w-4 h-4" />}
                  >
                    Détails
                  </Button>

                  {/* Download PDF */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generatePDF(quote)}
                    disabled={generatingPDF === quote.id}
                    leftIcon={
                      generatingPDF === quote.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )
                    }
                  >
                    PDF
                  </Button>

                  {/* View vehicle */}
                  <Link href={`/cars/${quote.vehicle_id}`}>
                    <Button variant="ghost" size="sm" leftIcon={<Car className="w-4 h-4" />}>
                      Véhicule
                    </Button>
                  </Link>

                  {/* Delete button - always visible for non-accepted quotes */}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuote(quote.id, quote.quote_number)}
                      disabled={deletingQuote === quote.id}
                      leftIcon={
                        deletingQuote === quote.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )
                      }
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 ml-auto"
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-royal-blue/5 border-royal-blue/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-royal-blue/10 rounded-lg">
            <FileText className="w-5 h-5 text-royal-blue" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)] mb-1">
              Comment ca marche?
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Chaque devis est valable 7 jours. Une fois votre devis accepte, notre equipe vous
              contactera pour finaliser votre commande. Vous pouvez telecharger le PDF a tout
              moment pour vos demarches.
            </p>
          </div>
        </div>
      </Card>

      {/* Quote PDF Modal */}
      <QuotePDFModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        quoteData={selectedQuote ? getQuoteDataForModal(selectedQuote) : null}
        user={user}
        profile={profile}
        defaultQuoteNumber={selectedQuote?.quote_number}
      />

      {/* Quote Validation Modal */}
      <QuoteValidationModal
        isOpen={isValidationModalOpen}
        onClose={handleCloseValidationModal}
        quote={selectedQuote}
      />
    </div>
  );
}
