'use client';

import { useState, useEffect } from 'react';
import { Ship, Save, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

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

// Default destinations (used as fallback)
const DEFAULT_DESTINATIONS: ShippingRoute[] = [
  { id: '1', destination_id: 'libreville', destination_name: 'Libreville', destination_country: 'Gabon', destination_flag: '🇬🇦', korea_cost_usd: 1800, china_cost_usd: 2100, dubai_cost_usd: 1600, is_active: true },
  { id: '2', destination_id: 'port-gentil', destination_name: 'Port-Gentil', destination_country: 'Gabon', destination_flag: '🇬🇦', korea_cost_usd: 1850, china_cost_usd: 2150, dubai_cost_usd: 1650, is_active: true },
  { id: '3', destination_id: 'douala', destination_name: 'Douala', destination_country: 'Cameroun', destination_flag: '🇨🇲', korea_cost_usd: 1700, china_cost_usd: 2000, dubai_cost_usd: 1500, is_active: true },
  { id: '4', destination_id: 'pointe-noire', destination_name: 'Pointe-Noire', destination_country: 'Congo', destination_flag: '🇨🇬', korea_cost_usd: 1900, china_cost_usd: 2200, dubai_cost_usd: 1700, is_active: true },
  { id: '5', destination_id: 'abidjan', destination_name: 'Abidjan', destination_country: "Côte d'Ivoire", destination_flag: '🇨🇮', korea_cost_usd: 2100, china_cost_usd: 2400, dubai_cost_usd: 1900, is_active: true },
  { id: '6', destination_id: 'dakar', destination_name: 'Dakar', destination_country: 'Sénégal', destination_flag: '🇸🇳', korea_cost_usd: 2300, china_cost_usd: 2600, dubai_cost_usd: 2100, is_active: true },
  { id: '7', destination_id: 'lome', destination_name: 'Lomé', destination_country: 'Togo', destination_flag: '🇹🇬', korea_cost_usd: 2000, china_cost_usd: 2300, dubai_cost_usd: 1800, is_active: true },
  { id: '8', destination_id: 'cotonou', destination_name: 'Cotonou', destination_country: 'Bénin', destination_flag: '🇧🇯', korea_cost_usd: 2050, china_cost_usd: 2350, dubai_cost_usd: 1850, is_active: true },
];

export default function AdminShippingPage() {
  const toast = useToast();
  const [routes, setRoutes] = useState<ShippingRoute[]>(DEFAULT_DESTINATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch shipping routes from API
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await fetch('/api/admin/shipping');
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          setRoutes(data.routes);
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
      const response = await fetch('/api/admin/shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      toast.success('Tarifs mis à jour avec succès');
      setHasChanges(false);
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
        <div className="flex gap-4 mb-6">
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
                {routes.map((route) => (
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
