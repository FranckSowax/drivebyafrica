/**
 * Dongchedi API Configuration
 *
 * API Provider: auto-api.com
 * Platform: Dongchedi (China's leading car marketplace)
 *
 * IMPORTANT: Photo links from Dongchedi expire after 6 days.
 * Photos must be cached on our server to maintain active links.
 */

export const DONGCHEDI_CONFIG = {
  // API Endpoints
  API_BASE_URL: 'https://api1.auto-api.com/api/v2/dongchedi',
  API_KEY: process.env.DONGCHEDI_API_KEY || 'iT6g1fVqqGRAHeYkPFtU',

  // Daily Export Server (for CSV/JSON files with photo links)
  EXPORT_HOST: 'https://autobase-perez.auto-api.com',
  EXPORT_LOGIN: 'ewing',
  EXPORT_PASSWORD: 'iT6g1fVqqGRAHeYkPFtU',

  // Generate Basic Auth header for export downloads
  get EXPORT_AUTH_HEADER(): string {
    const credentials = `${this.EXPORT_LOGIN}:${this.EXPORT_PASSWORD}`;
    const base64 = Buffer.from(credentials).toString('base64');
    return `Basic ${base64}`;
  },

  // Photo caching settings
  PHOTO_EXPIRY_DAYS: 6,
  PHOTO_CACHE_BUCKET: 'dongchedi-photos', // Supabase storage bucket

  // Data sync settings
  EXPORT_AVAILABLE_AFTER_UTC: 6, // New files available after 06:00 UTC
  EXPORT_RETENTION_DAYS: 2, // Files stored for 2 days on their server

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Currency
  SOURCE_CURRENCY: 'CNY',
  CNY_TO_USD_RATE: 0.14, // Approximate rate, should be fetched dynamically
} as const;

// API Endpoints
export const DONGCHEDI_ENDPOINTS = {
  FILTERS: '/filters',
  OFFERS: '/offers',
  OFFER: '/offer',
  CHANGES: '/changes',
  CHANGE_ID: '/change_id',
} as const;

// Export file names
export const DONGCHEDI_EXPORT_FILES = {
  ALL_ACTIVE: 'all_active',
  NEW_DAILY: 'new_daily',
  REMOVED_DAILY: 'removed_daily',
  ACTIVE_OFFER: 'active_offer', // Contains photo links with synced_at
} as const;

// Export file formats
export type ExportFormat = 'csv' | 'json' | 'xlsx';

/**
 * Build URL for daily export file download
 */
export function buildExportUrl(
  date: string, // yyyy-mm-dd format
  fileName: string,
  format: ExportFormat = 'csv'
): string {
  return `${DONGCHEDI_CONFIG.EXPORT_HOST}/dongchedi/${date}/${fileName}.${format}`;
}

/**
 * Build API URL with parameters
 */
export function buildApiUrl(
  endpoint: string,
  params: Record<string, string | number | undefined> = {}
): string {
  const url = new URL(`${DONGCHEDI_CONFIG.API_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', DONGCHEDI_CONFIG.API_KEY);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

/**
 * Convert CNY price to USD
 */
export function convertCnyToUsd(priceInCny: number): number {
  return Math.round(priceInCny * DONGCHEDI_CONFIG.CNY_TO_USD_RATE);
}

/**
 * Check if a synced_at date is still valid (less than 6 days old)
 */
export function isPhotoLinkValid(syncedAt: string | Date): boolean {
  const syncDate = new Date(syncedAt);
  const now = new Date();
  const diffDays = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < DONGCHEDI_CONFIG.PHOTO_EXPIRY_DAYS;
}

/**
 * Get today's date in yyyy-mm-dd format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date in yyyy-mm-dd format (for export files)
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}
