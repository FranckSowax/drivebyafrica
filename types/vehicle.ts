import type { DbVehicle } from './database';

export type VehicleSource = 'korea' | 'china' | 'dubai';
export type AuctionStatus = 'upcoming' | 'ongoing' | 'sold' | 'ended';
export type VehicleStatus = 'available' | 'reserved' | 'sold' | 'pending';
export type TransmissionType = 'automatic' | 'manual' | 'cvt';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg';
export type DriveType = 'FWD' | 'RWD' | 'AWD' | '4WD';

export interface Vehicle extends DbVehicle {
  source: VehicleSource;
  auction_status: AuctionStatus;
  status?: VehicleStatus;
  is_visible?: boolean;
  admin_notes?: string;
}

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
  transmission?: TransmissionType;
  fuelType?: FuelType;
  driveType?: DriveType;
  status?: VehicleStatus;
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
  status: AuctionStatus;
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
export const STATUS_COLORS: Record<AuctionStatus, string> = {
  upcoming: 'bg-royal-blue',
  ongoing: 'bg-mandarin',
  sold: 'bg-red-500',
  ended: 'bg-nobel',
};

export const STATUS_LABELS: Record<AuctionStatus, string> = {
  upcoming: 'À venir',
  ongoing: 'En cours',
  sold: 'Vendu',
  ended: 'Terminé',
};
