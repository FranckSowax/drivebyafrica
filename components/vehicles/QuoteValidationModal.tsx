'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  FileCheck,
  Ship,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Play,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/useAuthStore';

interface QuoteItem {
  id: string;
  quote_number: string;
  vehicle_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_price_usd: number;
  destination_country: string;
  destination_name?: string;
  total_cost_xaf: number;
  group_id?: string | null;
  group_vehicle_count?: number;
  container_type?: string;
}

interface QuoteValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: QuoteItem[];
}

const DEPOSIT_PER_VEHICLE_USD = 1000;
const DEPOSIT_PER_VEHICLE_XAF = 600000;

export function QuoteValidationModal({ isOpen, onClose, quotes }: QuoteValidationModalProps) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const isGrouped = quotes.length > 1;
  const vehicleCount = quotes.length;
  const totalDepositUSD = DEPOSIT_PER_VEHICLE_USD * vehicleCount;
  const totalDepositXAF = DEPOSIT_PER_VEHICLE_XAF * vehicleCount;
  const totalCostXaf = quotes.reduce((sum, q) => sum + q.total_cost_xaf, 0);
  const firstQuote = quotes[0];

  const handleStripePayment = async () => {
    toast.info('Bientôt disponible', 'Le paiement par carte sera disponible prochainement. Utilisez Mobile Money ou le mode Demo.');
  };

  const handleMobileMoneyPayment = () => {
    toast.info('Mobile Money', 'Contactez-nous sur WhatsApp pour payer par Mobile Money');
    const quoteRef = isGrouped
      ? `groupé (${vehicleCount} véhicules)`
      : firstQuote?.quote_number;
    window.open(
      `https://wa.me/24177000000?text=Bonjour, je souhaite payer l'acompte pour le devis ${quoteRef} par Mobile Money`,
      '_blank'
    );
  };

  const handleDemoPayment = async () => {
    if (!quotes.length || !user) {
      toast.error('Erreur', 'Vous devez être connecté');
      return;
    }

    setIsProcessing(true);
    toast.info('Mode Demo', 'Simulation du paiement en cours...');

    try {
      let lastOrderId: string | null = null;

      for (const quote of quotes) {
        const response = await fetch('/api/orders/from-quote', {
          method: 'POST',
          body: JSON.stringify({
            quoteId: quote.id,
            groupId: quote.group_id || undefined,
          }),
        });

        if (response.status === 401) {
          toast.error('Session expirée', 'Veuillez vous reconnecter');
          onClose();
          router.push('/login?redirect=/dashboard/quotes');
          return;
        }

        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error('Erreur de communication avec le serveur');
        }

        if (!response.ok) {
          throw new Error(data?.error || 'Erreur lors de la création de la commande');
        }

        lastOrderId = data.order.id;
      }

      if (isGrouped) {
        toast.success('Paiement simulé!', `${vehicleCount} commandes créées. Redirection...`);
      } else {
        toast.success('Paiement simulé!', 'Redirection vers votre commande...');
      }

      onClose();
      if (isGrouped) {
        router.push('/dashboard/orders');
      } else if (lastOrderId) {
        router.push(`/dashboard/orders/${lastOrderId}`);
      }
    } catch (error) {
      console.error('Demo payment error:', error);
      if (error instanceof TypeError) {
        toast.error('Erreur réseau', 'Vérifiez votre connexion internet et réessayez');
      } else {
        toast.error('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    {
      icon: CreditCard,
      title: "Paiement de l'acompte",
      description: isGrouped
        ? `${totalDepositUSD.toLocaleString()} USD (${totalDepositXAF.toLocaleString()} FCFA) pour bloquer les ${vehicleCount} véhicules et lancer les inspections.`
        : "1 000 USD (600 000 FCFA) pour bloquer le vehicule et lancer l'inspection.",
      active: true
    },
    {
      icon: FileCheck,
      title: "Inspection detaillee",
      description: isGrouped
        ? "Nos experts vérifient chaque véhicule et vous envoient les rapports complets."
        : "Nos experts verifient le vehicule et vous envoient un rapport complet.",
      active: false
    },
    {
      icon: Package,
      title: "Paiement du solde",
      description: "Vous validez l'achat final et reglez le reste du montant.",
      active: false
    },
    {
      icon: Ship,
      title: "Expedition",
      description: isGrouped
        ? "Les véhicules sont chargés dans le container 40ft et expédiés."
        : "Le vehicule est charge et expedie vers votre destination.",
      active: false
    }
  ];

  if (!mounted || !isOpen || !quotes.length) return null;

  const formatCurrency = (amount: number) => {
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} FCFA`;
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            onTouchMove={(e: React.TouchEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isGrouped ? 'Validation du devis groupé' : 'Validation du devis'}
                </h2>
                <p className="text-sm text-gray-500">
                  {isGrouped
                    ? `Container 40ft - ${vehicleCount} véhicules`
                    : `${firstQuote.vehicle_make} ${firstQuote.vehicle_model} (${firstQuote.vehicle_year}) - N° ${firstQuote.quote_number}`
                  }
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">

              {/* Grouped vehicles list */}
              {isGrouped && (
                <div className="space-y-2">
                  {quotes.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {q.vehicle_make} {q.vehicle_model} ({q.vehicle_year})
                      </span>
                      <span className="text-sm font-bold text-orange-500">
                        {formatCurrency(q.total_cost_xaf)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Total estimé</span>
                    <span className="text-base font-bold text-orange-500">
                      {formatCurrency(totalCostXaf)}
                    </span>
                  </div>
                </div>
              )}

              {/* Alert / Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 text-sm">
                    Garantie Driveby Africa
                  </h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Votre acompte est securise. Si le rapport d&apos;inspection ne vous satisfait pas, vous pouvez choisir un autre vehicule ou demander un remboursement integral.
                  </p>
                </div>
              </div>

              {/* Timeline Steps */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                  Prochaines etapes
                </h3>
                <div className="space-y-4 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {steps.map((step, index) => (
                    <div key={index} className="relative flex items-start gap-4">
                      <div className={`
                        relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shrink-0
                        ${step.active ? 'bg-mandarin text-white' : 'bg-gray-100 text-gray-400'}
                      `}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="pt-1">
                        <h4 className={`font-bold ${step.active ? 'text-mandarin' : 'text-gray-900'}`}>
                          {step.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-900">
                      {isGrouped
                        ? `Acompte pour bloquer les ${vehicleCount} véhicules`
                        : 'Acompte pour bloquer le vehicule'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {isGrouped
                        ? `Déclenche les inspections détaillées (${DEPOSIT_PER_VEHICLE_USD.toLocaleString()} USD × ${vehicleCount})`
                        : "Declenche l'inspection detaillee du vehicule"
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-green-600">
                      {totalDepositUSD.toLocaleString()} USD
                    </p>
                    <p className="text-sm font-medium text-gray-600">
                      ≈ {totalDepositXAF.toLocaleString()} FCFA
                    </p>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Choisissez votre mode de paiement
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Stripe */}
                    <button
                      onClick={handleStripePayment}
                      disabled={isProcessing}
                      className="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group disabled:opacity-50"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">Carte bancaire</p>
                        <p className="text-xs text-gray-500">Visa, Mastercard</p>
                      </div>
                    </button>

                    {/* Mobile Money */}
                    <button
                      onClick={handleMobileMoneyPayment}
                      className="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                    >
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <Smartphone className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">Mobile Money</p>
                        <p className="text-xs text-gray-500">Airtel, MTN, Orange</p>
                      </div>
                    </button>

                    {/* Demo */}
                    <button
                      onClick={handleDemoPayment}
                      disabled={isProcessing}
                      className="flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group disabled:opacity-50"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <Play className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">Demo</p>
                        <p className="text-xs text-gray-500">Simuler le paiement</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                className="w-full"
                onClick={onClose}
              >
                Fermer
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
