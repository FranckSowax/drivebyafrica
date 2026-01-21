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
  Users,
  Info,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { QuotePDFModal } from './QuotePDFModal';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { INSURANCE_RATE, INSPECTION_FEE_USD, getExportTax } from '@/lib/utils/pricing';

// Types d'expédition
type ShippingType = 'container' | 'groupage';

const shippingTypes = [
  {
    id: 'container' as ShippingType,
    name: 'Container seul 20HQ',
    description: 'Expédition exclusive dans un container dédié',
    icon: Container,
    multiplier: 1, // Prix complet
  },
  {
    id: 'groupage' as ShippingType,
    name: 'Groupage maritime',
    description: 'Partage du container avec d\'autres commandes',
    icon: Users,
    multiplier: 0.5, // Prix divisé par 2
  },
];

// Type pour les destinations
interface Destination {
  id: string;
  name: string;
  country: string;
  flag: string;
  shippingCost: {
    korea: number;
    china: number;
    dubai: number;
  };
}

// Destinations de secours (utilisées si l'API échoue) - prix doublés
const FALLBACK_DESTINATIONS: Destination[] = [
  { id: 'libreville', name: 'Libreville', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 3600, china: 4200, dubai: 3200 } },
  { id: 'douala', name: 'Douala', country: 'Cameroun', flag: '🇨🇲', shippingCost: { korea: 3400, china: 4000, dubai: 3000 } },
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', flag: '🇸🇳', shippingCost: { korea: 4600, china: 5200, dubai: 4200 } },
  { id: 'abidjan', name: 'Abidjan', country: "Côte d'Ivoire", flag: '🇨🇮', shippingCost: { korea: 4200, china: 4800, dubai: 3800 } },
];

interface ShippingEstimatorProps {
  vehiclePriceUSD: number;
  vehicleSource: 'korea' | 'china' | 'dubai';
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  autoOpenQuote?: boolean;
}

export function ShippingEstimator({
  vehiclePriceUSD,
  vehicleSource,
  vehicleId,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  autoOpenQuote = false,
}: ShippingEstimatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuthStore();
  const toast = useToast();
  const {
    getQuoteCurrencyCode,
    convertToQuoteCurrency,
    currency,
    currencyInfo,
    isQuoteCurrency,
    convertFromUsd,
  } = useCurrency();

  // Get quote currency code (USD, EUR, or XAF)
  const quoteCurrencyCode = getQuoteCurrencyCode();

  // Get current display currency info (for real-time conversion)
  const displayCurrency = currency;
  const displayCurrencyRate = currencyInfo?.rateToUsd || 1;

  // État pour les destinations chargées depuis l'API
  const [destinations, setDestinations] = useState<Destination[]>(FALLBACK_DESTINATIONS);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [selectedShippingType, setSelectedShippingType] = useState<ShippingType>('container');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isShippingTypeOpen, setIsShippingTypeOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

  // Real-time price state (for accurate quote generation)
  const [realTimePriceUSD, setRealTimePriceUSD] = useState<number | null>(null);
  const [isLoadingRealTimePrice, setIsLoadingRealTimePrice] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shippingTypeRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Charger les destinations depuis l'API
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await fetch('/api/shipping');
        const data = await response.json();

        if (data.destinations && data.destinations.length > 0) {
          setDestinations(data.destinations);
        }
        if (data.lastUpdatedAt) {
          setLastUpdatedAt(data.lastUpdatedAt);
        }
      } catch (error) {
        console.error('Error fetching shipping destinations:', error);
        // Garder les destinations de secours
      } finally {
        setIsLoadingDestinations(false);
      }
    };

    fetchDestinations();
  }, []);

  // Restaurer la destination depuis l'URL après le login
  useEffect(() => {
    if (!isLoadingDestinations && destinations.length > 0) {
      const destParam = searchParams.get('dest');
      const shippingParam = searchParams.get('shipping') as ShippingType | null;

      if (destParam) {
        const savedDest = destinations.find(d => d.id === destParam);
        if (savedDest) {
          setSelectedDestination(savedDest);
        }
      }

      if (shippingParam && (shippingParam === 'container' || shippingParam === 'groupage')) {
        setSelectedShippingType(shippingParam);
      }
    }
  }, [isLoadingDestinations, destinations, searchParams]);

  // Calculate dropdown position based on available space
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const dropdownHeight = 320; // max height of dropdown

      // If not enough space below but enough above, show above
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }

      // Focus search input when dropdown opens
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
      // Close shipping type dropdown
      if (
        shippingTypeRef.current &&
        !shippingTypeRef.current.contains(event.target as Node)
      ) {
        setIsShippingTypeOpen(false);
      }
    };

    if (isDropdownOpen || isShippingTypeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isShippingTypeOpen]);

  // Auto-open quote modal when coming back from login with action=quote
  useEffect(() => {
    // Only auto-open if:
    // 1. autoOpenQuote flag is set (from URL action=quote)
    // 2. User is logged in
    // 3. Destination is selected (either from URL params or manually)
    // 4. Haven't already auto-opened (prevent duplicate opens)
    // 5. Destinations are loaded (not loading)
    if (autoOpenQuote && user && selectedDestination && !hasAutoOpened && !isLoadingDestinations) {
      // Open the modal after a short delay to ensure all state is properly set
      const timer = setTimeout(() => {
        setIsQuoteModalOpen(true);
        setHasAutoOpened(true);
        // Clean up the URL params after opening the modal
        const url = new URL(window.location.href);
        url.searchParams.delete('action');
        url.searchParams.delete('dest');
        url.searchParams.delete('shipping');
        window.history.replaceState({}, '', url.toString());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoOpenQuote, user, hasAutoOpened, selectedDestination, isLoadingDestinations]);

  // Filter destinations based on search query
  const filteredDestinations = destinations.filter(
    (dest) =>
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to calculate costs based on vehicle price
  const calculateCosts = (basePriceUSD: number) => {
    if (!selectedDestination) return null;

    // Pour les véhicules chinois, ajouter silencieusement la taxe export (980$)
    const exportTaxUSD = getExportTax(vehicleSource);
    const effectiveVehiclePriceUSD = basePriceUSD + exportTaxUSD;

    const shippingCostUSD = selectedDestination.shippingCost[vehicleSource];

    // Appliquer le multiplicateur selon le type d'expédition
    const shippingTypeConfig = shippingTypes.find(t => t.id === selectedShippingType);
    const adjustedShippingCostUSD = shippingCostUSD * (shippingTypeConfig?.multiplier || 1);

    // Assurance cargo: 2.5% du (prix véhicule + transport maritime) en USD
    const insuranceCostUSD = (effectiveVehiclePriceUSD + adjustedShippingCostUSD) * INSURANCE_RATE;

    // Total en USD
    const totalUSD = effectiveVehiclePriceUSD + adjustedShippingCostUSD + insuranceCostUSD + INSPECTION_FEE_USD;

    return {
      vehiclePrice: Math.round(convertToQuoteCurrency(effectiveVehiclePriceUSD)),
      shippingCost: Math.round(convertToQuoteCurrency(adjustedShippingCostUSD)),
      insuranceCost: Math.round(convertToQuoteCurrency(insuranceCostUSD)),
      inspectionFee: Math.round(convertToQuoteCurrency(INSPECTION_FEE_USD)),
      total: Math.round(convertToQuoteCurrency(totalUSD)),
      // Keep USD values for database storage
      vehiclePriceUSD: effectiveVehiclePriceUSD,
      shippingCostUSD: adjustedShippingCostUSD,
      insuranceCostUSD,
      inspectionFeeUSD: INSPECTION_FEE_USD,
      totalUSD,
      isGroupage: selectedShippingType === 'groupage',
      hasExportTax: exportTaxUSD > 0,
      quoteCurrencyCode,
    };
  };

  // Calculations for display (using stored USD price)
  const calculations = useMemo(() => {
    return calculateCosts(vehiclePriceUSD);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiclePriceUSD, vehicleSource, selectedDestination, selectedShippingType, convertToQuoteCurrency, quoteCurrencyCode]);

  // Calculations for quote modal (using real-time price if available)
  const quoteCalculations = useMemo(() => {
    // Use real-time price if available, otherwise fall back to stored price
    const priceToUse = realTimePriceUSD ?? vehiclePriceUSD;
    return calculateCosts(priceToUse);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realTimePriceUSD, vehiclePriceUSD, vehicleSource, selectedDestination, selectedShippingType, convertToQuoteCurrency, quoteCurrencyCode]);

  // Format currency in quote currency (amounts are already converted)
  const formatCurrency = (amount: number) => {
    // Format with regular spaces as thousand separators
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    // Add appropriate currency symbol/suffix based on quote currency
    if (quoteCurrencyCode === 'XAF') {
      return `${formatted} FCFA`;
    } else if (quoteCurrencyCode === 'EUR') {
      return `${formatted} €`;
    } else {
      return `$${formatted}`;
    }
  };

  const handleRequestQuote = async () => {
    console.log('ShippingEstimator: handleRequestQuote clicked, user:', !!user, 'dest:', !!selectedDestination);

    if (!selectedDestination) {
      toast.error('Veuillez sélectionner une destination');
      return;
    }

    if (!user) {
      toast.info('Veuillez vous connecter pour obtenir un devis');
      // Redirect to login with return URL including destination and shipping type
      const redirectUrl = `/cars/${vehicleId}?action=quote${selectedDestination ? `&dest=${selectedDestination.id}` : ''}${selectedShippingType ? `&shipping=${selectedShippingType}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    // For non-quote currencies (NGN, GHS, etc.), convert the displayed price back to USD
    // using real-time exchange rates for accurate quote generation
    if (!isQuoteCurrency()) {
      setIsLoadingRealTimePrice(true);
      try {
        // Calculate the displayed price in local currency
        const displayedPriceLocal = convertFromUsd(vehiclePriceUSD);

        // Fetch real-time rate and convert back to USD
        const response = await fetch(`/api/exchange-rate?from=${displayCurrency}&amount=${displayedPriceLocal}`);
        if (response.ok) {
          const data = await response.json();
          if (data.convertedAmount) {
            setRealTimePriceUSD(Math.round(data.convertedAmount));
            console.log(`ShippingEstimator: Converted ${displayedPriceLocal} ${displayCurrency} to ${data.convertedAmount} USD (rate: ${data.rate})`);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch real-time rate, using stored price:', error);
      } finally {
        setIsLoadingRealTimePrice(false);
      }
    }

    // Open the quote modal
    console.log('ShippingEstimator: Opening Quote Modal');
    setIsQuoteModalOpen(true);
  };

  // Prepare quote data for the modal (uses real-time price for accurate quotes)
  const quoteDataForModal = selectedDestination && quoteCalculations ? {
    vehicleId,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    // Use real-time price if available for accurate quote
    vehiclePriceUSD: realTimePriceUSD ?? vehiclePriceUSD,
    vehicleSource,
    destination: {
      id: selectedDestination.id,
      name: selectedDestination.name,
      country: selectedDestination.country,
      flag: selectedDestination.flag,
    },
    shippingType: selectedShippingType,
    shippingTypeName: shippingTypes.find(t => t.id === selectedShippingType)?.name || 'Container seul 20HQ',
    calculations: quoteCalculations,
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
          Sélectionnez votre destination
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
                      <p className="text-[var(--text-muted)]">Aucune destination trouvée</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Essayez un autre terme de recherche</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Shipping Type Selector - appears after selecting destination */}
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
              Type d'expédition
            </label>
            <div className="relative" ref={shippingTypeRef}>
              <button
                onClick={() => setIsShippingTypeOpen(!isShippingTypeOpen)}
                className={cn(
                  'w-full px-4 py-3 bg-[var(--card-bg)] border rounded-xl',
                  'text-left flex items-center justify-between',
                  'transition-colors',
                  'text-[var(--text-primary)]',
                  isShippingTypeOpen
                    ? 'border-mandarin ring-2 ring-mandarin/20'
                    : 'border-[var(--card-border)] hover:border-mandarin/50'
                )}
              >
                {(() => {
                  const selected = shippingTypes.find(t => t.id === selectedShippingType);
                  const IconComponent = selected?.icon || Container;
                  return (
                    <span className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5 text-mandarin" />
                      <div>
                        <span className="font-medium block">{selected?.name}</span>
                        <span className="text-xs text-[var(--text-muted)]">{selected?.description}</span>
                      </div>
                    </span>
                  );
                })()}
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-[var(--text-muted)] transition-transform duration-200',
                    isShippingTypeOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* Shipping Type Dropdown */}
              <AnimatePresence>
                {isShippingTypeOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 left-0 right-0 top-full mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl overflow-hidden"
                  >
                    {shippingTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => {
                            setSelectedShippingType(type.id);
                            setIsShippingTypeOpen(false);
                          }}
                          className={cn(
                            'w-full px-4 py-3 text-left flex items-center gap-3',
                            'hover:bg-mandarin/10 transition-colors',
                            'border-b border-[var(--card-border)]/30 last:border-b-0',
                            selectedShippingType === type.id && 'bg-mandarin/10'
                          )}
                        >
                          <IconComponent className={cn(
                            'w-5 h-5',
                            selectedShippingType === type.id ? 'text-mandarin' : 'text-[var(--text-muted)]'
                          )} />
                          <div className="flex-1">
                            <span className="text-[var(--text-primary)] font-medium block">{type.name}</span>
                            <span className="text-[var(--text-muted)] text-xs">{type.description}</span>
                          </div>
                          {selectedShippingType === type.id && (
                            <div className="w-2 h-2 rounded-full bg-mandarin" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Last Update Info - below shipping type selector */}
            {lastUpdatedAt && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--text-muted)]">
                <Clock className="w-3 h-3" />
                <span>
                  Prix transport actualisés {formatDistanceToNow(new Date(lastUpdatedAt), { addSuffix: true, locale: fr })}
                </span>
              </div>
            )}

            {/* Groupage Notice */}
            {selectedShippingType === 'groupage' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-royal-blue/10 border border-royal-blue/30 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-royal-blue flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[var(--text-primary)]">
                    <p className="font-medium text-royal-blue">Groupage maritime</p>
                    <p className="mt-1 text-[var(--text-muted)]">
                      La date de départ sera soumise au chargement complet du container ou aux commandes groupées pour la même destination.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cost Breakdown - appears after selecting a destination */}
      <AnimatePresence>
        {selectedDestination && calculations && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 pt-4 border-t border-[var(--card-border)]"
          >
            <h4 className="font-semibold text-[var(--text-primary)]">Estimation des coûts</h4>

            {/* Vehicle Price */}
            <div className="flex justify-between items-center py-2">
              <span className="text-[var(--text-muted)]">Prix du véhicule (FOB)</span>
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
                    {selectedShippingType === 'container' ? 'Container 20HQ' : 'Groupage'}
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

            {/* Inspection & Documents */}
            <div className="flex justify-between items-center py-2 border-t border-[var(--card-border)]/50">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-mandarin" />
                <span className="text-[var(--text-muted)]">Inspection & Documents</span>
              </div>
              <span className="text-[var(--text-primary)] font-medium">
                {formatCurrency(calculations.inspectionFee)}
              </span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-3 bg-mandarin/10 -mx-4 px-4 rounded-lg mt-2">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Coût total estimé</span>
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
              * Cette estimation n'inclut pas les frais de dédouanement qui varient selon la réglementation locale.
            </p>

            {/* Get Quote Button */}
            <Button
              variant="primary"
              className="w-full mt-4"
              onClick={handleRequestQuote}
              disabled={isLoadingRealTimePrice}
              leftIcon={isLoadingRealTimePrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            >
              {isLoadingRealTimePrice ? 'Calcul du prix...' : 'Obtenir un devis PDF'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quote PDF Modal */}
      <QuotePDFModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        quoteData={quoteDataForModal}
        user={user}
        profile={profile}
      />
    </div>
  );
}
