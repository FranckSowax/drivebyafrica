/**
 * Script de synchronisation des véhicules Encar vers Supabase
 * Usage: npx tsx scripts/sync-encar-vehicles.ts [maxPages] [--all]
 *
 * Par défaut, seules les marques sélectionnées sont synchronisées.
 * Utilisez --all pour synchroniser toutes les marques.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const ACCESS_NAME = process.env.ENCAR_ACCESS_NAME || 'api1';
const API_KEY = process.env.ENCAR_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Marques autorisées pour la synchronisation
const ALLOWED_MAKES = [
  // Coréennes
  'Hyundai',
  'Kia',
  // Japonaises
  'Toyota',
  'Honda',
  'Nissan',
  'Mazda',
  'Mitsubishi',
  'Suzuki',
  'Lexus',
  // Européennes
  'Mercedes-Benz',
  'Land Rover',
  // Américaines
  'Ford',
  'Jeep',
];

// Vérification des variables d'environnement
if (!API_KEY) {
  console.error('❌ ENCAR_API_KEY non configurée');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'your-service-role-key') {
  console.error('❌ Variables Supabase non configurées');
  console.error('   Configurez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  console.error('   Vous pouvez la trouver dans: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const BASE_URL = `https://${ACCESS_NAME}.auto-api.com/api/v2/encar`;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Taux de conversion KRW -> USD
const KRW_TO_USD = 0.00075;

interface EncarVehicle {
  id: number;
  inner_id: string;
  change_type: string;
  created_at: string;
  data: {
    id: number;
    inner_id: string;
    url: string;
    mark: string;
    model: string;
    generation: string;
    configuration: string;
    complectation: string;
    year: number;
    color: string;
    price: number;
    price_won: string;
    km_age: number;
    engine_type: string;
    transmission_type: string;
    body_type: string;
    address: string;
    seller_type: string;
    is_dealer: boolean;
    images: string[];
    displacement?: string;
    extra?: any;
  };
}

function mapTransmission(encarType: string): string {
  const map: Record<string, string> = {
    'Automatic': 'automatic',
    'Manual': 'manual',
    'Semi-Automatic': 'automatic',
    'CVT': 'cvt',
    'Other': 'automatic',
  };
  return map[encarType] || 'automatic';
}

function mapFuelType(encarType: string): string {
  const map: Record<string, string> = {
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
  return map[encarType] || 'petrol';
}

function mapBodyType(encarType: string): string {
  const map: Record<string, string> = {
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
  return map[encarType] || 'other';
}

function parseImages(imagesData: any): string[] {
  // Les images peuvent être une string JSON ou un tableau
  let images: string[] = [];

  if (typeof imagesData === 'string') {
    try {
      images = JSON.parse(imagesData);
    } catch {
      images = [];
    }
  } else if (Array.isArray(imagesData)) {
    images = imagesData;
  }

  // Filtrer pour garder seulement les URLs valides
  return images
    .filter((img): img is string => typeof img === 'string' && img.startsWith('http'))
    .slice(0, 20); // Limiter à 20 images
}

function convertToVehicle(encar: EncarVehicle) {
  const data = encar.data;

  // Les prix et années peuvent être des strings dans l'API
  const price = typeof data.price === 'string' ? parseInt(data.price as unknown as string, 10) : data.price;
  const year = typeof data.year === 'string' ? parseInt(data.year as unknown as string, 10) : data.year;
  const kmAge = typeof data.km_age === 'string' ? parseInt(data.km_age as unknown as string, 10) : data.km_age;

  const priceUsd = Math.round(price * 10000 * KRW_TO_USD);
  const images = parseImages(data.images);

  return {
    source: 'korea',
    source_id: `encar_${data.inner_id}`,
    source_url: data.url,
    make: data.mark,
    model: data.model,
    year: year,
    mileage: kmAge,
    engine_cc: data.displacement ? parseInt(data.displacement, 10) : null,
    transmission: mapTransmission(data.transmission_type),
    fuel_type: mapFuelType(data.engine_type),
    color: data.color,
    body_type: mapBodyType(data.body_type),
    grade: data.complectation || data.configuration,
    condition_report: data.extra ? JSON.stringify(data.extra) : null,
    start_price_usd: priceUsd,
    current_price_usd: priceUsd,
    auction_platform: 'encar',
    auction_status: 'ongoing',
    images: images,
  };
}

async function fetchOffers(page: number, mark?: string): Promise<{ result: EncarVehicle[]; meta: any }> {
  let url = `${BASE_URL}/offers?api_key=${API_KEY}&page=${page}`;
  if (mark) {
    url += `&mark=${encodeURIComponent(mark)}`;
  }
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function syncVehiclesForMake(make: string, maxPagesPerMake: number, stats: { added: number; updated: number; errors: number; skipped: number }) {
  let currentPage = 1;
  let hasMore = true;

  while (hasMore && currentPage <= maxPagesPerMake) {
    try {
      const { result, meta } = await fetchOffers(currentPage, make);

      if (result.length === 0) {
        break;
      }

      for (const encarVehicle of result) {
        try {
          const vehicleData = convertToVehicle(encarVehicle);

          // Vérifier si le véhicule existe
          const { data: existing } = await supabase
            .from('vehicles')
            .select('id')
            .eq('source_id', vehicleData.source_id)
            .single();

          if (existing) {
            // Mettre à jour
            const { error } = await supabase
              .from('vehicles')
              .update({
                current_price_usd: vehicleData.current_price_usd,
                images: vehicleData.images,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (error) {
              stats.errors++;
            } else {
              stats.updated++;
            }
          } else {
            // Insérer
            const { error } = await supabase
              .from('vehicles')
              .insert(vehicleData);

            if (error) {
              stats.errors++;
            } else {
              stats.added++;
            }
          }
        } catch (err: any) {
          stats.errors++;
        }
      }

      // Vérifier s'il y a plus de pages
      if (meta.next_page === null) {
        hasMore = false;
      } else {
        currentPage = meta.next_page;
      }

      // Pause entre les pages
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err: any) {
      console.error(`      ❌ Erreur: ${err.message}`);
      break;
    }
  }

  return currentPage - 1;
}

async function syncVehicles(maxPagesPerMake: number, syncAllMakes: boolean) {
  console.log('🚀 Démarrage de la synchronisation Encar -> Supabase');
  console.log(`   Pages max par marque: ${maxPagesPerMake}`);

  const stats = { added: 0, updated: 0, errors: 0, skipped: 0 };

  if (syncAllMakes) {
    console.log('   Mode: TOUTES les marques\n');
    // Sync sans filtre de marque
    let currentPage = 1;
    let hasMore = true;
    const totalMaxPages = maxPagesPerMake * ALLOWED_MAKES.length;

    while (hasMore && currentPage <= totalMaxPages) {
      console.log(`📄 Page ${currentPage}/${totalMaxPages}...`);

      try {
        const { result, meta } = await fetchOffers(currentPage);
        console.log(`   ${result.length} véhicules récupérés`);

        for (const encarVehicle of result) {
          try {
            const vehicleData = convertToVehicle(encarVehicle);

            const { data: existing } = await supabase
              .from('vehicles')
              .select('id')
              .eq('source_id', vehicleData.source_id)
              .single();

            if (existing) {
              const { error } = await supabase
                .from('vehicles')
                .update({
                  current_price_usd: vehicleData.current_price_usd,
                  images: vehicleData.images,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

              if (error) stats.errors++;
              else stats.updated++;
            } else {
              const { error } = await supabase.from('vehicles').insert(vehicleData);
              if (error) stats.errors++;
              else stats.added++;
            }
          } catch {
            stats.errors++;
          }
        }

        console.log(`   ✅ (ajoutés: ${stats.added}, màj: ${stats.updated}, erreurs: ${stats.errors})`);

        if (meta.next_page === null) {
          hasMore = false;
        } else {
          currentPage = meta.next_page;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err: any) {
        console.error(`   ❌ Erreur: ${err.message}`);
        break;
      }
    }
  } else {
    console.log(`   Mode: Marques sélectionnées (${ALLOWED_MAKES.length} marques)\n`);

    for (const make of ALLOWED_MAKES) {
      const beforeAdded = stats.added;
      const beforeUpdated = stats.updated;

      process.stdout.write(`🚗 ${make}... `);
      const pagesProcessed = await syncVehiclesForMake(make, maxPagesPerMake, stats);

      const addedForMake = stats.added - beforeAdded;
      const updatedForMake = stats.updated - beforeUpdated;
      console.log(`✅ ${pagesProcessed} pages (${addedForMake} ajoutés, ${updatedForMake} màj)`);

      // Pause entre les marques
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n✨ Synchronisation terminée!');
  console.log(`   Véhicules ajoutés: ${stats.added}`);
  console.log(`   Véhicules mis à jour: ${stats.updated}`);
  console.log(`   Erreurs: ${stats.errors}`);

  return stats;
}

// Exécution
const args = process.argv.slice(2);
const syncAllMakes = args.includes('--all');
const maxPagesArg = args.find(arg => !arg.startsWith('--'));
const maxPagesPerMake = parseInt(maxPagesArg || '10', 10);

console.log('═══════════════════════════════════════════════════════');
console.log('   DRIVEBY AFRICA - Synchronisation Encar');
console.log('═══════════════════════════════════════════════════════');
console.log(`   Marques: ${syncAllMakes ? 'Toutes' : ALLOWED_MAKES.join(', ')}`);
console.log('═══════════════════════════════════════════════════════\n');

syncVehicles(maxPagesPerMake, syncAllMakes).catch(console.error);
