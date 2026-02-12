'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Phase = 'init' | 'portal' | 'polling' | 'success' | 'error';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { externalReference: string; paymentMethod: string }) => void;
  amount: number;
  description: string;
  quoteNumber: string;
}

const POLL_INTERVAL = 3000;
const MAX_ATTEMPTS = 60;

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  description,
  quoteNumber,
}: PaymentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('init');
  const [portalUrl, setPortalUrl] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isClosed = useRef(false);

  useEffect(() => {
    setMounted(true);
    return () => { setMounted(false); };
  }, []);

  // Cleanup polling on unmount or close
  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      isClosed.current = false;
      setPhase('init');
      setPortalUrl('');
      setExternalRef('');
      setErrorMessage('');
      setPollCount(0);
      stopPolling();
    } else {
      isClosed.current = true;
      stopPolling();
    }
  }, [isOpen, stopPolling]);

  // Step 1: Initialize payment when modal opens
  useEffect(() => {
    if (!isOpen || phase !== 'init') return;

    let cancelled = false;

    const initPayment = async () => {
      try {
        const res = await fetch('/api/payment/init', {
          method: 'POST',
          body: JSON.stringify({ amount, description }),
        });

        if (cancelled || isClosed.current) return;

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || 'Erreur lors de l\'initialisation du paiement');
          setPhase('error');
          return;
        }

        setPortalUrl(data.portalUrl);
        setExternalRef(data.externalReference);
        setPhase('portal');
      } catch {
        if (cancelled || isClosed.current) return;
        setErrorMessage('Erreur réseau. Vérifiez votre connexion.');
        setPhase('error');
      }
    };

    initPayment();
    return () => { cancelled = true; };
  }, [isOpen, phase, amount, description]);

  // Step 3: Start polling when user clicks "J'ai payé"
  const startPolling = useCallback(() => {
    if (!externalRef) return;
    setPhase('polling');
    setPollCount(0);

    let attempts = 0;

    pollTimer.current = setInterval(async () => {
      if (isClosed.current) {
        stopPolling();
        return;
      }

      attempts++;
      setPollCount(attempts);

      try {
        const res = await fetch(`/api/payment/status?ref=${encodeURIComponent(externalRef)}`);
        const data = await res.json();

        if (data.completed || data.status === 'completed') {
          stopPolling();
          setPhase('success');
          // Trigger success callback after animation
          setTimeout(() => {
            if (!isClosed.current) {
              onSuccess({ externalReference: externalRef, paymentMethod: 'mobile_money' });
            }
          }, 1500);
          return;
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          stopPolling();
          setErrorMessage(
            data.status === 'cancelled'
              ? 'Paiement annulé.'
              : 'Le paiement a échoué. Veuillez réessayer.'
          );
          setPhase('error');
          return;
        }
      } catch {
        // Network error — continue polling
      }

      if (attempts >= MAX_ATTEMPTS) {
        stopPolling();
        setErrorMessage('Délai de vérification dépassé. Si vous avez payé, contactez-nous.');
        setPhase('error');
      }
    }, POLL_INTERVAL);
  }, [externalRef, onSuccess, stopPolling]);

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  const handleRetry = () => {
    setPhase('init');
    setErrorMessage('');
  };

  const formatAmount = (val: number) =>
    Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={phase !== 'polling' ? handleClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-mandarin/10 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-mandarin" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Paiement sécurisé</h2>
                  <p className="text-xs text-gray-500">E-Billing — Mobile Money & Carte</p>
                </div>
              </div>
              {phase !== 'polling' && (
                <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {/* ── Phase INIT ── */}
              {phase === 'init' && (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <Loader2 className="w-10 h-10 animate-spin text-mandarin mb-4" />
                  <p className="text-gray-700 font-medium">Préparation du paiement...</p>
                  <p className="text-xs text-gray-400 mt-2">Connexion à la passerelle sécurisée</p>
                </div>
              )}

              {/* ── Phase PORTAL ── */}
              {phase === 'portal' && (
                <div className="flex flex-col">
                  {/* Amount summary */}
                  <div className="px-5 py-3 bg-mandarin/5 border-b border-mandarin/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Montant à payer</span>
                      <span className="text-lg font-bold text-mandarin">{formatAmount(amount)} FCFA</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Devis {quoteNumber}</p>
                  </div>

                  {/* iframe */}
                  <div className="relative" style={{ height: '450px' }}>
                    <iframe
                      src={portalUrl}
                      className="w-full h-full border-0"
                      title="Portail de paiement E-Billing"
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation"
                    />
                  </div>

                  {/* "J'ai payé" button */}
                  <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
                    <Button
                      variant="primary"
                      className="w-full py-3"
                      onClick={startPolling}
                      leftIcon={<CreditCard className="w-4 h-4" />}
                    >
                      J'ai effectué le paiement
                    </Button>
                    <p className="text-[10px] text-gray-400 text-center mt-2">
                      Cliquez après avoir validé le paiement sur le portail ci-dessus
                    </p>
                  </div>
                </div>
              )}

              {/* ── Phase POLLING ── */}
              {phase === 'polling' && (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="relative mb-6">
                    <Loader2 className="w-12 h-12 animate-spin text-mandarin" />
                  </div>
                  <p className="text-gray-700 font-medium text-center">
                    {pollCount <= 5
                      ? 'Vérification du paiement en cours...'
                      : pollCount <= 10
                        ? 'Validation du paiement... Veuillez patienter.'
                        : `Vérification en cours... (${pollCount}/${MAX_ATTEMPTS})`}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Ne fermez pas cette fenêtre
                  </p>
                  {/* Progress bar */}
                  <div className="w-full max-w-xs mt-6 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-mandarin rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min((pollCount / MAX_ATTEMPTS) * 100, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* ── Phase SUCCESS ── */}
              {phase === 'success' && (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                  </motion.div>
                  <p className="text-xl font-bold text-gray-900">Paiement confirmé !</p>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Votre acompte a été reçu. Création de votre commande...
                  </p>
                </div>
              )}

              {/* ── Phase ERROR ── */}
              {phase === 'error' && (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <XCircle className="w-16 h-16 text-red-400 mb-4" />
                  <p className="text-lg font-bold text-gray-900 text-center">Erreur de paiement</p>
                  <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
                    {errorMessage}
                  </p>
                  <div className="flex gap-3 mt-6">
                    <Button variant="primary" onClick={handleRetry}>
                      Réessayer
                    </Button>
                    <Button variant="outline" onClick={handleClose}>
                      Fermer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
