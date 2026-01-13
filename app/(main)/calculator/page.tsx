'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calculator, Ship, Shield, FileCheck, ArrowRight, Info, HelpCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Taux de conversion: 1 USD = 640 FCFA
const USD_TO_XAF = 640;

// Frais fixes (nouveaux calculs)
const INSURANCE_RATE = 0.025; // 2.5% assurance
const INSPECTION_FEE_XAF = 225000; // 225 000 FCFA pour inspection et documents

const destinations = [
  { id: 'libreville', name: 'Libreville', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 1800, china: 2100, dubai: 1600 } },
  { id: 'port-gentil', name: 'Port-Gentil', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 1850, china: 2150, dubai: 1650 } },
  { id: 'douala', name: 'Douala', country: 'Cameroun', flag: '🇨🇲', shippingCost: { korea: 1700, china: 2000, dubai: 1500 } },
  { id: 'pointe-noire', name: 'Pointe-Noire', country: 'Congo', flag: '🇨🇬', shippingCost: { korea: 1900, china: 2200, dubai: 1700 } },
  { id: 'abidjan', name: 'Abidjan', country: "Côte d'Ivoire", flag: '🇨🇮', shippingCost: { korea: 2100, china: 2400, dubai: 1900 } },
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', flag: '🇸🇳', shippingCost: { korea: 2300, china: 2600, dubai: 2100 } },
  { id: 'lome', name: 'Lomé', country: 'Togo', flag: '🇹🇬', shippingCost: { korea: 2000, china: 2300, dubai: 1800 } },
  { id: 'cotonou', name: 'Cotonou', country: 'Bénin', flag: '🇧🇯', shippingCost: { korea: 2050, china: 2350, dubai: 1850 } },
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

  const calculations = useMemo(() => {
    const vehiclePriceUSD = vehiclePriceXAF / USD_TO_XAF;
    const shippingCostUSD = destination.shippingCost[source.id as keyof typeof destination.shippingCost];
    const shippingCostXAF = shippingCostUSD * USD_TO_XAF;
    const insuranceCostXAF = vehiclePriceXAF * INSURANCE_RATE;
    const inspectionFeeXAF = INSPECTION_FEE_XAF;

    const total = vehiclePriceXAF + shippingCostXAF + insuranceCostXAF + inspectionFeeXAF;

    return {
      vehiclePrice: Math.round(vehiclePriceXAF),
      shippingCost: Math.round(shippingCostXAF),
      insuranceCost: Math.round(insuranceCostXAF),
      inspectionFee: Math.round(inspectionFeeXAF),
      total: Math.round(total),
    };
  }, [vehiclePriceXAF, destination, source]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

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
                      <span className="text-[var(--text-muted)]">Assurance (2.5%)</span>
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
                    <span className="text-xl font-bold text-[var(--text-primary)]">Coût total estimé</span>
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
