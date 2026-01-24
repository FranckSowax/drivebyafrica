'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/components/ui/Toast';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const isMountedRef = useRef(true);

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

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        const vehicleIds = (data || []).map((f: { vehicle_id: string }) => f.vehicle_id);
        setFavorites(vehicleIds);
      }
    } catch (error: any) {
      // Ignore AbortError - this happens when component unmounts during fetch
      if (error?.name !== 'AbortError' && !error?.message?.includes('AbortError')) {
        console.error('Error fetching favorites:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, supabase]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchFavorites();

    return () => {
      isMountedRef.current = false;
    };
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
