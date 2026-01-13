'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

// Taux de conversion: 1 USD = 640 FCFA
const USD_TO_XAF = 640;

// Frais fixes
const INSURANCE_RATE = 0.025; // 2.5% assurance
const INSPECTION_FEE_XAF = 225000; // 225 000 FCFA pour inspection et documents

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRequestingQuote, setIsRequestingQuote] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    const shippingCostXAF = shippingCostUSD * USD_TO_XAF;
    const insuranceCostXAF = vehiclePriceXAF * INSURANCE_RATE;
    const inspectionFeeXAF = INSPECTION_FEE_XAF;

    const totalXAF = vehiclePriceXAF + shippingCostXAF + insuranceCostXAF + inspectionFeeXAF;

    return {
      vehiclePrice: Math.round(vehiclePriceXAF),
      shippingCost: Math.round(shippingCostXAF),
      insuranceCost: Math.round(insuranceCostXAF),
      inspectionFee: Math.round(inspectionFeeXAF),
      total: Math.round(totalXAF),
    };
  }, [vehiclePriceUSD, vehicleSource, selectedDestination]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const handleRequestQuote = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/cars/${vehicleId}&action=quote`);
      return;
    }

    setIsRequestingQuote(true);

    // Store quote request data in session storage for PDF generation
    const quoteData = {
      vehicleId,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehiclePriceUSD,
      vehicleSource,
      destination: selectedDestination,
      calculations,
      userId: user.id,
      userEmail: user.email,
      requestedAt: new Date().toISOString(),
    };

    sessionStorage.setItem('pendingQuote', JSON.stringify(quoteData));

    // TODO: Redirect to quote generation page
    router.push(`/dashboard/quotes/new?vehicleId=${vehicleId}`);
  };

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
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              'w-full px-4 py-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl',
              'text-left flex items-center justify-between',
              'hover:border-mandarin/50 transition-colors',
              'text-[var(--text-primary)]'
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
                'w-5 h-5 text-[var(--text-muted)] transition-transform',
                isDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 top-full left-0 right-0 mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-lg overflow-hidden"
              >
                {/* Search Input */}
                <div className="p-2 border-b border-[var(--card-border)]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Rechercher un pays ou une ville..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-mandarin"
                    />
                  </div>
                </div>
                {/* Destinations List */}
                <div className="max-h-64 overflow-y-auto">
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
                          selectedDestination?.id === dest.id && 'bg-mandarin/10'
                        )}
                      >
                        <span className="text-xl">{dest.flag}</span>
                        <div>
                          <span className="text-[var(--text-primary)] font-medium">{dest.name}</span>
                          <span className="text-[var(--text-muted)] text-sm ml-1">({dest.country})</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-[var(--text-muted)]">
                      Aucune destination trouvée
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
                <span className="text-[var(--text-muted)]">Transport maritime</span>
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
              disabled={isRequestingQuote}
              leftIcon={
                isRequestingQuote ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )
              }
            >
              {isRequestingQuote ? 'Chargement...' : 'Obtenir un devis PDF'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
