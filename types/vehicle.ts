import type { DbVehicle } from './database';

export type VehicleSource = 'korea' | 'china' | 'dubai';
export type VehicleStatus = 'available' | 'reserved' | 'sold' | 'pending';
export type TransmissionType = 'automatic' | 'manual' | 'cvt';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg';
export type DriveType = 'FWD' | 'RWD' | 'AWD' | '4WD';

export interface Vehicle extends Omit<DbVehicle, 'source' | 'auction_status' | 'status' | 'is_visible' | 'admin_notes'> {
  source: VehicleSource;
  auction_status?: string; // Legacy field, not used
  status?: VehicleStatus | null;
  is_visible?: boolean;
  admin_notes?: string | null;
}

export type VehicleColor = 'white' | 'black' | 'silver' | 'gray' | 'red' | 'blue' | 'green' | 'brown' | 'beige' | 'other';
export type BodyType = 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'van' | 'coupe' | 'wagon' | 'convertible' | 'other';

export interface VehicleFilters {
  source?: VehicleSource | 'all';
  makes?: string[];
  models?: string[];
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  mileageMax?: number;
  engineCcMin?: number;
  engineCcMax?: number;
  // Allow string values from API (Dongchedi uses original values)
  transmission?: TransmissionType | string;
  fuelType?: FuelType | string;
  driveType?: DriveType | string;
  color?: VehicleColor | string;
  bodyType?: BodyType | string;
  status?: VehicleStatus;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'mileage_asc' | 'mileage_desc';
  notifyNewMatches?: boolean;
}

export interface VehicleSearchParams {
  query?: string;
  page?: number;
  limit?: number;
  filters?: VehicleFilters;
}

export interface PaginatedVehicles {
  data: Vehicle[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// Source-specific vehicle data from APIs
export interface KoreaVehicle {
  id: string;
  url: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  engineCc: number;
  transmission: string;
  fuelType: string;
  color: string;
  grade: string;
  auctionSheetUrl: string;
  startPriceUsd: number;
  currentPriceUsd: number;
  platform: string;
  auctionDate: string;
  status: VehicleStatus;
  lotNumber: string;
  images: string[];
}

export interface ChinaVehicle {
  id: string;
  url: string;
  brand: string;
  series: string;
  productionYear: number;
  kilometers: number;
  displacement: number;
  gearbox: string;
  fuel: string;
  exteriorColor: string;
  condition: string;
  priceYuan: number;
  priceUsd: number;
  seller: string;
  location: string;
  photos: string[];
}

export interface DubaiVehicle {
  id: string;
  url: string;
  manufacturer: string;
  model: string;
  modelYear: number;
  odometer: number;
  engineSize: number;
  transmissionType: string;
  fuelType: string;
  color: string;
  damageType: string;
  estimatedValue: number;
  currentBid: number;
  auctionHouse: string;
  auctionDateTime: string;
  lotId: string;
  imageUrls: string[];
}

// Vehicle card display props
export interface VehicleCardProps {
  vehicle: Vehicle;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
  showBidButton?: boolean;
}

// Source flags for display
export const SOURCE_FLAGS: Record<VehicleSource, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

export const SOURCE_NAMES: Record<VehicleSource, string> = {
  korea: 'Corée du Sud',
  china: 'Chine',
  dubai: 'Dubaï',
};

// Status colors for badges
export const STATUS_COLORS: Record<VehicleStatus, string> = {
  available: 'bg-jewel',
  reserved: 'bg-mandarin',
  sold: 'bg-red-500',
  pending: 'bg-royal-blue',
};

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Disponible',
  reserved: 'Réservé',
  sold: 'Vendu',
  pending: 'En attente',
};
