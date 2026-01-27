'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  MapPin,
  Check,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { authFetch } from '@/lib/supabase/auth-helpers';
import { useCurrency } from '@/components/providers/LocaleProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { formatMileage } from '@/lib/utils/formatters';
import { parseImagesField, getProxiedImageUrls } from '@/lib/utils/imageProxy';
import { getExportTax } from '@/lib/utils/pricing';
import { cn } from '@/lib/utils';

interface ProposedVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  current_price_usd: number | null;
  mileage: number | null;
  images: string[] | null;
  source: string;
  source_url: string | null;
  fuel_type?: string;
  transmission?: string;
  engine_cc?: number;
  color?: string;
  similarity_score: number;
}

interface Reassignment {
  id: string;
  original_quote_id: string;
  original_vehicle_id: string;
  original_vehicle_make: string;
  original_vehicle_model: string;
  original_vehicle_year: number;
  original_vehicle_price_usd: number;
  reason: string;
  status: string;
  proposed_vehicles: ProposedVehicle[];
  selected_vehicle_id: string | null;
  created_at: string;
}

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const PLACEHOLDER_IMAGE = '/images/placeholder-car.svg';

export default function ReassignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const toast = useToast();
  const { formatPrice } = useCurrency();
  const user = useAuthStore((state) => state.user);

  const [reassignment, setReassignment] = useState<Reassignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<ProposedVehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchReassignment();
  }, [resolvedParams.id]);

  const fetchReassignment = async () => {
    try {
      setIsLoading(true);
      const response = await authFetch(`/api/reassignment/${resolvedParams.id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      const data = await response.json();
      setReassignment(data.reassignment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVehicle = (vehicle: ProposedVehicle) => {
    setSelectedVehicle(vehicle);
    setShowConfirmModal(true);
  };

  const handleConfirmSelection = async () => {
    if (!selectedVehicle || !reassignment) return;

    setIsSubmitting(true);
    try {
      const response = await authFetch(`/api/reassignment/${resolvedParams.id}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sélection');
      }

      toast.success('Véhicule sélectionné avec succès !');
      router.push('/dashboard/quotes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sélection');
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const handleDeclineAll = async () => {
    if (!reassignment) return;

    setIsSubmitting(true);
    try {
      const response = await authFetch(`/api/reassignment/${resolvedParams.id}/decline`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du refus');
      }

      toast.success('Nous vous enverrons de nouvelles propositions sous 2-3 jours.');
      router.push('/dashboard/quotes');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVehicleImages = (vehicle: ProposedVehicle): string[] => {
    const parsed = parseImagesField(vehicle.images);
    return parsed.length > 0 ? getProxiedImageUrls(parsed) : [PLACEHOLDER_IMAGE];
  };

  const nextImage = (vehicleId: string, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [vehicleId]: ((prev[vehicleId] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (vehicleId: string, totalImages: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [vehicleId]: ((prev[vehicleId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
      </div>
    );
  }

  if (error || !reassignment) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Card className="max-w-md mx-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Lien invalide ou expiré
          </h1>
          <p className="text-[var(--text-muted)] mb-4">
            {error || 'Cette page n\'est plus disponible.'}
          </p>
          <Link href="/">
            <Button variant="primary">Retour à l'accueil</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (reassignment.status === 'accepted') {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Card className="max-w-md mx-4 text-center">
          <Check className="w-12 h-12 text-jewel mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Choix déjà effectué
          </h1>
          <p className="text-[var(--text-muted)] mb-4">
            Vous avez déjà sélectionné un véhicule alternatif pour ce devis.
          </p>
          <Link href="/dashboard/quotes">
            <Button variant="primary">Voir mes devis</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--card-border)]">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour à mes devis
          </Link>

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Véhicule non disponible
          </h1>
          <p className="text-[var(--text-muted)] mt-2">
            Le véhicule <span className="font-semibold text-[var(--text-primary)]">
              {reassignment.original_vehicle_make} {reassignment.original_vehicle_model} {reassignment.original_vehicle_year}
            </span> n'est malheureusement plus disponible.
          </p>
          <p className="text-[var(--text-muted)] mt-1">
            Votre acompte de <span className="font-semibold text-mandarin">$1,000</span> reste réservé.
            Choisissez une alternative ci-dessous ou attendez de nouvelles propositions.
          </p>
        </div>
      </div>

      {/* Proposed Vehicles */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
          {reassignment.proposed_vehicles.length} alternative{reassignment.proposed_vehicles.length > 1 ? 's' : ''} proposée{reassignment.proposed_vehicles.length > 1 ? 's' : ''}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reassignment.proposed_vehicles.map((vehicle, index) => {
            const images = getVehicleImages(vehicle);
            const currentIndex = currentImageIndex[vehicle.id] || 0;

            return (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:border-mandarin/50 transition-colors">
                  {/* Image Gallery */}
                  <div className="relative aspect-[4/3] bg-[var(--surface)]">
                    <img
                      src={images[currentIndex]}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); prevImage(vehicle.id, images.length); }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); nextImage(vehicle.id, images.length); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Image Counter */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/50 rounded-full text-xs text-white">
                      {currentIndex + 1} / {images.length}
                    </div>

                    {/* Option Badge */}
                    <Badge className="absolute top-3 left-3 bg-mandarin">
                      Option {index + 1}
                    </Badge>

                    {/* Source Flag */}
                    <div className="absolute top-3 right-3 text-2xl">
                      {SOURCE_FLAGS[vehicle.source] || '🌍'}
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">
                      {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-[var(--text-muted)] text-sm">{vehicle.year}</p>

                    {/* Price - includes export tax silently */}
                    <div className="mt-3 p-3 bg-[var(--surface)] rounded-lg">
                      <p className="text-xs text-[var(--text-muted)]">Prix FOB</p>
                      <p className="text-xl font-bold text-mandarin">
                        {vehicle.current_price_usd
                          ? formatPrice(vehicle.current_price_usd + getExportTax(vehicle.source))
                          : 'Sur demande'}
                      </p>
                    </div>

                    {/* Specs */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-primary)]">
                          {formatMileage(vehicle.mileage)}
                        </span>
                      </div>
                      {vehicle.fuel_type && (
                        <div className="flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-[var(--text-muted)]" />
                          <span className="text-sm text-[var(--text-primary)]">
                            {vehicle.fuel_type}
                          </span>
                        </div>
                      )}
                      {vehicle.transmission && (
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                          <span className="text-sm text-[var(--text-primary)]">
                            {vehicle.transmission}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-primary)]">
                          {vehicle.source.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 space-y-2">
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => handleSelectVehicle(vehicle)}
                      >
                        Choisir cette option
                      </Button>
                      <Link href={`/cars/${vehicle.id}`} target="_blank">
                        <Button variant="outline" className="w-full">
                          Voir les détails
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Decline Option */}
        <div className="mt-8 text-center">
          <p className="text-[var(--text-muted)] mb-4">
            Aucune de ces options ne vous convient ?
          </p>
          <Button
            variant="outline"
            onClick={handleDeclineAll}
            disabled={isSubmitting}
            leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
          >
            Recevoir de nouvelles propositions (2-3 jours)
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--card-bg)] rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              Confirmer votre choix
            </h3>

            <div className="bg-[var(--surface)] rounded-lg p-4 mb-4">
              <p className="font-semibold text-[var(--text-primary)]">
                {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}
              </p>
              <p className="text-mandarin font-bold">
                {selectedVehicle.current_price_usd
                  ? formatPrice(selectedVehicle.current_price_usd + getExportTax(selectedVehicle.source))
                  : 'Prix sur demande'}
              </p>
            </div>

            <p className="text-[var(--text-muted)] text-sm mb-6">
              En confirmant, votre acompte de $1,000 sera transféré vers ce nouveau véhicule
              et le processus de commande continuera.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleConfirmSelection}
                disabled={isSubmitting}
                leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              >
                {isSubmitting ? 'En cours...' : 'Confirmer'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
