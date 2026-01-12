'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/Toast';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('vehicle_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const vehicleIds = (data || []).map((f: { vehicle_id: string }) => f.vehicle_id);
      setFavorites(vehicleIds);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (vehicleId: string) => {
    if (!user) {
      toast.warning('Connexion requise', 'Connectez-vous pour ajouter des favoris');
      return;
    }

    const isFavorite = favorites.includes(vehicleId);

    // Optimistic update
    setFavorites((prev) =>
      isFavorite ? prev.filter((id) => id !== vehicleId) : [...prev, vehicleId]
    );

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('vehicle_id', vehicleId);

        if (error) throw error;
        toast.success('Retiré des favoris');
      } else {
        const { error } = await supabase.from('favorites').insert({
          user_id: user.id,
          vehicle_id: vehicleId,
        });

        if (error) throw error;
        toast.success('Ajouté aux favoris');
      }
    } catch (error) {
      // Revert optimistic update
      setFavorites((prev) =>
        isFavorite ? [...prev, vehicleId] : prev.filter((id) => id !== vehicleId)
      );
      toast.error('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const isFavorite = (vehicleId: string) => favorites.includes(vehicleId);

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
