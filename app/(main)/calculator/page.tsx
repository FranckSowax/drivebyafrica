'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calculator, Ship, Shield, FileCheck, ArrowRight, Info, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { formatCurrency } from '@/lib/utils/currency';
import { INSURANCE_RATE, INSPECTION_FEE_XAF, getExportTax } from '@/lib/utils/pricing';

// Destinations africaines avec coûts de transport (estimations en USD)
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

const sources = [
  { id: 'korea', name: 'Corée du Sud', flag: '🇰🇷' },
  { id: 'china', name: 'Chine', flag: '🇨🇳' },
  { id: 'dubai', name: 'Dubaï', flag: '🇦🇪' },
];

export default function CalculatorPage() {
  const [vehiclePriceXAF, setVehiclePriceXAF] = useState<number>(5000000); // 5 millions FCFA par défaut
  const [destination, setDestination] = useState(destinations[0]);
  const [source, setSource] = useState(sources[0]);
  const { availableCurrencies } = useCurrency();

  // Get XAF rate dynamically from currency API (default to 630 if not available)
  const xafRate = useMemo(() => {
    const xafCurrency = availableCurrencies.find(c => c.code === 'XAF');
    return xafCurrency?.rateToUsd || 630;
  }, [availableCurrencies]);

  const calculations = useMemo(() => {
    // Pour les véhicules chinois, ajouter silencieusement la taxe export (980$)
    const exportTaxUSD = getExportTax(source.id);
    const exportTaxXAF = exportTaxUSD * xafRate;
    const effectiveVehiclePriceXAF = vehiclePriceXAF + exportTaxXAF;

    const shippingCostUSD = destination.shippingCost[source.id as keyof typeof destination.shippingCost];
    const shippingCostXAF = shippingCostUSD * xafRate;
    // Assurance cargo: 2.5% du (prix véhicule + taxe export + transport maritime)
    const insuranceCostXAF = (effectiveVehiclePriceXAF + shippingCostXAF) * INSURANCE_RATE;
    const inspectionFeeXAF = INSPECTION_FEE_XAF;

    const total = effectiveVehiclePriceXAF + shippingCostXAF + insuranceCostXAF + inspectionFeeXAF;

    return {
      vehiclePrice: Math.round(effectiveVehiclePriceXAF),
      shippingCost: Math.round(shippingCostXAF),
      insuranceCost: Math.round(insuranceCostXAF),
      inspectionFee: Math.round(inspectionFeeXAF),
      total: Math.round(total),
      hasExportTax: exportTaxUSD > 0,
    };
  }, [vehiclePriceXAF, destination, source, xafRate]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-mandarin/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-mandarin/10 border border-mandarin/20 rounded-full px-4 py-2 mb-6">
              <Calculator className="w-4 h-4 text-mandarin" />
              <span className="text-sm text-mandarin">Outil gratuit</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-6">
              Calculateur de <span className="text-mandarin">coût d&apos;importation</span>
            </h1>
            <p className="text-lg text-[var(--text-muted)]">
              Estimez le coût total de votre importation de véhicule, incluant
              le transport maritime, l&apos;assurance et les frais d&apos;inspection.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Input Form */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Paramètres</h2>

                {/* Vehicle Price */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Prix du véhicule (FCFA)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={vehiclePriceXAF}
                      onChange={(e) => setVehiclePriceXAF(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-mandarin"
                      min={500000}
                      step={100000}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">FCFA</span>
                  </div>
                  <input
                    type="range"
                    value={vehiclePriceXAF}
                    onChange={(e) => setVehiclePriceXAF(Number(e.target.value))}
                    min={500000}
                    max={32000000}
                    step={100000}
                    className="w-full mt-3 accent-mandarin"
                  />
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                    <span>500 000 FCFA</span>
                    <span>32 000 000 FCFA</span>
                  </div>
                </div>

                {/* Source */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Pays d&apos;origine
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {sources.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSource(s)}
                        className={`p-3 rounded-xl border text-center transition-colors ${
                          source.id === s.id
                            ? 'border-mandarin bg-mandarin/10 text-[var(--text-primary)]'
                            : 'border-[var(--card-border)] text-[var(--text-muted)] hover:border-mandarin/50'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{s.flag}</span>
                        <span className="text-xs">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Destination */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Destination
                  </label>
                  <select
                    value={destination.id}
                    onChange={(e) => setDestination(destinations.find(d => d.id === e.target.value) || destinations[0])}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-mandarin"
                  >
                    {destinations.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.flag} {dest.name}, {dest.country}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Results */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Estimation des coûts</h2>

                <div className="space-y-4">
                  {/* Price Breakdown */}
                  <div className="flex justify-between items-center py-3 border-b border-[var(--card-border)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">Prix du véhicule (FOB)</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">{formatCurrency(calculations.vehiclePrice)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-[var(--card-border)]">
                    <div className="flex items-center gap-2">
                      <Ship className="w-4 h-4 text-royal-blue" />
                      <span className="text-[var(--text-muted)]">Transport maritime</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">{formatCurrency(calculations.shippingCost)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-[var(--card-border)]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-jewel" />
                      <span className="text-[var(--text-muted)]">Assurance cargo (2.5%)</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">{formatCurrency(calculations.insuranceCost)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-[var(--card-border)]">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-mandarin" />
                      <span className="text-[var(--text-muted)]">Inspection & Documents</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-medium">{formatCurrency(calculations.inspectionFee)}</span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center py-4 bg-mandarin/10 -mx-6 px-6 rounded-b-xl mt-4">
                    <div>
                      <span className="text-xl font-bold text-[var(--text-primary)] block">Coût total estimé</span>
                      {calculations.hasExportTax && (
                        <span className="text-xs text-[var(--text-muted)]">Inclut taxe et douane export</span>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-mandarin">{formatCurrency(calculations.total)}</span>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="mt-6 p-4 bg-[var(--surface)] rounded-xl">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-royal-blue flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--text-muted)]">
                      Cette estimation n&apos;inclut pas les frais de dédouanement qui varient selon la réglementation locale.
                      Contactez-nous pour une estimation personnalisée.
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6">
                  <Link href="/cars">
                    <Button variant="primary" className="w-full" rightIcon={<ArrowRight className="w-5 h-5" />}>
                      Voir les véhicules disponibles
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-20 bg-[var(--surface)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">
              Ce qui est <span className="text-mandarin">inclus</span>
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Ship,
                  title: 'Transport maritime',
                  description: 'Conteneur sécurisé de la Corée/Chine/Dubaï jusqu\'au port de destination',
                },
                {
                  icon: Shield,
                  title: 'Assurance tous risques',
                  description: 'Couverture complète pendant tout le transport maritime',
                },
                {
                  icon: FileCheck,
                  title: 'Documents d\'exportation',
                  description: 'Certificat d\'origine, facture, bill of lading',
                },
                {
                  icon: Calculator,
                  title: 'Frais d\'inspection',
                  description: 'Vérification complète du véhicule avant expédition',
                },
              ].map((item) => (
                <Card key={item.title} className="p-4 flex gap-4">
                  <div className="w-10 h-10 bg-mandarin/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-mandarin" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">{item.title}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{item.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
