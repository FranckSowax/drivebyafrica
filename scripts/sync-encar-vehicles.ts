/**
 * Script de synchronisation des véhicules Encar vers Supabase
 * Usage: npx tsx scripts/sync-encar-vehicles.ts [maxPages]
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const ACCESS_NAME = process.env.ENCAR_ACCESS_NAME || 'api1';
const API_KEY = process.env.ENCAR_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function fetchOffers(page: number): Promise<{ result: EncarVehicle[]; meta: any }> {
  const url = `${BASE_URL}/offers?api_key=${API_KEY}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function syncVehicles(maxPages: number) {
  console.log('🚀 Démarrage de la synchronisation Encar -> Supabase');
  console.log(`   Max pages: ${maxPages}`);

  let totalAdded = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let currentPage = 1;
  let hasMore = true;

  while (hasMore && currentPage <= maxPages) {
    console.log(`\n📄 Page ${currentPage}...`);

    try {
      const { result, meta } = await fetchOffers(currentPage);
      console.log(`   ${result.length} véhicules récupérés`);

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
              console.error(`   ❌ Erreur update ${vehicleData.source_id}:`, error.message);
              totalErrors++;
            } else {
              totalUpdated++;
            }
          } else {
            // Insérer
            const { error } = await supabase
              .from('vehicles')
              .insert(vehicleData);

            if (error) {
              console.error(`   ❌ Erreur insert ${vehicleData.source_id}:`, error.message);
              totalErrors++;
            } else {
              totalAdded++;
            }
          }
        } catch (err: any) {
          console.error(`   ❌ Erreur véhicule ${encarVehicle.inner_id}:`, err.message);
          totalErrors++;
        }
      }

      console.log(`   ✅ Page ${currentPage} traitée (ajoutés: ${totalAdded}, màj: ${totalUpdated}, erreurs: ${totalErrors})`);

      // Vérifier s'il y a plus de pages
      if (meta.next_page === null) {
        hasMore = false;
      } else {
        currentPage = meta.next_page;
      }

      // Pause entre les pages
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err: any) {
      console.error(`   ❌ Erreur page ${currentPage}:`, err.message);
      totalErrors++;
      break;
    }
  }

  console.log('\n✨ Synchronisation terminée!');
  console.log(`   Véhicules ajoutés: ${totalAdded}`);
  console.log(`   Véhicules mis à jour: ${totalUpdated}`);
  console.log(`   Erreurs: ${totalErrors}`);

  return { added: totalAdded, updated: totalUpdated, errors: totalErrors };
}

// Exécution
const maxPages = parseInt(process.argv[2] || '5', 10);
syncVehicles(maxPages).catch(console.error);
