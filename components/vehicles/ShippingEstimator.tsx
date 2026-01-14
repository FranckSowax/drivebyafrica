'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { QuotePDFModal } from './QuotePDFModal';

// Taux de conversion: 1 USD = 640 FCFA
const USD_TO_XAF = 640;

// Frais fixes
const INSURANCE_RATE = 0.025; // 2.5% assurance
const INSPECTION_FEE_XAF = 225000; // 225 000 FCFA pour inspection et documents

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

// Destinations africaines avec drapeaux et coûts de transport (estimations en USD)
const destinations = [
  // Afrique de l'Ouest
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', flag: '🇸🇳', shippingCost: { korea: 2300, china: 2600, dubai: 2100 } },
  { id: 'banjul', name: 'Banjul', country: 'Gambie', flag: '🇬🇲', shippingCost: { korea: 2350, china: 2650, dubai: 2150 } },
  { id: 'bissau', name: 'Bissau', country: 'Guinée-Bissau', flag: '🇬🇼', shippingCost: { korea: 2400, china: 2700, dubai: 2200 } },
  { id: 'conakry', name: 'Conakry', country: 'Guinée', flag: '🇬🇳', shippingCost: { korea: 2250, china: 2550, dubai: 2050 } },
  { id: 'freetown', name: 'Freetown', country: 'Sierra Leone', flag: '🇸🇱', shippingCost: { korea: 2200, china: 2500, dubai: 2000 } },
  { id: 'monrovia', name: 'Monrovia', country: 'Liberia', flag: '🇱🇷', shippingCost: { korea: 2150, china: 2450, dubai: 1950 } },
  { id: 'abidjan', name: 'Abidjan', country: "Côte d'Ivoire", flag: '🇨🇮', shippingCost: { korea: 2100, china: 2400, dubai: 1900 } },
  { id: 'accra', name: 'Tema/Accra', country: 'Ghana', flag: '🇬🇭', shippingCost: { korea: 2050, china: 2350, dubai: 1850 } },
  { id: 'lome', name: 'Lomé', country: 'Togo', flag: '🇹🇬', shippingCost: { korea: 2000, china: 2300, dubai: 1800 } },
  { id: 'cotonou', name: 'Cotonou', country: 'Bénin', flag: '🇧🇯', shippingCost: { korea: 2050, china: 2350, dubai: 1850 } },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', flag: '🇳🇬', shippingCost: { korea: 1950, china: 2250, dubai: 1750 } },
  { id: 'port-harcourt', name: 'Port Harcourt', country: 'Nigeria', flag: '🇳🇬', shippingCost: { korea: 2000, china: 2300, dubai: 1800 } },
  { id: 'nouakchott', name: 'Nouakchott', country: 'Mauritanie', flag: '🇲🇷', shippingCost: { korea: 2500, china: 2800, dubai: 2300 } },
  { id: 'praia', name: 'Praia', country: 'Cap-Vert', flag: '🇨🇻', shippingCost: { korea: 2600, china: 2900, dubai: 2400 } },
  // Afrique Centrale
  { id: 'douala', name: 'Douala', country: 'Cameroun', flag: '🇨🇲', shippingCost: { korea: 1700, china: 2000, dubai: 1500 } },
  { id: 'kribi', name: 'Kribi', country: 'Cameroun', flag: '🇨🇲', shippingCost: { korea: 1750, china: 2050, dubai: 1550 } },
  { id: 'malabo', name: 'Malabo', country: 'Guinée équatoriale', flag: '🇬🇶', shippingCost: { korea: 1800, china: 2100, dubai: 1600 } },
  { id: 'libreville', name: 'Libreville', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 1800, china: 2100, dubai: 1600 } },
  { id: 'port-gentil', name: 'Port-Gentil', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 1850, china: 2150, dubai: 1650 } },
  { id: 'pointe-noire', name: 'Pointe-Noire', country: 'Congo', flag: '🇨🇬', shippingCost: { korea: 1900, china: 2200, dubai: 1700 } },
  { id: 'matadi', name: 'Matadi', country: 'RD Congo', flag: '🇨🇩', shippingCost: { korea: 1950, china: 2250, dubai: 1750 } },
  { id: 'luanda', name: 'Luanda', country: 'Angola', flag: '🇦🇴', shippingCost: { korea: 2000, china: 2300, dubai: 1800 } },
  { id: 'lobito', name: 'Lobito', country: 'Angola', flag: '🇦🇴', shippingCost: { korea: 2050, china: 2350, dubai: 1850 } },
  { id: 'sao-tome', name: 'São Tomé', country: 'São Tomé-et-Príncipe', flag: '🇸🇹', shippingCost: { korea: 2100, china: 2400, dubai: 1900 } },
  // Afrique de l'Est
  { id: 'mombasa', name: 'Mombasa', country: 'Kenya', flag: '🇰🇪', shippingCost: { korea: 1600, china: 1900, dubai: 1400 } },
  { id: 'dar-es-salaam', name: 'Dar es Salaam', country: 'Tanzanie', flag: '🇹🇿', shippingCost: { korea: 1650, china: 1950, dubai: 1450 } },
  { id: 'zanzibar', name: 'Zanzibar', country: 'Tanzanie', flag: '🇹🇿', shippingCost: { korea: 1700, china: 2000, dubai: 1500 } },
  { id: 'maputo', name: 'Maputo', country: 'Mozambique', flag: '🇲🇿', shippingCost: { korea: 1750, china: 2050, dubai: 1550 } },
  { id: 'beira', name: 'Beira', country: 'Mozambique', flag: '🇲🇿', shippingCost: { korea: 1800, china: 2100, dubai: 1600 } },
  { id: 'djibouti', name: 'Djibouti', country: 'Djibouti', flag: '🇩🇯', shippingCost: { korea: 1500, china: 1800, dubai: 1200 } },
  { id: 'port-sudan', name: 'Port-Soudan', country: 'Soudan', flag: '🇸🇩', shippingCost: { korea: 1550, china: 1850, dubai: 1250 } },
  { id: 'massawa', name: 'Massawa', country: 'Érythrée', flag: '🇪🇷', shippingCost: { korea: 1600, china: 1900, dubai: 1300 } },
  { id: 'mogadiscio', name: 'Mogadiscio', country: 'Somalie', flag: '🇸🇴', shippingCost: { korea: 1650, china: 1950, dubai: 1350 } },
  { id: 'port-louis', name: 'Port-Louis', country: 'Maurice', flag: '🇲🇺', shippingCost: { korea: 1900, china: 2200, dubai: 1700 } },
  { id: 'toamasina', name: 'Toamasina', country: 'Madagascar', flag: '🇲🇬', shippingCost: { korea: 1850, china: 2150, dubai: 1650 } },
  { id: 'moroni', name: 'Moroni', country: 'Comores', flag: '🇰🇲', shippingCost: { korea: 1950, china: 2250, dubai: 1750 } },
  { id: 'victoria', name: 'Victoria', country: 'Seychelles', flag: '🇸🇨', shippingCost: { korea: 2000, china: 2300, dubai: 1800 } },
  // Afrique Australe
  { id: 'durban', name: 'Durban', country: 'Afrique du Sud', flag: '🇿🇦', shippingCost: { korea: 1800, china: 2100, dubai: 1600 } },
  { id: 'cape-town', name: 'Le Cap', country: 'Afrique du Sud', flag: '🇿🇦', shippingCost: { korea: 1900, china: 2200, dubai: 1700 } },
  { id: 'walvis-bay', name: 'Walvis Bay', country: 'Namibie', flag: '🇳🇦', shippingCost: { korea: 2000, china: 2300, dubai: 1800 } },
  { id: 'gaborone', name: 'Gaborone', country: 'Botswana', flag: '🇧🇼', shippingCost: { korea: 2100, china: 2400, dubai: 1900 } },
  { id: 'harare', name: 'Harare', country: 'Zimbabwe', flag: '🇿🇼', shippingCost: { korea: 2050, china: 2350, dubai: 1850 } },
  { id: 'lusaka', name: 'Lusaka', country: 'Zambie', flag: '🇿🇲', shippingCost: { korea: 2100, china: 2400, dubai: 1900 } },
  { id: 'lilongwe', name: 'Lilongwe', country: 'Malawi', flag: '🇲🇼', shippingCost: { korea: 2150, china: 2450, dubai: 1950 } },
  { id: 'mbabane', name: 'Mbabane', country: 'Eswatini', flag: '🇸🇿', shippingCost: { korea: 1950, china: 2250, dubai: 1750 } },
  { id: 'maseru', name: 'Maseru', country: 'Lesotho', flag: '🇱🇸', shippingCost: { korea: 2000, china: 2300, dubai: 1800 } },
  // Afrique du Nord
  { id: 'alexandrie', name: 'Alexandrie', country: 'Égypte', flag: '🇪🇬', shippingCost: { korea: 1700, china: 2000, dubai: 1300 } },
  { id: 'port-said', name: 'Port-Saïd', country: 'Égypte', flag: '🇪🇬', shippingCost: { korea: 1650, china: 1950, dubai: 1250 } },
  { id: 'tripoli', name: 'Tripoli', country: 'Libye', flag: '🇱🇾', shippingCost: { korea: 1900, china: 2200, dubai: 1500 } },
  { id: 'tunis', name: 'Tunis', country: 'Tunisie', flag: '🇹🇳', shippingCost: { korea: 2000, china: 2300, dubai: 1600 } },
  { id: 'alger', name: 'Alger', country: 'Algérie', flag: '🇩🇿', shippingCost: { korea: 2100, china: 2400, dubai: 1700 } },
  { id: 'casablanca', name: 'Casablanca', country: 'Maroc', flag: '🇲🇦', shippingCost: { korea: 2200, china: 2500, dubai: 1800 } },
  { id: 'tanger', name: 'Tanger', country: 'Maroc', flag: '🇲🇦', shippingCost: { korea: 2250, china: 2550, dubai: 1850 } },
];

interface ShippingEstimatorProps {
  vehiclePriceUSD: number;
  vehicleSource: 'korea' | 'china' | 'dubai';
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
}

export function ShippingEstimator({
  vehiclePriceUSD,
  vehicleSource,
  vehicleId,
  vehicleMake,
  vehicleModel,
  vehicleYear,
}: ShippingEstimatorProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedDestination, setSelectedDestination] = useState<typeof destinations[0] | null>(null);
  const [selectedShippingType, setSelectedShippingType] = useState<ShippingType>('container');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isShippingTypeOpen, setIsShippingTypeOpen] = useState(false);
  const [isRequestingQuote, setIsRequestingQuote] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shippingTypeRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Filter destinations based on search query
  const filteredDestinations = destinations.filter(
    (dest) =>
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculations = useMemo(() => {
    if (!selectedDestination) return null;

    const vehiclePriceXAF = vehiclePriceUSD * USD_TO_XAF;
    const shippingCostUSD = selectedDestination.shippingCost[vehicleSource];

    // Appliquer le multiplicateur selon le type d'expédition
    const shippingTypeConfig = shippingTypes.find(t => t.id === selectedShippingType);
    const adjustedShippingCostUSD = shippingCostUSD * (shippingTypeConfig?.multiplier || 1);
    const shippingCostXAF = adjustedShippingCostUSD * USD_TO_XAF;

    const insuranceCostXAF = vehiclePriceXAF * INSURANCE_RATE;
    const inspectionFeeXAF = INSPECTION_FEE_XAF;

    const totalXAF = vehiclePriceXAF + shippingCostXAF + insuranceCostXAF + inspectionFeeXAF;

    return {
      vehiclePrice: Math.round(vehiclePriceXAF),
      shippingCost: Math.round(shippingCostXAF),
      insuranceCost: Math.round(insuranceCostXAF),
      inspectionFee: Math.round(inspectionFeeXAF),
      total: Math.round(totalXAF),
      isGroupage: selectedShippingType === 'groupage',
    };
  }, [vehiclePriceUSD, vehicleSource, selectedDestination, selectedShippingType]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const handleRequestQuote = () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/cars/${vehicleId}&action=quote`);
      return;
    }

    // Open the quote modal directly
    setIsQuoteModalOpen(true);
  };

  // Prepare quote data for the modal
  const quoteDataForModal = selectedDestination && calculations ? {
    vehicleId,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehiclePriceUSD,
    vehicleSource,
    destination: {
      id: selectedDestination.id,
      name: selectedDestination.name,
      country: selectedDestination.country,
      flag: selectedDestination.flag,
    },
    shippingType: selectedShippingType,
    shippingTypeName: shippingTypes.find(t => t.id === selectedShippingType)?.name || 'Container seul 20HQ',
    calculations,
    userId: user?.id || '',
    userEmail: user?.email || '',
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
            className={cn(
              'w-full px-4 py-3 bg-[var(--card-bg)] border rounded-xl',
              'text-left flex items-center justify-between',
              'transition-colors',
              'text-[var(--text-primary)]',
              isDropdownOpen
                ? 'border-mandarin ring-2 ring-mandarin/20'
                : 'border-[var(--card-border)] hover:border-mandarin/50'
            )}
          >
            {selectedDestination ? (
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
                <span className="text-[var(--text-muted)]">Assurance (2.5%)</span>
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
              <span className="font-bold text-[var(--text-primary)]">Coût total estimé</span>
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
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Obtenir un devis PDF
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
      />
    </div>
  );
}
