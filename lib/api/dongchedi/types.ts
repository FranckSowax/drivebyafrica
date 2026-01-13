/**
 * Dongchedi API Types
 *
 * Types for the Dongchedi car marketplace API
 */

// ============================================
// Filter Types
// ============================================

export interface DongchediFiltersResponse {
  mark: Record<string, {
    model: Record<string, {
      complectation: string[];
    }>;
  }>;
  transmission_type: string[];
  color: string[];
  body_type: string[];
  engine_type: string[];
  drive_type: string[];
}

// ============================================
// Offer/Listing Types
// ============================================

export interface DongchediOffer {
  id: number;
  inner_id: string;
  url: string;
  mark: string;
  model: string;
  complectation: string;
  year: number;
  color: string;
  price: number; // in CNY
  km_age: number; // mileage in km
  body_type: string;
  engine_type: string;
  transmission_type: string;
  address: string;
  is_dealer: boolean;
  displacement: number;
  city: string;
  title: string;
  owners_count: number;
  drive_type: string;
  equipment: string[];
  horse_power: number;
  reg_date: string;
  section: string;
  seller: string;
  seller_type: string;
  salon_id: string;
  region: string;
  description: string;
  images: string[];
  extra_prep?: Record<string, any>;
}

export interface DongchediOfferChange {
  id: number;
  inner_id: string;
  change_type: 'added' | 'changed' | 'removed';
  created_at: string;
  data: DongchediOffer | { new_price?: number };
}

export interface DongchediOffersResponse {
  result: DongchediOfferChange[];
  meta: {
    page: number;
    next_page: number | null;
    limit: number;
  };
}

export interface DongchediChangesResponse {
  result: DongchediOfferChange[];
  meta: {
    cur_change_id: number;
    next_change_id: number | null;
    limit: number;
  };
}

export interface DongchediChangeIdResponse {
  change_id: number;
}

// ============================================
// API Request Parameters
// ============================================

export interface DongchediOffersParams {
  page: number;
  mark?: string;
  model?: string;
  complectation?: string;
  transmission_type?: string;
  color?: string;
  body_type?: string;
  engine_type?: string;
  drive_type?: string;
  year_from?: number;
  year_to?: number;
  km_age_from?: number;
  km_age_to?: number;
  price_from?: number;
  price_to?: number;
}

export interface DongchediChangesParams {
  change_id: number;
}

export interface DongchediChangeIdParams {
  date: string; // yyyy-mm-dd format
}

export interface DongchediOfferParams {
  inner_id: string;
}

// ============================================
// CSV Export Types (for photo sync)
// ============================================

export interface DongchediActiveOfferRow {
  inner_id: string;
  images: string; // pipe-separated URLs
  synced_at: string; // ISO date string
}

// ============================================
// Normalized Vehicle Type (for our database)
// ============================================

export interface NormalizedDongchediVehicle {
  source: 'china';
  source_id: string;
  source_url: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  engine_cc: number | null;
  transmission: 'automatic' | 'manual' | 'cvt' | null;
  fuel_type: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | null;
  color: string | null;
  body_type: string | null;
  drive_type: 'FWD' | 'RWD' | 'AWD' | '4WD' | null;
  grade: string | null;
  start_price_usd: number;
  current_price_usd: number;
  auction_status: 'ongoing'; // Dongchedi listings are direct sales, always ongoing
  images: string[];
  description: string | null;
  horse_power: number | null;
  owners_count: number | null;
  city: string | null;
  region: string | null;
  seller_type: 'dealer' | 'private' | null;
  equipment: string[];
  raw_data: DongchediOffer;
}

// ============================================
// Mapping Helpers
// ============================================

export type TransmissionMapping = {
  [key: string]: 'automatic' | 'manual' | 'cvt' | null;
};

export const TRANSMISSION_MAP: TransmissionMapping = {
  'Automatic': 'automatic',
  'Manual': 'manual',
  'CVT': 'cvt',
  'E-CVT': 'cvt',
  'DCT': 'automatic',
  'Wet DCT': 'automatic',
  'Dry DCT': 'automatic',
  'AMT': 'automatic',
  'DHT': 'automatic',
  'Sequential': 'automatic',
  'Single-Speed': 'automatic',
};

export type EngineTypeMapping = {
  [key: string]: 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | null;
};

export const ENGINE_TYPE_MAP: EngineTypeMapping = {
  'Petrol': 'petrol',
  'Diesel': 'diesel',
  'Electric': 'electric',
  'Hybrid': 'hybrid',
  'PHEV': 'hybrid',
  'EREV': 'hybrid',
  'Bi-Fuel': 'lpg',
  'CNG': 'lpg',
};

export type DriveTypeMapping = {
  [key: string]: 'FWD' | 'RWD' | 'AWD' | '4WD' | null;
};

export const DRIVE_TYPE_MAP: DriveTypeMapping = {
  'FWD': 'FWD',
  'RWD': 'RWD',
  'AWD': 'AWD',
  'all-wheel': 'AWD',
  '4WD': '4WD',
  '4x4': '4WD',
};

export type BodyTypeMapping = {
  [key: string]: string;
};

export const BODY_TYPE_MAP: BodyTypeMapping = {
  'SUV': 'suv',
  'Sedan': 'sedan',
  'Hatchback': 'hatchback',
  'Minivan': 'van',
  'Wagon': 'wagon',
  'Coupe': 'coupe',
  'Convertible': 'convertible',
  'Pickup': 'pickup',
  'Liftback': 'hatchback',
  'Microvan': 'van',
  'Sports Car': 'coupe',
  'Mini Truck': 'pickup',
  'Light Commercial': 'van',
  'Motorhome': 'van',
};
