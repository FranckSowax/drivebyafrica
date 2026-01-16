/**
 * Service de synchronisation des véhicules CHE168 (Chine) vers Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { getChe168Client } from './che168';
import type { Database, VehicleInsert, VehicleUpdate } from '@/types/database';
import type {
  Che168VehicleData,
  Che168ChangeResult,
  Che168PriceChange,
} from '@/types/che168';
import { convertChe168PriceToUSD, convertDisplacementToCC } from '@/types/che168';

// Client Supabase admin pour les opérations d'écriture (typé)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// Client Supabase admin non-typé pour les tables sync (créées par migration)
function getSupabaseAdminUntyped() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Convertit les données CHE168 vers le format de notre base de données
 */
export function mapChe168ToVehicle(che168Data: Che168VehicleData): VehicleInsert {
  // Convertir le type de transmission
  const transmissionMap: Record<string, string> = {
    'Automatic': 'automatic',
    'Manual': 'manual',
  };

  // Convertir le type de carburant
  const fuelTypeMap: Record<string, string> = {
    'Gasoline': 'petrol',
    'Diesel': 'diesel',
    'Electric': 'electric',
    'Hybrid': 'hybrid',
    'Plug-in Hybrid': 'hybrid',
    'Range Extender': 'electric',
    'Hydrogen Fuel Cell': 'electric',
    'Gasoline + 48V Mild Hybrid': 'hybrid',
    'Gasoline + 24V Mild Hybrid': 'hybrid',
    'Gasoline + CNG': 'lpg',
    'CNG': 'lpg',
    'Other': 'petrol',
  };

  // Convertir le type de carrosserie
  const bodyTypeMap: Record<string, string> = {
    'Crossover/SUV': 'suv',
    'SUV': 'suv',
    'Sedan': 'sedan',
    'Hatchback': 'hatchback',
    'Minivan': 'minivan',
    'Pickup': 'pickup',
    'Coupe/Roadster': 'coupe',
    'Sports Car': 'coupe',
    'Microvan': 'van',
    'Van': 'van',
    'Light Truck': 'pickup',
    'Mini': 'hatchback',
    'Other': 'other',
  };

  // Convertir le type de transmission (drive type)
  const driveTypeMap: Record<string, string> = {
    'FWD': 'fwd',
    'RWD': 'rwd',
    'AWD': 'awd',
    'RWD (dual-motor)': 'rwd',
    'AWD (dual-motor)': 'awd',
    'AWD (tri-motor)': 'awd',
    'AWD (quad-motor)': 'awd',
    'RWD (mid-engine)': 'rwd',
    'Other': 'fwd',
  };

  const priceUsd = convertChe168PriceToUSD(che168Data.price);

  // Convertir la cylindrée de litres vers cc
  const engineCc = che168Data.displacement
    ? convertDisplacementToCC(che168Data.displacement)
    : null;

  return {
    source: 'china',
    source_id: `che168_${che168Data.inner_id}`,
    source_url: che168Data.url,
    make: che168Data.mark,
    model: che168Data.model,
    year: che168Data.year,
    mileage: che168Data.km_age,
    engine_cc: engineCc,
    transmission: transmissionMap[che168Data.transmission_type] || 'automatic',
    fuel_type: fuelTypeMap[che168Data.engine_type] || 'petrol',
    color: che168Data.color,
    body_type: bodyTypeMap[che168Data.body_type] || 'other',
    drive_type: driveTypeMap[che168Data.drive_type] || null,
    grade: che168Data.title, // Utilise le titre comme grade/description
    condition_report: che168Data.extra ? JSON.stringify(che168Data.extra) : null,
    start_price_usd: priceUsd,
    current_price_usd: priceUsd,
    auction_platform: 'che168',
    auction_status: 'ongoing', // Les annonces CHE168 sont des ventes directes
    images: che168Data.images,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Synchronise les véhicules CHE168 vers Supabase
 */
export async function syncChe168Vehicles(
  options: {
    page?: number;
    mark?: string;
    model?: string;
    maxPages?: number;
  } = {}
): Promise<{ added: number; updated: number; errors: number }> {
  const che168 = getChe168Client();
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
      const response = await che168.getOffers({
        page: currentPage,
        mark: options.mark,
        model: options.model,
      });

      console.log(`[CHE168] Page ${currentPage}: ${response.result.length} véhicules`);

      for (const offer of response.result) {
        try {
          const vehicleData = mapChe168ToVehicle(offer.data);

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
              console.error(`[CHE168] Erreur mise à jour véhicule ${vehicleData.source_id}:`, error);
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
              console.error(`[CHE168] Erreur insertion véhicule ${vehicleData.source_id}:`, error);
              errors++;
            } else {
              added++;
            }
          }
        } catch (err) {
          console.error(`[CHE168] Erreur traitement offre ${offer.inner_id}:`, err);
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
      console.error(`[CHE168] Erreur récupération page ${currentPage}:`, err);
      errors++;
      hasMore = false;
    }
  }

  console.log(`[CHE168] Sync terminée: ${added} ajoutés, ${updated} mis à jour, ${errors} erreurs`);
  return { added, updated, errors };
}

/**
 * Applique les changements CHE168 à la base de données Supabase
 */
export async function applyChe168Changes(
  changeId: number
): Promise<{ added: number; updated: number; removed: number; errors: number; lastChangeId: number }> {
  const che168 = getChe168Client();
  const supabase = getSupabaseAdmin();

  let added = 0;
  let updated = 0;
  let removed = 0;
  let errors = 0;
  let lastChangeId = changeId;

  try {
    const response = await che168.getChanges({ change_id: changeId });

    console.log(`[CHE168] Traitement de ${response.result.length} changements depuis change_id ${changeId}`);

    for (const change of response.result) {
      try {
        const sourceId = `che168_${change.inner_id}`;

        switch (change.change_type) {
          case 'added':
            if (change.data && 'mark' in change.data) {
              const vehicleData = mapChe168ToVehicle(change.data as Che168VehicleData);
              const { error } = await supabase
                .from('vehicles')
                .insert(vehicleData);

              if (error) {
                console.error(`[CHE168] Erreur ajout véhicule ${sourceId}:`, error);
                errors++;
              } else {
                added++;
              }
            }
            break;

          case 'changed':
            if (change.data && 'new_price' in change.data) {
              const priceChange = change.data as Che168PriceChange;
              const newPriceUsd = convertChe168PriceToUSD(priceChange.new_price);

              const { error } = await supabase
                .from('vehicles')
                .update({
                  current_price_usd: newPriceUsd,
                  updated_at: new Date().toISOString(),
                } as VehicleUpdate)
                .eq('source_id', sourceId);

              if (error) {
                console.error(`[CHE168] Erreur mise à jour prix ${sourceId}:`, error);
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
                status: 'sold',
                updated_at: new Date().toISOString(),
              } as VehicleUpdate)
              .eq('source_id', sourceId);

            if (error) {
              console.error(`[CHE168] Erreur suppression véhicule ${sourceId}:`, error);
              errors++;
            } else {
              removed++;
            }
            break;
        }

        lastChangeId = change.id;
      } catch (err) {
        console.error(`[CHE168] Erreur traitement changement ${change.id}:`, err);
        errors++;
      }
    }

    // Mettre à jour le lastChangeId avec le next_change_id si disponible
    if (response.meta.next_change_id > lastChangeId) {
      lastChangeId = response.meta.next_change_id;
    }
  } catch (err) {
    console.error(`[CHE168] Erreur récupération changements depuis ${changeId}:`, err);
    errors++;
  }

  console.log(`[CHE168] Changes appliqués: ${added} ajoutés, ${updated} mis à jour, ${removed} supprimés, ${errors} erreurs`);
  return { added, updated, removed, errors, lastChangeId };
}

/**
 * Récupère le dernier change_id stocké dans la base de données pour CHE168
 */
export async function getLastSyncedChangeIdChe168(): Promise<number | null> {
  const supabase = getSupabaseAdminUntyped();

  const { data, error } = await supabase
    .from('sync_config')
    .select('last_change_id')
    .eq('source', 'che168')
    .single();

  if (error || !data) {
    console.log('[CHE168] Aucun change_id trouvé, utilisation de la valeur par défaut');
    return null;
  }

  return data.last_change_id as number;
}

/**
 * Stocke le dernier change_id synchronisé pour CHE168
 */
export async function setLastSyncedChangeIdChe168(changeId: number): Promise<void> {
  const supabase = getSupabaseAdminUntyped();

  const { error } = await supabase
    .from('sync_config')
    .upsert({
      source: 'che168',
      last_change_id: changeId,
      last_sync_at: new Date().toISOString(),
    }, {
      onConflict: 'source',
    });

  if (error) {
    console.error('[CHE168] Erreur lors de la mise à jour du change_id:', error);
  } else {
    console.log(`[CHE168] Change ID synchronisé: ${changeId}`);
  }
}

/**
 * Met à jour le statut de synchronisation pour CHE168
 */
export async function updateSyncStatusChe168(
  status: 'running' | 'success' | 'failed',
  stats?: { added?: number; updated?: number; removed?: number; error?: string }
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const supabaseUntyped = getSupabaseAdminUntyped();

  const updateData: Record<string, unknown> = {
    last_sync_status: status,
    last_sync_at: new Date().toISOString(),
  };

  if (stats) {
    if (stats.added !== undefined) updateData.vehicles_added = stats.added;
    if (stats.updated !== undefined) updateData.vehicles_updated = stats.updated;
    if (stats.removed !== undefined) updateData.vehicles_removed = stats.removed;
    if (stats.error !== undefined) updateData.last_sync_error = stats.error;
  }

  // Update total count
  const { count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'china');

  updateData.total_vehicles = count || 0;

  await supabaseUntyped
    .from('sync_config')
    .upsert({
      source: 'che168',
      ...updateData,
    }, {
      onConflict: 'source',
    });
}

/**
 * Crée une entrée de log de synchronisation pour CHE168
 */
export async function createSyncLogChe168(
  syncType: 'full' | 'changes' | 'manual'
): Promise<string | null> {
  const supabase = getSupabaseAdminUntyped();

  const { data, error } = await supabase
    .from('sync_logs')
    .insert({
      source: 'che168',
      sync_type: syncType,
      status: 'running',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[CHE168] Erreur création log sync:', error);
    return null;
  }

  return data.id as string;
}

/**
 * Met à jour une entrée de log de synchronisation pour CHE168
 */
export async function updateSyncLogChe168(
  logId: string,
  status: 'success' | 'failed',
  stats: { added: number; updated: number; removed: number; error?: string }
): Promise<void> {
  const supabase = getSupabaseAdminUntyped();

  await supabase
    .from('sync_logs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      vehicles_added: stats.added,
      vehicles_updated: stats.updated,
      vehicles_removed: stats.removed,
      error_message: stats.error || null,
    })
    .eq('id', logId);
}

export default {
  syncChe168Vehicles,
  applyChe168Changes,
  mapChe168ToVehicle,
  getLastSyncedChangeIdChe168,
  setLastSyncedChangeIdChe168,
  updateSyncStatusChe168,
  createSyncLogChe168,
  updateSyncLogChe168,
};
