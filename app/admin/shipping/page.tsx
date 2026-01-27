'use client';

import { useState, useEffect } from 'react';
import { Ship, Save, Plus, Trash2, Loader2, AlertCircle, Search, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { authFetch } from '@/lib/supabase/auth-helpers';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ShippingRoute {
  id: string;
  destination_id: string;
  destination_name: string;
  destination_country: string;
  destination_flag: string;
  korea_cost_usd: number;
  china_cost_usd: number;
  dubai_cost_usd: number;
  is_active: boolean;
}

// Default destinations (used as fallback) - All African countries with major ports
const DEFAULT_DESTINATIONS: ShippingRoute[] = [
  // Afrique de l'Ouest
  { id: '1', destination_id: 'dakar', destination_name: 'Dakar', destination_country: 'Sénégal', destination_flag: '🇸🇳', korea_cost_usd: 2300, china_cost_usd: 2600, dubai_cost_usd: 2100, is_active: true },
  { id: '2', destination_id: 'abidjan', destination_name: 'Abidjan', destination_country: "Côte d'Ivoire", destination_flag: '🇨🇮', korea_cost_usd: 2100, china_cost_usd: 2400, dubai_cost_usd: 1900, is_active: true },
  { id: '3', destination_id: 'tema', destination_name: 'Tema', destination_country: 'Ghana', destination_flag: '🇬🇭', korea_cost_usd: 2000, china_cost_usd: 2300, dubai_cost_usd: 1800, is_active: true },
  { id: '4', destination_id: 'lagos', destination_name: 'Lagos', destination_country: 'Nigeria', destination_flag: '🇳🇬', korea_cost_usd: 2200, china_cost_usd: 2500, dubai_cost_usd: 2000, is_active: true },
  { id: '5', destination_id: 'lome', destination_name: 'Lomé', destination_country: 'Togo', destination_flag: '🇹🇬', korea_cost_usd: 2000, china_cost_usd: 2300, dubai_cost_usd: 1800, is_active: true },
  { id: '6', destination_id: 'cotonou', destination_name: 'Cotonou', destination_country: 'Bénin', destination_flag: '🇧🇯', korea_cost_usd: 2050, china_cost_usd: 2350, dubai_cost_usd: 1850, is_active: true },
  { id: '7', destination_id: 'conakry', destination_name: 'Conakry', destination_country: 'Guinée', destination_flag: '🇬🇳', korea_cost_usd: 2400, china_cost_usd: 2700, dubai_cost_usd: 2200, is_active: true },
  { id: '8', destination_id: 'freetown', destination_name: 'Freetown', destination_country: 'Sierra Leone', destination_flag: '🇸🇱', korea_cost_usd: 2500, china_cost_usd: 2800, dubai_cost_usd: 2300, is_active: true },
  { id: '9', destination_id: 'monrovia', destination_name: 'Monrovia', destination_country: 'Liberia', destination_flag: '🇱🇷', korea_cost_usd: 2450, china_cost_usd: 2750, dubai_cost_usd: 2250, is_active: true },
  { id: '10', destination_id: 'banjul', destination_name: 'Banjul', destination_country: 'Gambie', destination_flag: '🇬🇲', korea_cost_usd: 2350, china_cost_usd: 2650, dubai_cost_usd: 2150, is_active: true },
  { id: '11', destination_id: 'bissau', destination_name: 'Bissau', destination_country: 'Guinée-Bissau', destination_flag: '🇬🇼', korea_cost_usd: 2400, china_cost_usd: 2700, dubai_cost_usd: 2200, is_active: true },
  { id: '12', destination_id: 'nouakchott', destination_name: 'Nouakchott', destination_country: 'Mauritanie', destination_flag: '🇲🇷', korea_cost_usd: 2500, china_cost_usd: 2800, dubai_cost_usd: 2300, is_active: true },
  { id: '13', destination_id: 'praia', destination_name: 'Praia', destination_country: 'Cap-Vert', destination_flag: '🇨🇻', korea_cost_usd: 2600, china_cost_usd: 2900, dubai_cost_usd: 2400, is_active: true },
  { id: '14', destination_id: 'niamey', destination_name: 'Niamey', destination_country: 'Niger', destination_flag: '🇳🇪', korea_cost_usd: 2800, china_cost_usd: 3100, dubai_cost_usd: 2600, is_active: true },
  { id: '15', destination_id: 'ouagadougou', destination_name: 'Ouagadougou', destination_country: 'Burkina Faso', destination_flag: '🇧🇫', korea_cost_usd: 2700, china_cost_usd: 3000, dubai_cost_usd: 2500, is_active: true },
  { id: '16', destination_id: 'bamako', destination_name: 'Bamako', destination_country: 'Mali', destination_flag: '🇲🇱', korea_cost_usd: 2750, china_cost_usd: 3050, dubai_cost_usd: 2550, is_active: true },

  // Afrique Centrale
  { id: '17', destination_id: 'douala', destination_name: 'Douala', destination_country: 'Cameroun', destination_flag: '🇨🇲', korea_cost_usd: 1700, china_cost_usd: 2000, dubai_cost_usd: 1500, is_active: true },
  { id: '18', destination_id: 'libreville', destination_name: 'Libreville', destination_country: 'Gabon', destination_flag: '🇬🇦', korea_cost_usd: 1800, china_cost_usd: 2100, dubai_cost_usd: 1600, is_active: true },
  { id: '19', destination_id: 'port-gentil', destination_name: 'Port-Gentil', destination_country: 'Gabon', destination_flag: '🇬🇦', korea_cost_usd: 1850, china_cost_usd: 2150, dubai_cost_usd: 1650, is_active: true },
  { id: '20', destination_id: 'pointe-noire', destination_name: 'Pointe-Noire', destination_country: 'Congo', destination_flag: '🇨🇬', korea_cost_usd: 1900, china_cost_usd: 2200, dubai_cost_usd: 1700, is_active: true },
  { id: '21', destination_id: 'brazzaville', destination_name: 'Brazzaville', destination_country: 'Congo', destination_flag: '🇨🇬', korea_cost_usd: 1950, china_cost_usd: 2250, dubai_cost_usd: 1750, is_active: true },
  { id: '22', destination_id: 'matadi', destination_name: 'Matadi', destination_country: 'RD Congo', destination_flag: '🇨🇩', korea_cost_usd: 2000, china_cost_usd: 2300, dubai_cost_usd: 1800, is_active: true },
  { id: '23', destination_id: 'kinshasa', destination_name: 'Kinshasa', destination_country: 'RD Congo', destination_flag: '🇨🇩', korea_cost_usd: 2050, china_cost_usd: 2350, dubai_cost_usd: 1850, is_active: true },
  { id: '24', destination_id: 'lubumbashi', destination_name: 'Lubumbashi', destination_country: 'RD Congo', destination_flag: '🇨🇩', korea_cost_usd: 2400, china_cost_usd: 2700, dubai_cost_usd: 2200, is_active: true },
  { id: '25', destination_id: 'luanda', destination_name: 'Luanda', destination_country: 'Angola', destination_flag: '🇦🇴', korea_cost_usd: 2100, china_cost_usd: 2400, dubai_cost_usd: 1900, is_active: true },
  { id: '26', destination_id: 'malabo', destination_name: 'Malabo', destination_country: 'Guinée Équatoriale', destination_flag: '🇬🇶', korea_cost_usd: 1900, china_cost_usd: 2200, dubai_cost_usd: 1700, is_active: true },
  { id: '27', destination_id: 'sao-tome', destination_name: 'São Tomé', destination_country: 'São Tomé-et-Príncipe', destination_flag: '🇸🇹', korea_cost_usd: 2200, china_cost_usd: 2500, dubai_cost_usd: 2000, is_active: true },
  { id: '28', destination_id: 'bangui', destination_name: 'Bangui', destination_country: 'Centrafrique', destination_flag: '🇨🇫', korea_cost_usd: 2600, china_cost_usd: 2900, dubai_cost_usd: 2400, is_active: true },
  { id: '29', destination_id: 'ndjamena', destination_name: "N'Djamena", destination_country: 'Tchad', destination_flag: '🇹🇩', korea_cost_usd: 2700, china_cost_usd: 3000, dubai_cost_usd: 2500, is_active: true },

  // Afrique de l'Est
  { id: '30', destination_id: 'mombasa', destination_name: 'Mombasa', destination_country: 'Kenya', destination_flag: '🇰🇪', korea_cost_usd: 1600, china_cost_usd: 1900, dubai_cost_usd: 1400, is_active: true },
  { id: '31', destination_id: 'nairobi', destination_name: 'Nairobi', destination_country: 'Kenya', destination_flag: '🇰🇪', korea_cost_usd: 1700, china_cost_usd: 2000, dubai_cost_usd: 1500, is_active: true },
  { id: '32', destination_id: 'dar-es-salaam', destination_name: 'Dar es Salaam', destination_country: 'Tanzanie', destination_flag: '🇹🇿', korea_cost_usd: 1650, china_cost_usd: 1950, dubai_cost_usd: 1450, is_active: true },
  { id: '33', destination_id: 'kampala', destination_name: 'Kampala', destination_country: 'Ouganda', destination_flag: '🇺🇬', korea_cost_usd: 1800, china_cost_usd: 2100, dubai_cost_usd: 1600, is_active: true },
  { id: '34', destination_id: 'kigali', destination_name: 'Kigali', destination_country: 'Rwanda', destination_flag: '🇷🇼', korea_cost_usd: 1900, china_cost_usd: 2200, dubai_cost_usd: 1700, is_active: true },
  { id: '35', destination_id: 'bujumbura', destination_name: 'Bujumbura', destination_country: 'Burundi', destination_flag: '🇧🇮', korea_cost_usd: 1950, china_cost_usd: 2250, dubai_cost_usd: 1750, is_active: true },
  { id: '36', destination_id: 'addis-ababa', destination_name: 'Addis-Abeba', destination_country: 'Éthiopie', destination_flag: '🇪🇹', korea_cost_usd: 1800, china_cost_usd: 2100, dubai_cost_usd: 1200, is_active: true },
  { id: '37', destination_id: 'djibouti', destination_name: 'Djibouti', destination_country: 'Djibouti', destination_flag: '🇩🇯', korea_cost_usd: 1500, china_cost_usd: 1800, dubai_cost_usd: 1000, is_active: true },
  { id: '38', destination_id: 'asmara', destination_name: 'Asmara', destination_country: 'Érythrée', destination_flag: '🇪🇷', korea_cost_usd: 1600, china_cost_usd: 1900, dubai_cost_usd: 1100, is_active: true },
  { id: '39', destination_id: 'mogadishu', destination_name: 'Mogadiscio', destination_country: 'Somalie', destination_flag: '🇸🇴', korea_cost_usd: 1700, china_cost_usd: 2000, dubai_cost_usd: 1200, is_active: true },
  { id: '40', destination_id: 'juba', destination_name: 'Juba', destination_country: 'Soudan du Sud', destination_flag: '🇸🇸', korea_cost_usd: 2200, china_cost_usd: 2500, dubai_cost_usd: 1800, is_active: true },

  // Afrique du Nord
  { id: '41', destination_id: 'casablanca', destination_name: 'Casablanca', destination_country: 'Maroc', destination_flag: '🇲🇦', korea_cost_usd: 2200, china_cost_usd: 2500, dubai_cost_usd: 2000, is_active: true },
  { id: '42', destination_id: 'tanger', destination_name: 'Tanger', destination_country: 'Maroc', destination_flag: '🇲🇦', korea_cost_usd: 2150, china_cost_usd: 2450, dubai_cost_usd: 1950, is_active: true },
  { id: '43', destination_id: 'alger', destination_name: 'Alger', destination_country: 'Algérie', destination_flag: '🇩🇿', korea_cost_usd: 2100, china_cost_usd: 2400, dubai_cost_usd: 1900, is_active: true },
  { id: '44', destination_id: 'tunis', destination_name: 'Tunis', destination_country: 'Tunisie', destination_flag: '🇹🇳', korea_cost_usd: 2000, china_cost_usd: 2300, dubai_cost_usd: 1800, is_active: true },
  { id: '45', destination_id: 'tripoli', destination_name: 'Tripoli', destination_country: 'Libye', destination_flag: '🇱🇾', korea_cost_usd: 1900, china_cost_usd: 2200, dubai_cost_usd: 1700, is_active: true },
  { id: '46', destination_id: 'alexandrie', destination_name: 'Alexandrie', destination_country: 'Égypte', destination_flag: '🇪🇬', korea_cost_usd: 1700, china_cost_usd: 2000, dubai_cost_usd: 1300, is_active: true },
  { id: '47', destination_id: 'port-said', destination_name: 'Port-Saïd', destination_country: 'Égypte', destination_flag: '🇪🇬', korea_cost_usd: 1650, china_cost_usd: 1950, dubai_cost_usd: 1250, is_active: true },
  { id: '48', destination_id: 'port-soudan', destination_name: 'Port-Soudan', destination_country: 'Soudan', destination_flag: '🇸🇩', korea_cost_usd: 1600, china_cost_usd: 1900, dubai_cost_usd: 1100, is_active: true },

  // Afrique Australe
  { id: '49', destination_id: 'durban', destination_name: 'Durban', destination_country: 'Afrique du Sud', destination_flag: '🇿🇦', korea_cost_usd: 1800, china_cost_usd: 2100, dubai_cost_usd: 1600, is_active: true },
  { id: '50', destination_id: 'cape-town', destination_name: 'Le Cap', destination_country: 'Afrique du Sud', destination_flag: '🇿🇦', korea_cost_usd: 1900, china_cost_usd: 2200, dubai_cost_usd: 1700, is_active: true },
  { id: '51', destination_id: 'maputo', destination_name: 'Maputo', destination_country: 'Mozambique', destination_flag: '🇲🇿', korea_cost_usd: 1750, china_cost_usd: 2050, dubai_cost_usd: 1550, is_active: true },
  { id: '52', destination_id: 'beira', destination_name: 'Beira', destination_country: 'Mozambique', destination_flag: '🇲🇿', korea_cost_usd: 1700, china_cost_usd: 2000, dubai_cost_usd: 1500, is_active: true },
  { id: '53', destination_id: 'lusaka', destination_name: 'Lusaka', destination_country: 'Zambie', destination_flag: '🇿🇲', korea_cost_usd: 2000, china_cost_usd: 2300, dubai_cost_usd: 1800, is_active: true },
  { id: '54', destination_id: 'harare', destination_name: 'Harare', destination_country: 'Zimbabwe', destination_flag: '🇿🇼', korea_cost_usd: 2050, china_cost_usd: 2350, dubai_cost_usd: 1850, is_active: true },
  { id: '55', destination_id: 'gaborone', destination_name: 'Gaborone', destination_country: 'Botswana', destination_flag: '🇧🇼', korea_cost_usd: 2100, china_cost_usd: 2400, dubai_cost_usd: 1900, is_active: true },
  { id: '56', destination_id: 'windhoek', destination_name: 'Windhoek', destination_country: 'Namibie', destination_flag: '🇳🇦', korea_cost_usd: 2000, china_cost_usd: 2300, dubai_cost_usd: 1800, is_active: true },
  { id: '57', destination_id: 'walvis-bay', destination_name: 'Walvis Bay', destination_country: 'Namibie', destination_flag: '🇳🇦', korea_cost_usd: 1950, china_cost_usd: 2250, dubai_cost_usd: 1750, is_active: true },
  { id: '58', destination_id: 'lilongwe', destination_name: 'Lilongwe', destination_country: 'Malawi', destination_flag: '🇲🇼', korea_cost_usd: 2100, china_cost_usd: 2400, dubai_cost_usd: 1900, is_active: true },
  { id: '59', destination_id: 'mbabane', destination_name: 'Mbabane', destination_country: 'Eswatini', destination_flag: '🇸🇿', korea_cost_usd: 1900, china_cost_usd: 2200, dubai_cost_usd: 1700, is_active: true },
  { id: '60', destination_id: 'maseru', destination_name: 'Maseru', destination_country: 'Lesotho', destination_flag: '🇱🇸', korea_cost_usd: 1950, china_cost_usd: 2250, dubai_cost_usd: 1750, is_active: true },

  // Îles de l'Océan Indien
  { id: '61', destination_id: 'antananarivo', destination_name: 'Antananarivo', destination_country: 'Madagascar', destination_flag: '🇲🇬', korea_cost_usd: 1800, china_cost_usd: 2100, dubai_cost_usd: 1600, is_active: true },
  { id: '62', destination_id: 'toamasina', destination_name: 'Toamasina', destination_country: 'Madagascar', destination_flag: '🇲🇬', korea_cost_usd: 1700, china_cost_usd: 2000, dubai_cost_usd: 1500, is_active: true },
  { id: '63', destination_id: 'port-louis', destination_name: 'Port-Louis', destination_country: 'Maurice', destination_flag: '🇲🇺', korea_cost_usd: 1600, china_cost_usd: 1900, dubai_cost_usd: 1400, is_active: true },
  { id: '64', destination_id: 'victoria', destination_name: 'Victoria', destination_country: 'Seychelles', destination_flag: '🇸🇨', korea_cost_usd: 1700, china_cost_usd: 2000, dubai_cost_usd: 1300, is_active: true },
  { id: '65', destination_id: 'moroni', destination_name: 'Moroni', destination_country: 'Comores', destination_flag: '🇰🇲', korea_cost_usd: 1800, china_cost_usd: 2100, dubai_cost_usd: 1500, is_active: true },
];

export default function AdminShippingPage() {
  const toast = useToast();
  const [routes, setRoutes] = useState<ShippingRoute[]>(DEFAULT_DESTINATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Filter routes based on search query
  const filteredRoutes = routes.filter(
    (route) =>
      route.destination_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.destination_country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch shipping routes from API
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await authFetch('/api/admin/shipping');
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          setRoutes(data.routes);
        }
        if (data.lastUpdatedAt) {
          setLastUpdatedAt(data.lastUpdatedAt);
        }
      } catch (error) {
        console.error('Error fetching routes:', error);
        // Keep default routes on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  const handleCostChange = (id: string, field: keyof ShippingRoute, value: number | boolean) => {
    setRoutes((prev) =>
      prev.map((route) =>
        route.id === id ? { ...route, [field]: value } : route
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await authFetch('/api/admin/shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      toast.success('Tarifs mis à jour avec succès');
      setHasChanges(false);
      // Update the last updated timestamp
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      console.error('Error saving routes:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              <span className="text-mandarin">Transport</span> Maritime
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              Gérez les tarifs de transport par destination
            </p>
            {lastUpdatedAt && (
              <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-muted)]">
                <Clock className="w-4 h-4" />
                <span>
                  Dernière mise à jour : {format(new Date(lastUpdatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  {' '}({formatDistanceToNow(new Date(lastUpdatedAt), { addSuffix: true, locale: fr })})
                </span>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            leftIcon={
              isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )
            }
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-royal-blue/10 border-royal-blue/20">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-royal-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[var(--text-primary)] font-medium">
                Tarifs de transport FOB → CIF
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Ces tarifs sont en USD et représentent le coût du transport maritime
                depuis le port d'origine jusqu'au port de destination.
                Ils sont convertis en FCFA (×640) lors de l'affichage client.
              </p>
            </div>
          </div>
        </Card>

        {/* Source Countries Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-lg">
            <span className="text-xl">🇰🇷</span>
            <span className="text-sm text-[var(--text-primary)]">Corée du Sud</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-lg">
            <span className="text-xl">🇨🇳</span>
            <span className="text-sm text-[var(--text-primary)]">Chine</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-lg">
            <span className="text-xl">🇦🇪</span>
            <span className="text-sm text-[var(--text-primary)]">Dubaï</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher une destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
            />
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {filteredRoutes.length} destination{filteredRoutes.length > 1 ? 's' : ''} sur {routes.length}
          </p>
        </div>

        {/* Routes Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    Destination
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    🇰🇷 Corée
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    🇨🇳 Chine
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    🇦🇪 Dubaï
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    Actif
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => (
                  <tr
                    key={route.id}
                    className="border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{route.destination_flag}</span>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {route.destination_name}
                          </p>
                          <p className="text-sm text-[var(--text-muted)]">
                            {route.destination_country}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            $
                          </span>
                          <input
                            type="number"
                            value={route.korea_cost_usd}
                            onChange={(e) =>
                              handleCostChange(route.id, 'korea_cost_usd', parseInt(e.target.value) || 0)
                            }
                            className="w-28 pl-7 pr-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-center text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            $
                          </span>
                          <input
                            type="number"
                            value={route.china_cost_usd}
                            onChange={(e) =>
                              handleCostChange(route.id, 'china_cost_usd', parseInt(e.target.value) || 0)
                            }
                            className="w-28 pl-7 pr-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-center text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                            $
                          </span>
                          <input
                            type="number"
                            value={route.dubai_cost_usd}
                            onChange={(e) =>
                              handleCostChange(route.id, 'dubai_cost_usd', parseInt(e.target.value) || 0)
                            }
                            className="w-28 pl-7 pr-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-center text-[var(--text-primary)] focus:border-mandarin focus:outline-none"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() =>
                            handleCostChange(route.id, 'is_active', !route.is_active)
                          }
                          className={`w-12 h-6 rounded-full transition-colors ${
                            route.is_active ? 'bg-jewel' : 'bg-[var(--card-border)]'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              route.is_active ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Summary */}
        <Card className="mt-6">
          <h3 className="font-bold text-[var(--text-primary)] mb-4">
            Récapitulatif des frais additionnels
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[var(--surface)] rounded-lg">
              <p className="text-sm text-[var(--text-muted)]">Assurance cargo</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">2.5%</p>
              <p className="text-xs text-[var(--text-muted)]">du prix FOB</p>
            </div>
            <div className="p-4 bg-[var(--surface)] rounded-lg">
              <p className="text-sm text-[var(--text-muted)]">Inspection & Documents</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">225 000 FCFA</p>
              <p className="text-xs text-[var(--text-muted)]">frais fixes</p>
            </div>
            <div className="p-4 bg-[var(--surface)] rounded-lg">
              <p className="text-sm text-[var(--text-muted)]">Taux de conversion</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">1 USD = 640 FCFA</p>
              <p className="text-xs text-[var(--text-muted)]">taux fixe</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
