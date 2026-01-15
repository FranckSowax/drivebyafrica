'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle, 
  ArrowRight, 
  Wallet, 
  AlertCircle,
  FileCheck,
  Ship,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

interface QuoteValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: {
    id: string;
    quote_number: string;
    vehicle_make: string;
    vehicle_model: string;
    vehicle_year: number;
    total_cost_xaf: number;
  } | null;
}

// Montant de l'acompte fixe
const DEPOSIT_AMOUNT_USD = 1000;
const DEPOSIT_AMOUNT_XAF = 640000; // 1000 * 640

export function QuoteValidationModal({ isOpen, onClose, quote }: QuoteValidationModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // À connecter avec le vrai solde du wallet plus tard
  const userBalance = 0; // Pour l'instant 0 comme vu dans le wallet page
  const hasInsufficientFunds = userBalance < DEPOSIT_AMOUNT_XAF;

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Simulation de vérification ou redirection
    setTimeout(() => {
      if (hasInsufficientFunds) {
        toast.error('Solde insuffisant. Veuillez recharger votre portefeuille.');
        // Rediriger vers le wallet pour recharger
        router.push('/dashboard/wallet');
      } else {
        // Logique de paiement (à implémenter)
        toast.success('Paiement effectué avec succès !');
        onClose();
      }
      setIsProcessing(false);
    }, 1000);
  };

  const steps = [
    {
      icon: CreditCard,
      title: "Paiement de l'acompte",
      description: "1 000 USD (640 000 FCFA) pour bloquer le véhicule et lancer l'inspection.",
      active: true
    },
    {
      icon: FileCheck,
      title: "Inspection détaillée",
      description: "Nos experts vérifient le véhicule et vous envoient un rapport complet.",
      active: false
    },
    {
      icon: Wallet,
      title: "Paiement du solde",
      description: "Vous validez l'achat final et réglez le reste du montant.",
      active: false
    },
    {
      icon: Ship,
      title: "Expédition",
      description: "Le véhicule est chargé et expédié vers votre destination.",
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
            className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Validation du devis
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {quote.vehicle_make} {quote.vehicle_model} ({quote.vehicle_year}) - N° {quote.quote_number}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Alert / Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                  <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                    Garantie Driveby Africa
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Votre acompte est sécurisé. Si le rapport d'inspection ne vous satisfait pas, vous pouvez choisir un autre véhicule ou demander un remboursement intégral.
                  </p>
                </div>
              </div>

              {/* Timeline Steps */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                  Prochaines étapes
                </h3>
                <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
                  {steps.map((step, index) => (
                    <div key={index} className="relative flex items-start gap-4">
                      <div className={`
                        relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shrink-0
                        ${step.active ? 'bg-mandarin text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}
                      `}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="pt-1">
                        <h4 className={`font-bold ${step.active ? 'text-mandarin' : 'text-gray-900 dark:text-white'}`}>
                          {step.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acompte à régler
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">
                        640 000
                      </span>
                      <span className="text-sm font-bold text-gray-500 dark:text-gray-400">FCFA</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Soit 1 000 USD</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Votre solde actuel</p>
                    <p className={`font-bold ${hasInsufficientFunds ? 'text-red-500' : 'text-green-500'}`}>
                      {new Intl.NumberFormat('fr-FR').format(userBalance)} FCFA
                    </p>
                  </div>
                </div>

                {hasInsufficientFunds && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>Solde insuffisant pour régler l'acompte.</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full h-12 text-lg"
                  onClick={handlePayment}
                  disabled={isProcessing}
                  leftIcon={hasInsufficientFunds ? <Wallet className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                >
                  {isProcessing ? 'Traitement...' : hasInsufficientFunds ? 'Recharger mon compte' : 'Payer l\'acompte'}
                </Button>
                
                <p className="text-center text-xs text-gray-400 mt-3">
                  Paiement sécurisé via votre portefeuille Driveby Africa
                </p>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
