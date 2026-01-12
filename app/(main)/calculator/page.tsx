'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calculator, Ship, Shield, FileCheck, ArrowRight, Info, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Taux de conversion: 1 USD = 640 FCFA
const USD_TO_XAF = 640;

const destinations = [
  { id: 'libreville', name: 'Libreville, Gabon', shippingCost: 1800, customsRate: 0.25 },
  { id: 'douala', name: 'Douala, Cameroun', shippingCost: 1700, customsRate: 0.30 },
  { id: 'pointe-noire', name: 'Pointe-Noire, Congo', shippingCost: 1900, customsRate: 0.28 },
  { id: 'abidjan', name: 'Abidjan, Côte d\'Ivoire', shippingCost: 2100, customsRate: 0.22 },
  { id: 'dakar', name: 'Dakar, Sénégal', shippingCost: 2300, customsRate: 0.20 },
];

const sources = [
  { id: 'korea', name: 'Corée du Sud', flag: '🇰🇷' },
  { id: 'china', name: 'Chine', flag: '🇨🇳' },
  { id: 'dubai', name: 'Dubaï', flag: '🇦🇪' },
];

const vehicleTypes = [
  { id: 'sedan', name: 'Berline', multiplier: 1.0 },
  { id: 'suv', name: 'SUV', multiplier: 1.15 },
  { id: 'pickup', name: 'Pick-up', multiplier: 1.20 },
  { id: 'minivan', name: 'Minivan', multiplier: 1.10 },
  { id: 'luxury', name: 'Luxe', multiplier: 1.25 },
];

export default function CalculatorPage() {
  const [vehiclePriceXAF, setVehiclePriceXAF] = useState<number>(5000000); // 5 millions FCFA par défaut
  const [destination, setDestination] = useState(destinations[0]);
  const [source, setSource] = useState(sources[0]);
  const [vehicleType, setVehicleType] = useState(vehicleTypes[0]);

  const calculations = useMemo(() => {
    // Convertir le prix FCFA en USD pour les calculs internes
    const vehiclePriceUSD = vehiclePriceXAF / USD_TO_XAF;

    const auctionFee = vehiclePriceUSD * 0.05; // 5% frais d'enchère
    const shippingCost = destination.shippingCost * vehicleType.multiplier;
    const insuranceCost = vehiclePriceUSD * 0.02; // 2% assurance
    const inspectionFee = 150; // Frais d'inspection fixes (USD)
    const documentFee = 100; // Frais de documents (USD)
    const customsDuty = (vehiclePriceUSD + shippingCost) * destination.customsRate;

    const subtotal = vehiclePriceUSD + auctionFee + shippingCost + insuranceCost + inspectionFee + documentFee;
    const total = subtotal + customsDuty;

    // Tout convertir en FCFA pour l'affichage
    return {
      vehiclePrice: vehiclePriceXAF,
      auctionFee: Math.round(auctionFee * USD_TO_XAF),
      shippingCost: Math.round(shippingCost * USD_TO_XAF),
      insuranceCost: Math.round(insuranceCost * USD_TO_XAF),
      inspectionFee: Math.round(inspectionFee * USD_TO_XAF),
      documentFee: Math.round(documentFee * USD_TO_XAF),
      customsDuty: Math.round(customsDuty * USD_TO_XAF),
      subtotal: Math.round(subtotal * USD_TO_XAF),
      total: Math.round(total * USD_TO_XAF),
    };
  }, [vehiclePriceXAF, destination, vehicleType]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray via-cod-gray to-mandarin/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-mandarin/10 border border-mandarin/20 rounded-full px-4 py-2 mb-6">
              <Calculator className="w-4 h-4 text-mandarin" />
              <span className="text-sm text-mandarin">Outil gratuit</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Calculateur de <span className="text-mandarin">coût d&apos;importation</span>
            </h1>
            <p className="text-lg text-nobel">
              Estimez le coût total de votre importation de véhicule, incluant
              le transport maritime, l&apos;assurance et les frais de douane.
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
                <h2 className="text-xl font-bold text-white mb-6">Paramètres</h2>

                {/* Vehicle Price */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">
                    Prix du véhicule (FCFA)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={vehiclePriceXAF}
                      onChange={(e) => setVehiclePriceXAF(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-cod-gray border border-nobel/20 rounded-xl text-white focus:outline-none focus:border-mandarin"
                      min={500000}
                      step={100000}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-nobel text-sm">FCFA</span>
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
                  <div className="flex justify-between text-xs text-nobel mt-1">
                    <span>500 000 FCFA</span>
                    <span>32 000 000 FCFA</span>
                  </div>
                </div>

                {/* Source */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">
                    Pays d&apos;origine
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {sources.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSource(s)}
                        className={`p-3 rounded-xl border text-center transition-colors ${
                          source.id === s.id
                            ? 'border-mandarin bg-mandarin/10 text-white'
                            : 'border-nobel/20 text-nobel hover:border-nobel/40'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{s.flag}</span>
                        <span className="text-xs">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vehicle Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">
                    Type de véhicule
                  </label>
                  <select
                    value={vehicleType.id}
                    onChange={(e) => setVehicleType(vehicleTypes.find(v => v.id === e.target.value) || vehicleTypes[0])}
                    className="w-full px-4 py-3 bg-cod-gray border border-nobel/20 rounded-xl text-white focus:outline-none focus:border-mandarin"
                  >
                    {vehicleTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">
                    Destination
                  </label>
                  <select
                    value={destination.id}
                    onChange={(e) => setDestination(destinations.find(d => d.id === e.target.value) || destinations[0])}
                    className="w-full px-4 py-3 bg-cod-gray border border-nobel/20 rounded-xl text-white focus:outline-none focus:border-mandarin"
                  >
                    {destinations.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Results */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-white mb-6">Estimation des coûts</h2>

                <div className="space-y-4">
                  {/* Price Breakdown */}
                  <div className="flex justify-between items-center py-3 border-b border-surface">
                    <div className="flex items-center gap-2">
                      <span className="text-nobel">Prix du véhicule</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(calculations.vehiclePrice)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-surface">
                    <div className="flex items-center gap-2">
                      <span className="text-nobel">Frais d&apos;enchère (5%)</span>
                      <HelpCircle className="w-4 h-4 text-nobel cursor-help" />
                    </div>
                    <span className="text-white font-medium">{formatCurrency(calculations.auctionFee)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-surface">
                    <div className="flex items-center gap-2">
                      <Ship className="w-4 h-4 text-royal-blue" />
                      <span className="text-nobel">Transport maritime</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(calculations.shippingCost)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-surface">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-jewel" />
                      <span className="text-nobel">Assurance (2%)</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(calculations.insuranceCost)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-surface">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-mandarin" />
                      <span className="text-nobel">Inspection + Documents</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(calculations.inspectionFee + calculations.documentFee)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-surface bg-surface/30 -mx-6 px-6">
                    <span className="text-white">Sous-total (FOB + Frais)</span>
                    <span className="text-white font-bold">{formatCurrency(calculations.subtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-surface">
                    <div className="flex items-center gap-2">
                      <span className="text-nobel">Droits de douane estimés ({(destination.customsRate * 100).toFixed(0)}%)</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(calculations.customsDuty)}</span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center py-4 bg-mandarin/10 -mx-6 px-6 rounded-b-xl">
                    <span className="text-xl font-bold text-white">Coût total estimé</span>
                    <span className="text-2xl font-bold text-mandarin">{formatCurrency(calculations.total)}</span>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="mt-6 p-4 bg-surface/30 rounded-xl">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-royal-blue flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-nobel">
                      Cette estimation est indicative. Les frais de douane peuvent varier selon le type de véhicule,
                      son année et la réglementation en vigueur. Contactez-nous pour une estimation personnalisée.
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
      <section className="py-20 bg-surface/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
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
                    <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-nobel">{item.description}</p>
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
