'use client';

import { useState } from 'react';
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
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';

interface QuoteValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: {
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
  } | null;
}

// Montant de l'acompte fixe (taux special depot: 1000 USD = 600 000 FCFA)

export function QuoteValidationModal({ isOpen, onClose, quote }: QuoteValidationModalProps) {
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStripePayment = async () => {
    setIsProcessing(true);
    toast.info('Paiement par carte', 'Redirection vers Stripe...');
    // TODO: Implement Stripe checkout
    setTimeout(() => {
      setIsProcessing(false);
    }, 1500);
  };

  const handleMobileMoneyPayment = () => {
    toast.info('Mobile Money', 'Contactez-nous sur WhatsApp pour payer par Mobile Money');
    window.open(
      `https://wa.me/24177000000?text=Bonjour, je souhaite payer l'acompte pour le devis ${quote?.quote_number} par Mobile Money`,
      '_blank'
    );
  };

  // Demo button - simulates deposit payment and creates order
  const handleDemoPayment = async () => {
    if (!quote || !user) {
      toast.error('Erreur', 'Vous devez être connecté');
      return;
    }

    setIsProcessing(true);
    toast.info('Mode Demo', 'Simulation du paiement en cours...');

    try {
      // 1. Update quote status to 'accepted'
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (quoteError) throw quoteError;

      // 2. Create order with deposit_received status (simulating paid deposit)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          vehicle_id: quote.vehicle_id,
          quote_id: quote.id,
          vehicle_price_usd: quote.vehicle_price_usd,
          destination_country: quote.destination_country,
          destination_port: quote.destination_name || null,
          shipping_method: 'sea',
          container_type: 'shared',
          status: 'deposit_received', // Simulate deposit paid
          deposit_amount_usd: 1000,
          deposit_paid_at: new Date().toISOString(),
          documents: {},
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Create tracking entries
      await supabase.from('order_tracking').insert([
        {
          order_id: order.id,
          status: 'created',
          title: 'Commande créée',
          description: 'Votre commande a été créée avec succès.',
          completed_at: new Date(Date.now() - 60000).toISOString(), // 1 min ago
        },
        {
          order_id: order.id,
          status: 'deposit_received',
          title: 'Acompte reçu (Demo)',
          description: 'Acompte de $1,000 simulé. Le véhicule est maintenant bloqué.',
          completed_at: new Date().toISOString(),
        }
      ]);

      // 4. Mark vehicle as reserved
      await supabase
        .from('vehicles')
        .update({ status: 'reserved' })
        .eq('id', quote.vehicle_id);

      toast.success('Paiement simulé!', 'Redirection vers votre commande...');

      // Close modal and redirect to order page
      onClose();
      router.push(`/dashboard/orders/${order.id}`);

    } catch (error) {
      console.error('Demo payment error:', error);
      toast.error('Erreur', 'Une erreur est survenue lors de la simulation');
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = [
    {
      icon: CreditCard,
      title: "Paiement de l'acompte",
      description: "1 000 USD (600 000 FCFA) pour bloquer le vehicule et lancer l'inspection.",
      active: true
    },
    {
      icon: FileCheck,
      title: "Inspection detaillee",
      description: "Nos experts verifient le vehicule et vous envoient un rapport complet.",
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
      description: "Le vehicule est charge et expedie vers votre destination.",
      active: false
    }
  ];

  if (!isOpen || !quote) return null;

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
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Validation du devis
                </h2>
                <p className="text-sm text-gray-500">
                  {quote.vehicle_make} {quote.vehicle_model} ({quote.vehicle_year}) - N° {quote.quote_number}
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

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
                    Votre acompte est securise. Si le rapport d'inspection ne vous satisfait pas, vous pouvez choisir un autre vehicule ou demander un remboursement integral.
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
                      Acompte pour bloquer le vehicule
                    </p>
                    <p className="text-xs text-gray-500">
                      Declenche l'inspection detaillee du vehicule
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-green-600">1 000 USD</p>
                    <p className="text-sm font-medium text-gray-600">≈ 600 000 FCFA</p>
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

                    {/* Demo - simulates payment */}
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
