/**
 * Service de synchronisation des véhicules Encar vers Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { getEncarClient } from './encar';
import type { Database, VehicleInsert, VehicleUpdate } from '@/types/database';
import type {
  EncarVehicleData,
  EncarOfferResult,
  EncarChangeResult,
  EncarPriceChange,
} from '@/types/encar';
import { convertEncarPriceToUSD } from '@/types/encar';

// Client Supabase admin pour les opérations d'écriture
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Convertit les données Encar vers le format de notre base de données
 */
export function mapEncarToVehicle(encarData: EncarVehicleData): VehicleInsert {
  // Convertir le type de transmission
  const transmissionMap: Record<string, string> = {
    'Automatic': 'automatic',
    'Manual': 'manual',
    'Semi-Automatic': 'automatic',
    'CVT': 'cvt',
    'Other': 'automatic',
  };

  // Convertir le type de carburant
  const fuelTypeMap: Record<string, string> = {
    'Gasoline': 'petrol',
    'Diesel': 'diesel',
    'Electric': 'electric',
    'Hybrid (Gasoline)': 'hybrid',
    'Hybrid (Diesel)': 'hybrid',
    'Hydrogen': 'electric',
    'LPG': 'lpg',
    'CNG': 'lpg',
    'Gasoline + LPG': 'lpg',
    'Gasoline + CNG': 'lpg',
    'LPG + Electric': 'hybrid',
    'Other': 'petrol',
  };

  // Convertir le type de carrosserie
  const bodyTypeMap: Record<string, string> = {
    'SUV': 'suv',
    'Sedan': 'sedan',
    'Hatchback': 'hatchback',
    'Minivan': 'minivan',
    'Pickup Truck': 'pickup',
    'Coupe/Roadster': 'coupe',
    'Microbus': 'van',
    'RV': 'other',
    'Other': 'other',
  };

  const priceUsd = convertEncarPriceToUSD(encarData.price);

  return {
    source: 'korea',
    source_id: `encar_${encarData.inner_id}`,
    source_url: encarData.url,
    make: encarData.mark,
    model: encarData.model,
    year: encarData.year,
    mileage: encarData.km_age,
    engine_cc: encarData.displacement ? parseInt(encarData.displacement, 10) : null,
    transmission: transmissionMap[encarData.transmission_type] || 'automatic',
    fuel_type: fuelTypeMap[encarData.engine_type] || 'petrol',
    color: encarData.color,
    body_type: bodyTypeMap[encarData.body_type] || 'other',
    grade: encarData.complectation || encarData.configuration,
    condition_report: encarData.extra ? JSON.stringify(encarData.extra) : null,
    start_price_usd: priceUsd,
    current_price_usd: priceUsd,
    auction_platform: 'encar',
    auction_status: 'ongoing', // Les annonces Encar sont des ventes directes
    images: encarData.images,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Synchronise les véhicules Encar vers Supabase
 */
export async function syncEncarVehicles(
  options: {
    page?: number;
    mark?: string;
    model?: string;
    maxPages?: number;
  } = {}
): Promise<{ added: number; updated: number; errors: number }> {
  const encar = getEncarClient();
  const supabase = getSupabaseAdmin();

  let added = 0;
  let updated = 0;
  let errors = 0;

  const startPage = options.page || 1;
  const maxPages = options.maxPages || 10;
  let currentPage = startPage;
  let hasMore = true;

  while (hasMore && currentPage < startPage + maxPages) {
    try {
      const response = await encar.getOffers({
        page: currentPage,
        mark: options.mark,
        model: options.model,
      });

      for (const offer of response.result) {
        try {
          const vehicleData = mapEncarToVehicle(offer.data);

          // Vérifier si le véhicule existe déjà
          const { data: existing } = await supabase
            .from('vehicles')
            .select('id')
            .eq('source_id', vehicleData.source_id)
            .single();

          if (existing) {
            // Mettre à jour le véhicule existant
            const { error } = await supabase
              .from('vehicles')
              .update({
                current_price_usd: vehicleData.current_price_usd,
                images: vehicleData.images,
                updated_at: new Date().toISOString(),
              } as VehicleUpdate)
              .eq('id', existing.id);

            if (error) {
              console.error(`Erreur mise à jour véhicule ${vehicleData.source_id}:`, error);
              errors++;
            } else {
              updated++;
            }
          } else {
            // Insérer un nouveau véhicule
            const { error } = await supabase
              .from('vehicles')
              .insert(vehicleData);

            if (error) {
              console.error(`Erreur insertion véhicule ${vehicleData.source_id}:`, error);
              errors++;
            } else {
              added++;
            }
          }
        } catch (err) {
          console.error(`Erreur traitement offre ${offer.inner_id}:`, err);
          errors++;
        }
      }

      // Vérifier s'il y a plus de pages
      if (response.meta.next_page === null) {
        hasMore = false;
      } else {
        currentPage = response.meta.next_page;
      }

      // Pause pour respecter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Erreur récupération page ${currentPage}:`, err);
      errors++;
      hasMore = false;
    }
  }

  return { added, updated, errors };
}

/**
 * Applique les changements Encar à la base de données Supabase
 */
export async function applyEncarChanges(
  changeId: number
): Promise<{ added: number; updated: number; removed: number; errors: number; lastChangeId: number }> {
  const encar = getEncarClient();
  const supabase = getSupabaseAdmin();

  let added = 0;
  let updated = 0;
  let removed = 0;
  let errors = 0;
  let lastChangeId = changeId;

  try {
    const response = await encar.getChanges({ change_id: changeId });

    for (const change of response.result) {
      try {
        const sourceId = `encar_${change.inner_id}`;

        switch (change.change_type) {
          case 'added':
            if (change.data && 'mark' in change.data) {
              const vehicleData = mapEncarToVehicle(change.data as EncarVehicleData);
              const { error } = await supabase
                .from('vehicles')
                .insert(vehicleData);

              if (error) {
                console.error(`Erreur ajout véhicule ${sourceId}:`, error);
                errors++;
              } else {
                added++;
              }
            }
            break;

          case 'changed':
            if (change.data && 'new_price' in change.data) {
              const priceChange = change.data as EncarPriceChange;
              const newPriceUsd = convertEncarPriceToUSD(priceChange.new_price);

              const { error } = await supabase
                .from('vehicles')
                .update({
                  current_price_usd: newPriceUsd,
                  updated_at: new Date().toISOString(),
                } as VehicleUpdate)
                .eq('source_id', sourceId);

              if (error) {
                console.error(`Erreur mise à jour prix ${sourceId}:`, error);
                errors++;
              } else {
                updated++;
              }
            }
            break;

          case 'removed':
            // Marquer le véhicule comme vendu/terminé au lieu de le supprimer
            const { error } = await supabase
              .from('vehicles')
              .update({
                auction_status: 'sold',
                updated_at: new Date().toISOString(),
              } as VehicleUpdate)
              .eq('source_id', sourceId);

            if (error) {
              console.error(`Erreur suppression véhicule ${sourceId}:`, error);
              errors++;
            } else {
              removed++;
            }
            break;
        }

        lastChangeId = change.id;
      } catch (err) {
        console.error(`Erreur traitement changement ${change.id}:`, err);
        errors++;
      }
    }

    // Mettre à jour le lastChangeId avec le next_change_id si disponible
    if (response.meta.next_change_id > lastChangeId) {
      lastChangeId = response.meta.next_change_id;
    }
  } catch (err) {
    console.error(`Erreur récupération changements depuis ${changeId}:`, err);
    errors++;
  }

  return { added, updated, removed, errors, lastChangeId };
}

/**
 * Récupère le dernier change_id stocké dans la base de données
 */
export async function getLastSyncedChangeId(): Promise<number | null> {
  const supabase = getSupabaseAdmin();

  // On peut stocker le dernier change_id dans une table de configuration
  // Pour l'instant, on retourne null pour forcer une récupération depuis l'API
  // TODO: Implémenter le stockage du change_id

  return null;
}

/**
 * Stocke le dernier change_id synchronisé
 */
export async function setLastSyncedChangeId(changeId: number): Promise<void> {
  // TODO: Implémenter le stockage du change_id dans une table de configuration
  console.log(`Change ID synchronisé: ${changeId}`);
}

export default {
  syncEncarVehicles,
  applyEncarChanges,
  mapEncarToVehicle,
  getLastSyncedChangeId,
  setLastSyncedChangeId,
};
