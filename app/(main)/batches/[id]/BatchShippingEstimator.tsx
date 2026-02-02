'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Ship,
  Shield,
  FileCheck,
  MapPin,
  FileText,
  Loader2,
  Search,
  X,
  Container,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { BatchQuotePDFModal } from './BatchQuotePDFModal';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { INSURANCE_RATE, INSPECTION_FEE_USD, getExportTax } from '@/lib/utils/pricing';
import { useShippingDestinations, type ShippingDestination } from '@/lib/hooks/useShippingDestinations';

interface BatchShippingEstimatorProps {
  batchId: string;
  unitPriceUSD: number;
  batchSource: 'korea' | 'china' | 'dubai';
  batchMake: string;
  batchModel: string;
  batchYear: number;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  autoOpenQuote?: boolean;
}

export function BatchShippingEstimator({
  batchId,
  unitPriceUSD,
  batchSource,
  batchMake,
  batchModel,
  batchYear,
  quantity,
  minQuantity,
  maxQuantity,
  autoOpenQuote = false,
}: BatchShippingEstimatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuthStore();
  const toast = useToast();
  const {
    getQuoteCurrencyCode,
    convertToQuoteCurrency,
  } = useCurrency();

  const quoteCurrencyCode = getQuoteCurrencyCode();

  // Use shared hook for destinations (53 destinations from API)
  const [searchQuery, setSearchQuery] = useState('');
  const {
    destinations,
    filteredDestinations,
    isLoading: isLoadingDestinations,
    lastUpdatedAt,
  } = useShippingDestinations({ searchQuery });

  const [selectedDestination, setSelectedDestination] = useState<ShippingDestination | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Restaurer la destination depuis l'URL apres le login
  useEffect(() => {
    if (!isLoadingDestinations && destinations.length > 0) {
      const destParam = searchParams.get('dest');

      if (destParam && !selectedDestination) {
        const savedDest = destinations.find(d => d.id === destParam);
        if (savedDest) {
          setSelectedDestination(savedDest);
        }
      }
    }
  }, [isLoadingDestinations, destinations, searchParams, selectedDestination]);

  // Calculate dropdown position
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const dropdownHeight = 320;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Auto-open quote modal
  useEffect(() => {
    if (autoOpenQuote && user && selectedDestination && !hasAutoOpened && !isLoadingDestinations) {
      const timer = setTimeout(() => {
        setIsQuoteModalOpen(true);
        setHasAutoOpened(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('action');
        url.searchParams.delete('dest');
        url.searchParams.delete('shipping');
        window.history.replaceState({}, '', url.toString());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoOpenQuote, user, hasAutoOpened, selectedDestination, isLoadingDestinations]);

  // Calculate costs for batch
  // Lots use 40ft containers: 4 vehicles per container, ceil(qty/4) containers
  const VEHICLES_PER_40FT = 4;

  const calculations = useMemo(() => {
    if (!selectedDestination) return null;

    // Export tax per vehicle (for Chinese vehicles)
    const exportTaxUSD = getExportTax(batchSource);
    const effectiveUnitPriceUSD = unitPriceUSD + exportTaxUSD;
    const totalVehiclePriceUSD = effectiveUnitPriceUSD * quantity;

    // 40ft container calculation for lots: 4 vehicles per container
    const cost40ft = selectedDestination.shippingCost40ft[batchSource];
    const numberOfContainers = Math.ceil(quantity / VEHICLES_PER_40FT);
    const totalShippingCostUSD = numberOfContainers * cost40ft;
    const shippingPerVehicleUSD = totalShippingCostUSD / quantity;

    // Insurance: 2.5% of (vehicle price + shipping)
    const insuranceCostUSD = (totalVehiclePriceUSD + totalShippingCostUSD) * INSURANCE_RATE;

    // Inspection fee per vehicle
    const totalInspectionFeeUSD = INSPECTION_FEE_USD * quantity;

    // Total
    const totalUSD = totalVehiclePriceUSD + totalShippingCostUSD + insuranceCostUSD + totalInspectionFeeUSD;

    return {
      vehiclePrice: Math.round(convertToQuoteCurrency(totalVehiclePriceUSD)),
      unitPrice: Math.round(convertToQuoteCurrency(effectiveUnitPriceUSD)),
      shippingCost: Math.round(convertToQuoteCurrency(totalShippingCostUSD)),
      shippingPerVehicle: Math.round(convertToQuoteCurrency(shippingPerVehicleUSD)),
      insuranceCost: Math.round(convertToQuoteCurrency(insuranceCostUSD)),
      inspectionFee: Math.round(convertToQuoteCurrency(totalInspectionFeeUSD)),
      total: Math.round(convertToQuoteCurrency(totalUSD)),
      // USD values for database
      vehiclePriceUSD: totalVehiclePriceUSD,
      unitPriceUSD: effectiveUnitPriceUSD,
      shippingCostUSD: totalShippingCostUSD,
      insuranceCostUSD,
      inspectionFeeUSD: totalInspectionFeeUSD,
      totalUSD,
      hasExportTax: exportTaxUSD > 0,
      quoteCurrencyCode,
      // 40ft container info
      numberOfContainers,
      cost40ftPerContainer: Math.round(convertToQuoteCurrency(cost40ft)),
    };
  }, [unitPriceUSD, batchSource, selectedDestination, quantity, convertToQuoteCurrency, quoteCurrencyCode]);

  // Format currency
  const formatCurrency = (amount: number) => {
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    if (quoteCurrencyCode === 'XAF') {
      return `${formatted} FCFA`;
    } else if (quoteCurrencyCode === 'EUR') {
      return `${formatted} €`;
    } else {
      return `$${formatted}`;
    }
  };

  const handleRequestQuote = async () => {
    if (!selectedDestination) {
      toast.error('Veuillez selectionner une destination');
      return;
    }

    if (!user) {
      toast.info('Veuillez vous connecter pour obtenir un devis');
      const redirectUrl = `/batches/${batchId}?action=quote${selectedDestination ? `&dest=${selectedDestination.id}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    setIsGeneratingQuote(true);
    // Small delay for better UX
    await new Promise(r => setTimeout(r, 300));
    setIsGeneratingQuote(false);
    setIsQuoteModalOpen(true);
  };

  // Prepare quote data for modal
  const quoteDataForModal = selectedDestination && calculations ? {
    batchId,
    batchMake,
    batchModel,
    batchYear,
    quantity,
    unitPriceUSD,
    batchSource,
    destination: {
      id: selectedDestination.id,
      name: selectedDestination.name,
      country: selectedDestination.country,
      flag: selectedDestination.flag,
    },
    shippingType: 'container' as const,
    shippingTypeName: 'Container 40HQ',
    calculations,
    userId: user?.id || '',
    userEmail: user?.email || '',
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } : null;

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4 space-y-4">
      {/* Header */}
      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <Ship className="w-5 h-5 text-mandarin" />
        Estimer les frais de livraison
      </h3>

      {/* Destination Selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Selectionnez votre destination
        </label>
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoadingDestinations}
            className={cn(
              'w-full px-4 py-3 bg-[var(--card-bg)] border rounded-xl',
              'text-left flex items-center justify-between',
              'transition-colors',
              'text-[var(--text-primary)]',
              isLoadingDestinations && 'opacity-50 cursor-wait',
              isDropdownOpen
                ? 'border-mandarin ring-2 ring-mandarin/20'
                : 'border-[var(--card-border)] hover:border-mandarin/50'
            )}
          >
            {isLoadingDestinations ? (
              <span className="flex items-center gap-2 text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement des destinations...
              </span>
            ) : selectedDestination ? (
              <span className="flex items-center gap-2">
                <span className="text-xl">{selectedDestination.flag}</span>
                <span>{selectedDestination.name}, {selectedDestination.country}</span>
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">Choisir un pays africain</span>
            )}
            <ChevronDown
              className={cn(
                'w-5 h-5 text-[var(--text-muted)] transition-transform duration-200',
                isDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'absolute z-50 left-0 right-0 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl overflow-hidden',
                  dropdownPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
                )}
              >
                {/* Search Header */}
                <div className="p-3 border-b border-[var(--card-border)] bg-[var(--surface)]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Rechercher un pays ou une ville..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-mandarin"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    {filteredDestinations.length} destination{filteredDestinations.length > 1 ? 's' : ''} disponible{filteredDestinations.length > 1 ? 's' : ''}
                  </p>
                </div>
                {/* Destinations List */}
                <div className="max-h-56 overflow-y-auto overscroll-contain">
                  {filteredDestinations.length > 0 ? (
                    filteredDestinations.map((dest) => (
                      <button
                        key={dest.id}
                        onClick={() => {
                          setSelectedDestination(dest);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={cn(
                          'w-full px-4 py-3 text-left flex items-center gap-3',
                          'hover:bg-mandarin/10 transition-colors',
                          'border-b border-[var(--card-border)]/30 last:border-b-0',
                          selectedDestination?.id === dest.id && 'bg-mandarin/10'
                        )}
                      >
                        <span className="text-2xl">{dest.flag}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[var(--text-primary)] font-medium block">{dest.name}</span>
                          <span className="text-[var(--text-muted)] text-xs">{dest.country}</span>
                        </div>
                        {selectedDestination?.id === dest.id && (
                          <div className="w-2 h-2 rounded-full bg-mandarin" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-[var(--text-muted)]">Aucune destination trouvee</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Shipping Type - Fixed to Container 40HQ for batches */}
      <AnimatePresence>
        {selectedDestination && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              <Ship className="w-4 h-4 inline mr-1" />
              Type d&apos;expedition
            </label>
            <div className="w-full px-4 py-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl">
              <span className="flex items-center gap-3">
                <Container className="w-5 h-5 text-mandarin" />
                <div>
                  <span className="font-medium text-[var(--text-primary)] block">Container 40HQ</span>
                  <span className="text-xs text-[var(--text-muted)]">4 vehicules par container</span>
                </div>
              </span>
            </div>

            {/* Last Update Info */}
            {lastUpdatedAt && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--text-muted)]">
                <Clock className="w-3 h-3" />
                <span>
                  Prix transport actualises {formatDistanceToNow(new Date(lastUpdatedAt), { addSuffix: true, locale: fr })}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cost Breakdown */}
      <AnimatePresence>
        {selectedDestination && calculations && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 pt-4 border-t border-[var(--card-border)]"
          >
            <h4 className="font-semibold text-[var(--text-primary)]">
              Estimation des couts ({quantity} vehicules)
            </h4>

            {/* Vehicle Price */}
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="text-[var(--text-muted)]">Prix des vehicules (FOB)</span>
                <span className="text-xs text-[var(--text-muted)] block">
                  {formatCurrency(calculations.unitPrice)} x {quantity}
                </span>
              </div>
              <span className="text-[var(--text-primary)] font-medium">
                {formatCurrency(calculations.vehiclePrice)}
              </span>
            </div>

            {/* Shipping */}
            <div className="flex justify-between items-center py-2 border-t border-[var(--card-border)]/50">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-royal-blue" />
                <div>
                  <span className="text-[var(--text-muted)] block">Transport maritime</span>
                  <span className="text-xs text-royal-blue">
                    Container 40HQ x {calculations.numberOfContainers} ({formatCurrency(calculations.cost40ftPerContainer)}/cont.)
                  </span>
                  <span className="text-xs text-[var(--text-muted)] block">
                    {quantity} vehicules / 4 par container = {calculations.numberOfContainers} container{calculations.numberOfContainers > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <span className="text-[var(--text-primary)] font-medium">
                {formatCurrency(calculations.shippingCost)}
              </span>
            </div>

            {/* Insurance */}
            <div className="flex justify-between items-center py-2 border-t border-[var(--card-border)]/50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-jewel" />
                <span className="text-[var(--text-muted)]">Assurance cargo (2.5%)</span>
              </div>
              <span className="text-[var(--text-primary)] font-medium">
                {formatCurrency(calculations.insuranceCost)}
              </span>
            </div>

            {/* Inspection */}
            <div className="flex justify-between items-center py-2 border-t border-[var(--card-border)]/50">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-mandarin" />
                <span className="text-[var(--text-muted)]">Inspection & Documents x {quantity}</span>
              </div>
              <span className="text-[var(--text-primary)] font-medium">
                {formatCurrency(calculations.inspectionFee)}
              </span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-3 bg-mandarin/10 -mx-4 px-4 rounded-lg mt-2">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Cout total estime</span>
                {calculations.hasExportTax && (
                  <span className="text-xs text-[var(--text-muted)]">Inclut taxe et douane export</span>
                )}
              </div>
              <span className="text-xl font-bold text-mandarin">
                {formatCurrency(calculations.total)}
              </span>
            </div>

            {/* Note */}
            <p className="text-xs text-[var(--text-muted)] mt-2">
              * Cette estimation n'inclut pas les frais de dedouanement qui varient selon la reglementation locale.
            </p>

            {/* Get Quote Button */}
            <Button
              variant="primary"
              className="w-full mt-4"
              onClick={handleRequestQuote}
              disabled={isGeneratingQuote}
              leftIcon={isGeneratingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            >
              {isGeneratingQuote ? 'Preparation du devis...' : 'Obtenir un devis PDF'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quote PDF Modal */}
      <BatchQuotePDFModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        quoteData={quoteDataForModal}
        user={user}
        profile={profile}
      />
    </div>
  );
}
