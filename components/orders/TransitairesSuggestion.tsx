'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  Briefcase,
  Phone,
  MessageCircle,
  Mail,
  Star,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Globe,
} from 'lucide-react';

interface Transitaire {
  id: string;
  name: string;
  company_name: string | null;
  country: string;
  port: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  description: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
}

interface TransitairesSuggestionProps {
  destinationCountry: string;
  destinationPort?: string;
  orderId: string;
}

const SPECIALTY_LABELS: Record<string, string> = {
  vehicles: 'Véhicules',
  heavy_machinery: 'Engins lourds',
  containers: 'Conteneurs',
  general_cargo: 'Cargo général',
};

const LANGUAGE_LABELS: Record<string, string> = {
  french: 'FR',
  english: 'EN',
  chinese: 'ZH',
  arabic: 'AR',
  spanish: 'ES',
};

export function TransitairesSuggestion({
  destinationCountry,
  destinationPort,
  orderId,
}: TransitairesSuggestionProps) {
  const [transitaires, setTransitaires] = useState<Transitaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true); // Expanded by default
  const [selectedTransitaire, setSelectedTransitaire] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (destinationCountry) {
      fetchTransitaires();
    }
  }, [destinationCountry, destinationPort]);

  const fetchTransitaires = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ country: destinationCountry });
      if (destinationPort) {
        params.append('port', destinationPort);
      }

      const response = await fetch(`/api/transitaires?${params}`);
      const data = await response.json();

      if (data.transitaires) {
        setTransitaires(data.transitaires);
      }
    } catch (error) {
      console.error('Error fetching transitaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactClick = async (transitaire: Transitaire, method: 'whatsapp' | 'phone' | 'email') => {
    // Track the selection
    try {
      await fetch('/api/transitaires/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          transitaire_id: transitaire.id,
          contact_method: method,
        }),
      });
    } catch {
      // Silent fail for tracking
    }

    setSelectedTransitaire(transitaire.id);

    // Open contact method
    if (method === 'whatsapp') {
      const message = encodeURIComponent(
        `Bonjour ${transitaire.name}, je suis client Driveby Africa et j'ai besoin de vos services de transitaire pour le dédouanement de mon véhicule.`
      );
      window.open(`https://wa.me/${transitaire.whatsapp?.replace(/\D/g, '')}?text=${message}`, '_blank');
    } else if (method === 'phone') {
      window.open(`tel:${transitaire.phone}`, '_blank');
    } else if (method === 'email' && transitaire.email) {
      window.open(`mailto:${transitaire.email}?subject=Demande de dédouanement véhicule - Client Driveby Africa`, '_blank');
    }

    toast.success('Contact copié ! Le transitaire sera informé.');
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-500'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-4 bg-cod-gray/50 border-nobel/20 animate-pulse">
        <div className="h-20 bg-nobel/20 rounded"></div>
      </Card>
    );
  }

  if (transitaires.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-nobel/20 bg-gradient-to-br from-cod-gray to-cod-gray/80">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-nobel/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-mandarin/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-mandarin" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Transitaires recommandés</h3>
              <p className="text-sm text-gray-400">
                {transitaires.length} transitaire{transitaires.length > 1 ? 's' : ''} disponible{transitaires.length > 1 ? 's' : ''} à {destinationPort || destinationCountry}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      {expanded && (
        <div className="px-4 pb-2">
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              Ces transitaires sont des recommandations basées sur les avis clients.
              Driveby Africa ne se porte pas garant de leurs services.
              Après votre expérience, nous vous demanderons un retour pour aider les futurs clients.
            </p>
          </div>
        </div>
      )}

      {/* Transitaires List */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {transitaires.map(transitaire => (
            <div
              key={transitaire.id}
              className={`p-4 rounded-xl border transition-all ${
                selectedTransitaire === transitaire.id
                  ? 'border-mandarin bg-mandarin/5'
                  : 'border-nobel/20 bg-nobel/5 hover:border-nobel/40'
              }`}
            >
              {/* Transitaire Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{transitaire.name}</span>
                    {transitaire.is_verified && (
                      <span className="flex items-center gap-1 text-xs text-blue-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Vérifié
                      </span>
                    )}
                  </div>
                  {transitaire.company_name && (
                    <p className="text-sm text-gray-400">{transitaire.company_name}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {renderStars(transitaire.average_rating)}
                  <span className="text-xs text-gray-500">
                    {transitaire.total_reviews} avis
                  </span>
                </div>
              </div>

              {/* Description */}
              {transitaire.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {transitaire.description}
                </p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {transitaire.port && (
                  <span className="px-2 py-0.5 bg-nobel/20 rounded text-xs text-gray-300">
                    📍 {transitaire.port}
                  </span>
                )}
                {transitaire.specialties?.includes('vehicles') && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                    🚗 Véhicules
                  </span>
                )}
                {transitaire.languages && transitaire.languages.length > 0 && (
                  <span className="px-2 py-0.5 bg-nobel/20 rounded text-xs text-gray-300 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {transitaire.languages.map(l => LANGUAGE_LABELS[l] || l).join(', ')}
                  </span>
                )}
              </div>

              {/* Contact Buttons */}
              <div className="flex flex-wrap gap-2">
                {transitaire.whatsapp && (
                  <Button
                    size="sm"
                    onClick={() => handleContactClick(transitaire, 'whatsapp')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    leftIcon={<MessageCircle className="w-4 h-4" />}
                  >
                    WhatsApp
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContactClick(transitaire, 'phone')}
                  leftIcon={<Phone className="w-4 h-4" />}
                >
                  {transitaire.phone}
                </Button>
                {transitaire.email && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleContactClick(transitaire, 'email')}
                    leftIcon={<Mail className="w-4 h-4" />}
                  >
                    Email
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
