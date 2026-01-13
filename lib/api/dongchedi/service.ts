/**
 * Dongchedi API Service
 *
 * Main service for interacting with the Dongchedi API
 * Handles fetching offers, filters, changes, and photo synchronization
 */

import {
  DONGCHEDI_CONFIG,
  DONGCHEDI_ENDPOINTS,
  buildApiUrl,
  buildExportUrl,
  convertCnyToUsd,
  isPhotoLinkValid,
  getYesterdayDateString,
} from './config';

import type {
  DongchediFiltersResponse,
  DongchediOffersResponse,
  DongchediChangesResponse,
  DongchediChangeIdResponse,
  DongchediOffer,
  DongchediOffersParams,
  DongchediChangesParams,
  DongchediOfferParams,
  NormalizedDongchediVehicle,
  TRANSMISSION_MAP,
  ENGINE_TYPE_MAP,
  DRIVE_TYPE_MAP,
  BODY_TYPE_MAP,
} from './types';

// Re-export maps for use in normalization
export {
  TRANSMISSION_MAP,
  ENGINE_TYPE_MAP,
  DRIVE_TYPE_MAP,
  BODY_TYPE_MAP,
} from './types';

/**
 * Fetch with error handling
 */
async function fetchApi<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`Dongchedi API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch with Basic Auth for export files
 */
async function fetchExport(url: string): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      'Authorization': DONGCHEDI_CONFIG.EXPORT_AUTH_HEADER,
    },
  });

  if (!response.ok) {
    throw new Error(`Dongchedi export error: ${response.status} ${response.statusText}`);
  }

  return response;
}

// ============================================
// API Methods
// ============================================

/**
 * Get available filters (brands, models, colors, etc.)
 */
export async function getFilters(): Promise<DongchediFiltersResponse> {
  const url = buildApiUrl(DONGCHEDI_ENDPOINTS.FILTERS);
  return fetchApi<DongchediFiltersResponse>(url);
}

/**
 * Get paginated offers with optional filters
 */
export async function getOffers(params: DongchediOffersParams): Promise<DongchediOffersResponse> {
  const url = buildApiUrl(DONGCHEDI_ENDPOINTS.OFFERS, params as Record<string, string | number>);
  return fetchApi<DongchediOffersResponse>(url);
}

/**
 * Get all offers by iterating through pages
 */
export async function getAllOffers(
  filters: Omit<DongchediOffersParams, 'page'> = {},
  maxPages: number = 100,
  onProgress?: (page: number, totalFetched: number) => void
): Promise<DongchediOffer[]> {
  const allOffers: DongchediOffer[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    const response = await getOffers({ ...filters, page });

    for (const change of response.result) {
      if (change.change_type === 'added' && 'url' in change.data) {
        allOffers.push(change.data as DongchediOffer);
      }
    }

    onProgress?.(page, allOffers.length);

    hasMore = response.meta.next_page !== null;
    page++;

    // Rate limiting - wait 100ms between requests
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return allOffers;
}

/**
 * Get single offer by inner_id
 */
export async function getOffer(params: DongchediOfferParams): Promise<DongchediOffer> {
  const url = buildApiUrl(DONGCHEDI_ENDPOINTS.OFFER, params as Record<string, string>);
  return fetchApi<DongchediOffer>(url);
}

/**
 * Get change ID for a specific date (starting point for changes feed)
 */
export async function getChangeId(date: string): Promise<DongchediChangeIdResponse> {
  const url = buildApiUrl(DONGCHEDI_ENDPOINTS.CHANGE_ID, { date });
  return fetchApi<DongchediChangeIdResponse>(url);
}

/**
 * Get changes since a specific change_id
 */
export async function getChanges(params: DongchediChangesParams): Promise<DongchediChangesResponse> {
  const url = buildApiUrl(DONGCHEDI_ENDPOINTS.CHANGES, params as Record<string, number>);
  return fetchApi<DongchediChangesResponse>(url);
}

/**
 * Get all changes by iterating through pages
 */
export async function getAllChangesSince(
  changeId: number,
  maxIterations: number = 1000
): Promise<DongchediChangesResponse['result']> {
  const allChanges: DongchediChangesResponse['result'] = [];
  let currentChangeId = changeId;
  let iterations = 0;

  while (iterations < maxIterations) {
    const response = await getChanges({ change_id: currentChangeId });
    allChanges.push(...response.result);

    if (response.meta.next_change_id === null) {
      break;
    }

    currentChangeId = response.meta.next_change_id;
    iterations++;

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return allChanges;
}

// ============================================
// Export File Methods
// ============================================

/**
 * Download daily export CSV file
 */
export async function downloadExportCsv(
  fileName: string,
  date?: string
): Promise<string> {
  const targetDate = date || getYesterdayDateString();
  const url = buildExportUrl(targetDate, fileName, 'csv');

  const response = await fetchExport(url);
  return response.text();
}

/**
 * Download active_offer.csv with photo links
 */
export async function downloadActiveOffersCsv(date?: string): Promise<string> {
  return downloadExportCsv('active_offer', date);
}

/**
 * Parse CSV string to array of objects
 */
export function parseCsv<T extends Record<string, string>>(
  csvString: string,
  delimiter: string = '|'
): T[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const results: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter);
    const row = {} as T;

    headers.forEach((header, index) => {
      (row as Record<string, string>)[header] = values[index]?.trim() || '';
    });

    results.push(row);
  }

  return results;
}

// ============================================
// Normalization
// ============================================

/**
 * Import maps dynamically to avoid circular dependencies
 */
import {
  TRANSMISSION_MAP as TransMap,
  ENGINE_TYPE_MAP as EngineMap,
  DRIVE_TYPE_MAP as DriveMap,
  BODY_TYPE_MAP as BodyMap,
} from './types';

/**
 * Normalize a Dongchedi offer to our internal vehicle format
 */
export function normalizeOffer(offer: DongchediOffer): NormalizedDongchediVehicle {
  // Map transmission
  const transmission = TransMap[offer.transmission_type] || null;

  // Map engine/fuel type
  const fuelType = EngineMap[offer.engine_type] || null;

  // Map drive type
  let driveType = DriveMap[offer.drive_type] || null;
  if (!driveType && offer.drive_type?.toLowerCase().includes('all')) {
    driveType = 'AWD';
  }

  // Map body type
  const bodyType = BodyMap[offer.body_type] || offer.body_type?.toLowerCase() || null;

  // Calculate engine CC from displacement (liters to cc)
  const engineCc = offer.displacement ? Math.round(offer.displacement * 1000) : null;

  // Convert price
  const priceUsd = convertCnyToUsd(offer.price);

  // Normalize color
  const colorLower = offer.color?.toLowerCase() || '';
  let normalizedColor: string | null = null;
  if (colorLower.includes('white')) normalizedColor = 'white';
  else if (colorLower.includes('black')) normalizedColor = 'black';
  else if (colorLower.includes('silver')) normalizedColor = 'silver';
  else if (colorLower.includes('gray') || colorLower.includes('grey')) normalizedColor = 'gray';
  else if (colorLower.includes('red')) normalizedColor = 'red';
  else if (colorLower.includes('blue')) normalizedColor = 'blue';
  else if (colorLower.includes('green')) normalizedColor = 'green';
  else if (colorLower.includes('brown')) normalizedColor = 'brown';
  else if (colorLower.includes('beige') || colorLower.includes('champagne')) normalizedColor = 'beige';
  else normalizedColor = offer.color || null;

  return {
    source: 'china',
    source_id: offer.inner_id,
    source_url: offer.url,
    make: offer.mark,
    model: offer.model,
    year: offer.year,
    mileage: offer.km_age,
    engine_cc: engineCc,
    transmission,
    fuel_type: fuelType,
    color: normalizedColor,
    body_type: bodyType,
    drive_type: driveType,
    grade: offer.complectation || null,
    start_price_usd: priceUsd,
    current_price_usd: priceUsd,
    auction_status: 'ongoing', // Dongchedi is direct sales
    images: offer.images || [],
    description: offer.description || null,
    horse_power: offer.horse_power || null,
    owners_count: offer.owners_count || null,
    city: offer.city || null,
    region: offer.region || null,
    seller_type: offer.is_dealer ? 'dealer' : 'private',
    equipment: offer.equipment || [],
    raw_data: offer,
  };
}

/**
 * Normalize multiple offers
 */
export function normalizeOffers(offers: DongchediOffer[]): NormalizedDongchediVehicle[] {
  return offers.map(normalizeOffer);
}

// ============================================
// Photo Sync Helpers
// ============================================

/**
 * Extract valid photo links from active_offer.csv
 * Only returns links where synced_at is less than 6 days old
 */
export async function getValidPhotoLinks(
  date?: string
): Promise<Map<string, string[]>> {
  const csv = await downloadActiveOffersCsv(date);
  const rows = parseCsv<{ inner_id: string; images: string; synced_at: string }>(csv);

  const validLinks = new Map<string, string[]>();

  for (const row of rows) {
    if (row.synced_at && isPhotoLinkValid(row.synced_at)) {
      const images = row.images ? row.images.split(',').map((url) => url.trim()) : [];
      if (images.length > 0) {
        validLinks.set(row.inner_id, images);
      }
    }
  }

  return validLinks;
}

// ============================================
// Brands List (Popular brands in China)
// ============================================

export const DONGCHEDI_POPULAR_BRANDS = [
  'BYD',
  'Toyota',
  'Honda',
  'Volkswagen',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'NIO',
  'Xpeng',
  'Li Auto',
  'Geely',
  'Great Wall',
  'Chery',
  'Nissan',
  'Hyundai',
  'Kia',
  'Lexus',
  'Porsche',
  'Tesla',
  'Volvo',
];
