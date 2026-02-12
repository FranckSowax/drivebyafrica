'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Loader2, Check, Bell, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

interface PriceRequestButtonProps {
  vehicleId: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleSource?: string;
  className?: string;
}

interface PriceRequest {
  id: string;
  quote_number: string;
  status: string;
  admin_price_usd?: number;
  created_at: string;
}

export function PriceRequestButton({
  vehicleId,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  vehicleSource = 'dubai',
  className,
}: PriceRequestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<PriceRequest | null>(null);
  const [checkingRequest, setCheckingRequest] = useState(true);
  const user = useAuthStore((state) => state.user);
  const toast = useToast();
  const router = useRouter();

  // Check for existing price request
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!user) {
        setCheckingRequest(false);
        return;
      }

      try {
        const response = await fetch(`/api/price-request?vehicle_id=${vehicleId}`);
        const data = await response.json();

        if (data.requests && data.requests.length > 0) {
          // Find most recent pending or price_received request
          const activeRequest = data.requests.find(
            (r: PriceRequest) => r.status === 'pending' || r.status === 'price_received'
          );
          if (activeRequest) {
            setExistingRequest(activeRequest);
          }
        }
      } catch (error) {
        console.error('Error checking existing request:', error);
      } finally {
        setCheckingRequest(false);
      }
    };

    checkExistingRequest();
  }, [vehicleId, user]);

  const handleRequest = async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/cars/${vehicleId}?action=price-request`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/price-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          vehicle_make: vehicleMake,
          vehicle_model: vehicleModel,
          vehicle_year: vehicleYear,
          vehicle_source: vehicleSource,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.info('Une demande de prix est déjà en cours pour ce véhicule');
          setExistingRequest({
            id: '',
            quote_number: data.existingQuoteNumber,
            status: 'pending',
            created_at: new Date().toISOString()
          });
        } else {
          throw new Error(data.error || 'Erreur lors de la demande');
        }
        return;
      }

      toast.success('Demande envoyée! Vous recevrez une notification avec le prix.');
      setExistingRequest({
        id: '',
        quote_number: data.quote_number,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Price request error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la demande');
    } finally {
      setLoading(false);
    }
  };

  if (checkingRequest) {
    return (
      <Button variant="outline" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Chargement...
      </Button>
    );
  }

  // If there's an existing request
  if (existingRequest) {
    const isPriceReceived = existingRequest.status === 'price_received';

    if (isPriceReceived && existingRequest.admin_price_usd) {
      return (
        <div className={cn('space-y-2', className)}>
          <div className="flex items-center gap-2 p-3 bg-jewel/10 border border-jewel/30 rounded-lg">
            <Check className="w-5 h-5 text-jewel" />
            <div>
              <p className="text-sm font-medium text-jewel">Prix reçu!</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                ${existingRequest.admin_price_usd.toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push(`/dashboard/quotes?quote=${existingRequest.quote_number}`)}
          >
            Voir le devis complet
          </Button>
        </div>
      );
    }

    return (
      <div className={cn('p-3 bg-mandarin/10 border border-mandarin/30 rounded-lg', className)}>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-mandarin animate-pulse" />
          <div>
            <p className="text-sm font-medium text-mandarin">Demande en cours</p>
            <p className="text-xs text-[var(--text-muted)]">
              Réf: {existingRequest.quote_number}
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Vous serez notifié par WhatsApp dès que nous aurons le prix.
        </p>
      </div>
    );
  }

  // No existing request - show request button
  return (
    <Button
      variant="primary"
      onClick={handleRequest}
      disabled={loading}
      leftIcon={
        loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : user ? (
          <DollarSign className="w-4 h-4" />
        ) : (
          <LogIn className="w-4 h-4" />
        )
      }
      className={cn('w-full bg-gradient-to-r from-mandarin to-orange-600', className)}
    >
      {loading
        ? 'Envoi en cours...'
        : user
          ? 'Demander le prix'
          : 'Connectez-vous pour demander le prix'}
    </Button>
  );
}
