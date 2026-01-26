/**
 * Encar CI Sync Script
 *
 * Syncs vehicles from encar.com (South Korea market) to Supabase.
 * Designed for GitHub Actions daily automation.
 *
 * Usage: npx tsx scripts/sync-encar-ci.ts [options]
 *
 * Options:
 *   --max-pages=N         Max pages to fetch (default: 4000 = ~80,000 vehicles)
 *   --remove-expired=bool Remove vehicles no longer in API (default: true)
 *
 * Filters:
 *   - Only allowed makes (Korean, Japanese, American brands)
 *   - Minimum price: $1200 USD (source price)
 *   - Must have at least one image
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Accept both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const API_BASE = 'https://api1.auto-api.com/api/v2/encar';
const API_KEY = process.env.ENCAR_API_KEY;
if (!API_KEY) {
  console.error('❌ ENCAR_API_KEY not configured');
  process.exit(1);
}

// Conversion rate KRW -> USD (updated periodically)
const KRW_TO_USD = 0.00075;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse args
const args = process.argv.slice(2);
const getArg = (name: string, defaultVal: string) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultVal;
};

const MAX_PAGES = parseInt(getArg('max-pages', '4000'));
const REMOVE_EXPIRED = getArg('remove-expired', 'true') === 'true';
const MIN_PRICE_USD = 1200; // Minimum price in USD

// Allowed makes - Korean and Japanese priority brands
const ALLOWED_MAKES = [
  // Korean brands
  'Hyundai',
  'Kia',
  'KGM',
  'SsangYong', // Old name for KGM
  'Genesis',
  // Japanese brands
  'Toyota',
  'Honda',
  'Lexus',
  'Nissan',
  'Mazda',
  'Mitsubishi',
  'Suzuki',
  'Subaru',
  // American brands (popular in Korea)
  'Chevrolet',
  'ChevroletGMDaewoo', // Korean Chevrolet variant
  'GM',
];

// Transmission type mapping
const transmissionMap: Record<string, string> = {
  'Automatic': 'automatic',
  'Manual': 'manual',
  'Semi-Automatic': 'automatic',
  'CVT': 'cvt',
  'Other': 'automatic',
};

// Fuel type mapping
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

// Body type mapping
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

// Standard options mapping
const standardOptionsMap: Record<string, string> = {
  "010": "Sunroof",
  "059": "Power Tailgate",
  "080": "Soft-Close Doors",
  "024": "Power Folding Mirrors",
  "017": "Alloy Wheels",
  "062": "Roof Rails",
  "082": "Heated Steering Wheel",
  "083": "Power Adjustable Steering Wheel",
  "084": "Paddle Shifters",
  "031": "Steering Wheel Audio Controls",
  "030": "Auto-Dimming Rearview Mirror (ECM)",
  "074": "Hi-pass System",
  "006": "Central Locking",
  "008": "Power Steering",
  "007": "Power Windows",
  "029": "HID Headlights",
  "075": "LED Headlights",
  "020": "Side Airbags",
  "056": "Curtain Airbags",
  "001": "Anti-lock Braking System (ABS)",
  "019": "Traction Control System (TCS)",
  "055": "Electronic Stability Control (ESC)",
  "033": "Tire Pressure Monitoring System (TPMS)",
  "088": "Lane Departure Warning System (LDWS)",
  "002": "Electronic Controlled Suspension (ECS)",
  "086": "Blind Spot Monitoring",
  "058": "Rear View Camera",
  "087": "360° Around View Monitor",
  "026": "Driver Airbag",
  "027": "Passenger Airbag",
  "085": "Front Parking Sensors",
  "032": "Rear Parking Sensors",
  "095": "Head-Up Display (HUD)",
  "094": "Electronic Parking Brake (EPB)",
  "023": "Automatic Climate Control",
  "057": "Smart Key",
  "015": "Keyless Entry",
  "081": "Rain Sensor",
  "097": "Automatic Headlights",
  "005": "Navigation System",
  "004": "Front AV Monitor",
  "054": "Rear AV Monitor",
  "096": "Bluetooth",
  "003": "CD Player",
  "072": "USB Port",
  "071": "AUX Input",
  "068": "Cruise Control",
  "079": "Adaptive Cruise Control",
  "092": "Rear Sunshades",
  "093": "Rear Window Sunshade",
  "014": "Leather Seats",
  "089": "Power Rear Seats",
  "090": "Ventilated Rear Seats",
  "091": "Massage Seats",
  "021": "Power Driver Seat",
  "035": "Power Passenger Seat",
  "022": "Heated Front Seats",
  "063": "Heated Rear Seats",
  "051": "Driver Seat Memory",
  "078": "Passenger Seat Memory",
  "034": "Ventilated Driver Seat",
  "077": "Ventilated Passenger Seat"
};

// Tuning options mapping
const tuningOptionsMap: Record<string, string> = {
  "001": "Roof Wrap",
  "002": "Body Wrap (Vinyl Wrapping)",
  "003": "Body Kit",
  "004": "Spoiler",
  "005": "Side Skirts",
  "006": "LED Brake Lights",
  "007": "Tow Hitch",
  "008": "Comfort Seats",
  "009": "Bucket Seats",
  "010": "D-Cut Steering Wheel",
  "011": "LED Interior Lighting",
  "012": "Head Unit (Audio System)",
  "013": "Speakers/Amplifier/Subwoofer",
  "014": "Sound Deadening/Undercoating",
  "015": "Intake System Tuning",
  "016": "Exhaust System Tuning",
  "017": "Performance Exhaust",
  "018": "ECU Tuning (Chip Tuning)",
  "019": "Performance Sway Bar",
  "020": "Strut Bar",
  "021": "Brake System Upgrade",
  "022": "Sport Pedals",
  "023": "Dash Cam",
  "024": "Push Start Button",
  "025": "Remote Start",
  "026": "Wheel Inch-Up",
  "027": "Aftermarket Wheels",
  "028": "Lowering Springs",
  "029": "Coilovers",
  "030": "Adjustable Suspension"
};

interface ApiOffer {
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
    generation?: string;
    configuration?: string;
    complectation?: string;
    year: number | string;
    color: string;
    price: number | string;
    price_won?: string;
    km_age: number | string;
    engine_type: string;
    transmission_type: string;
    body_type: string;
    address?: string;
    seller_type?: string;
    is_dealer?: boolean;
    images: string | string[];
    displacement?: string;
    extra?: any;
  };
  options?: {
    standard?: string[];
    choice?: string[];
    tuning?: string[];
    etc?: string[];
  };
}

/**
 * Fetch a page of offers from the API
 */
async function fetchOffersPage(page: number): Promise<{ offers: ApiOffer[]; hasMore: boolean }> {
  const url = `${API_BASE}/offers?api_key=${API_KEY}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const offers = data.result || [];
  const nextPage = data.meta?.next_page;

  return {
    offers,
    hasMore: nextPage !== null && nextPage !== undefined && offers.length > 0,
  };
}

/**
 * Parse images from JSON string or array
 */
function parseImages(imagesData: any): string[] {
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

  // Filter to keep only valid URLs
  return images
    .filter((img): img is string => typeof img === 'string' && img.startsWith('http'))
    .slice(0, 20); // Limit to 20 images
}

/**
 * Parse vehicle options (standard and tuning) from API data
 */
function parseOptions(offer: ApiOffer): string[] {
  const allOptions: string[] = [];

  if (!offer.options) return allOptions;

  // Parse standard options
  if (offer.options.standard && Array.isArray(offer.options.standard)) {
    for (const code of offer.options.standard) {
      const optionName = standardOptionsMap[code];
      if (optionName) {
        allOptions.push(optionName);
      }
    }
  }

  // Parse choice options (also from standard map)
  if (offer.options.choice && Array.isArray(offer.options.choice)) {
    for (const code of offer.options.choice) {
      const optionName = standardOptionsMap[code];
      if (optionName && !allOptions.includes(optionName)) {
        allOptions.push(optionName);
      }
    }
  }

  // Parse tuning options
  if (offer.options.tuning && Array.isArray(offer.options.tuning)) {
    for (const code of offer.options.tuning) {
      const optionName = tuningOptionsMap[code];
      if (optionName) {
        allOptions.push(`[Tuning] ${optionName}`);
      }
    }
  }

  return allOptions;
}

/**
 * Get existing Korea vehicles from database
 */
async function getExistingVehicles(): Promise<Set<string>> {
  const sourceIds = new Set<string>();
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from('vehicles')
      .select('source_id')
      .eq('source', 'korea')
      .eq('auction_platform', 'encar')
      .range(offset, offset + 999);

    if (!data || data.length === 0) break;
    data.forEach(v => sourceIds.add(v.source_id));
    offset += 1000;
    if (data.length < 1000) break;
  }

  return sourceIds;
}

/**
 * Map vehicle data to database format
 */
function mapToDbRecord(offer: ApiOffer) {
  const v = offer.data;
  const sourceId = `encar_${v.inner_id}`;
  const images = parseImages(v.images);

  // Parse price (KRW to USD)
  let priceUsd: number | null = null;
  const price = typeof v.price === 'string' ? parseInt(v.price, 10) : v.price;
  if (!isNaN(price) && price > 0) {
    // Encar prices are in 만원 (10,000 KRW units)
    priceUsd = Math.round(price * 10000 * KRW_TO_USD);
  }

  // Parse year
  const year = typeof v.year === 'string' ? parseInt(v.year, 10) : v.year;

  // Parse mileage
  const kmAge = typeof v.km_age === 'string' ? parseInt(v.km_age, 10) : v.km_age;
  const mileage = !isNaN(kmAge) && kmAge > 0 ? kmAge : null;

  // Parse displacement (engine CC)
  let engineCc: number | null = null;
  if (v.displacement) {
    const displacement = parseInt(v.displacement, 10);
    if (!isNaN(displacement) && displacement > 0) {
      engineCc = displacement;
    }
  }

  // Parse vehicle options (standard + tuning)
  const features = parseOptions(offer);

  return {
    source: 'korea',
    source_id: sourceId,
    source_url: v.url,
    make: v.mark,
    model: v.model,
    grade: v.complectation || v.configuration || null,
    year: !isNaN(year) ? year : null,
    mileage,
    engine_cc: engineCc,
    fuel_type: fuelTypeMap[v.engine_type] || 'petrol',
    transmission: transmissionMap[v.transmission_type] || 'automatic',
    body_type: bodyTypeMap[v.body_type] || 'other',
    color: v.color || null,
    start_price_usd: priceUsd,
    current_price_usd: priceUsd,
    original_price: price * 10000, // Store full KRW price
    original_currency: 'KRW',
    auction_status: 'ongoing',
    auction_platform: 'encar',
    condition_report: v.extra ? JSON.stringify(v.extra) : null,
    features: features.length > 0 ? features : null,
    images,
  };
}

async function main() {
  const startTime = Date.now();
  console.log('=== Encar CI Sync ===');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Options: max-pages=${MAX_PAGES}, remove-expired=${REMOVE_EXPIRED}`);

  // Step 1: Get existing vehicles
  console.log('\n[1/4] Fetching existing Encar vehicles from database...');
  const existingVehicles = await getExistingVehicles();
  console.log(`  Found ${existingVehicles.size} existing Encar vehicles`);

  // Step 2: Fetch from API
  console.log('\n[2/4] Fetching vehicles from API...');
  const allVehicles: ApiOffer[] = [];
  const seenIds = new Set<string>();
  let page = 1;
  let emptyPages = 0;

  while (page <= MAX_PAGES) {
    try {
      const { offers, hasMore } = await fetchOffersPage(page);

      if (offers.length === 0) {
        emptyPages++;
        if (emptyPages >= 3) {
          console.log(`  Stopping after ${emptyPages} empty pages at page ${page}`);
          break;
        }
      } else {
        emptyPages = 0;
      }

      for (const offer of offers) {
        const innerId = offer.data?.inner_id || offer.inner_id;
        if (innerId && !seenIds.has(innerId)) {
          seenIds.add(innerId);
          allVehicles.push(offer);
        }
      }

      if (page % 100 === 0) {
        console.log(`  Page ${page}: ${allVehicles.length} unique offers`);
      }

      if (!hasMore) {
        console.log(`  Reached end at page ${page}`);
        break;
      }

      page++;
      // Rate limiting - 100ms between requests
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error(`  Error at page ${page}:`, (e as Error).message);
      // Continue to next page on error
      page++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`  Total vehicles fetched: ${allVehicles.length}`);

  // Filter by allowed makes
  const makeFilteredVehicles = allVehicles.filter(offer => {
    const make = offer.data?.mark;
    return make && ALLOWED_MAKES.some(allowed =>
      make.toLowerCase().includes(allowed.toLowerCase()) ||
      allowed.toLowerCase().includes(make.toLowerCase())
    );
  });

  console.log(`  Filtered to ${makeFilteredVehicles.length} vehicles from allowed makes`);
  console.log(`  Allowed makes: ${ALLOWED_MAKES.join(', ')}`);

  // Filter by minimum price (>= $1200 USD)
  const filteredVehicles = makeFilteredVehicles.filter(offer => {
    const v = offer.data;
    const price = typeof v.price === 'string' ? parseInt(v.price, 10) : v.price;
    if (isNaN(price) || price <= 0) return false;
    // Encar prices are in 만원 (10,000 KRW units)
    const priceUsd = Math.round(price * 10000 * KRW_TO_USD);
    return priceUsd >= MIN_PRICE_USD;
  });

  const priceFiltered = makeFilteredVehicles.length - filteredVehicles.length;
  console.log(`  Filtered out ${priceFiltered} vehicles below $${MIN_PRICE_USD} USD`);
  console.log(`  Final count: ${filteredVehicles.length} vehicles`);

  // Step 3: Upsert vehicles
  console.log('\n[3/4] Upserting vehicles to database...');

  const stats = {
    added: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    filtered_by_make: allVehicles.length - makeFilteredVehicles.length,
    filtered_by_price: priceFiltered,
    filtered_out: allVehicles.length - filteredVehicles.length
  };
  const batchSize = 100;
  const currentSourceIds = new Set<string>();

  for (let i = 0; i < filteredVehicles.length; i += batchSize) {
    const batch = filteredVehicles.slice(i, i + batchSize);
    const records = batch
      .map(v => {
        try {
          const record = mapToDbRecord(v);
          // Skip vehicles without images
          if (!record.images || record.images.length === 0) {
            stats.skipped++;
            return null;
          }
          currentSourceIds.add(record.source_id);
          return record;
        } catch (e) {
          stats.errors++;
          return null;
        }
      })
      .filter(Boolean);

    if (records.length === 0) continue;

    const { error, data } = await supabase
      .from('vehicles')
      .upsert(records, {
        onConflict: 'source,source_id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      console.error(`  Batch error at ${i}:`, error.message);
      stats.errors += records.length;
    } else {
      // Count added vs updated
      for (const record of records) {
        if (record && existingVehicles.has(record.source_id)) {
          stats.updated++;
        } else {
          stats.added++;
        }
      }
    }

    if ((i + batchSize) % 1000 === 0) {
      console.log(`  Processed ${i + batchSize}/${filteredVehicles.length}`);
    }
  }

  console.log(`  Added: ${stats.added}, Updated: ${stats.updated}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`);

  // Step 4: Remove expired/sold vehicles
  let removed = 0;
  if (REMOVE_EXPIRED) {
    console.log('\n[4/4] Removing expired/sold vehicles...');

    // Find vehicles in DB that are not in current sync
    const staleIds: string[] = [];
    for (const existingId of existingVehicles) {
      if (!currentSourceIds.has(existingId)) {
        staleIds.push(existingId);
      }
    }

    console.log(`  Found ${staleIds.length} stale vehicles to remove`);

    // Delete in batches - ONLY Encar vehicles
    for (let i = 0; i < staleIds.length; i += 100) {
      const batch = staleIds.slice(i, i + 100);
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('source', 'korea')
        .eq('auction_platform', 'encar')
        .in('source_id', batch);

      if (!error) {
        removed += batch.length;
      } else {
        console.error(`  Error removing batch:`, error.message);
      }
    }

    console.log(`  Removed ${removed} vehicles`);
  }

  // Update sync config
  console.log('\n[5/5] Updating sync configuration...');
  await supabase.from('sync_config').upsert({
    source: 'encar',
    last_sync_at: new Date().toISOString(),
    last_sync_status: 'success',
    total_vehicles: stats.added + stats.updated,
    vehicles_added: stats.added,
    vehicles_updated: stats.updated,
    vehicles_removed: removed,
  }, {
    onConflict: 'source',
  });

  // Summary
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log('\n=== Summary ===');
  console.log(`Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
  console.log(`Total vehicles fetched: ${allVehicles.length}`);
  console.log(`Filtered out (by make): ${stats.filtered_by_make}`);
  console.log(`Filtered out (by price < $${MIN_PRICE_USD}): ${stats.filtered_by_price}`);
  console.log(`Total filtered out: ${stats.filtered_out}`);
  console.log(`Final vehicles to process: ${filteredVehicles.length}`);
  console.log(`Added: ${stats.added}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Removed: ${removed}`);
  console.log(`Skipped (no images): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  // Output for GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `
## Encar Sync Results

| Metric | Value |
|--------|-------|
| Duration | ${Math.floor(duration / 60)}m ${duration % 60}s |
| Vehicles Fetched | ${allVehicles.length} |
| Filtered Out (by make) | ${stats.filtered_by_make} |
| Filtered Out (price < $${MIN_PRICE_USD}) | ${stats.filtered_by_price} |
| Total Filtered Out | ${stats.filtered_out} |
| Final Vehicles to Process | ${filteredVehicles.length} |
| Added | ${stats.added} |
| Updated | ${stats.updated} |
| Removed | ${removed} |
| Skipped (no images) | ${stats.skipped} |
| Errors | ${stats.errors} |

**Allowed Makes**: ${ALLOWED_MAKES.join(', ')}
**Min Price Filter**: $${MIN_PRICE_USD} USD
`;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
