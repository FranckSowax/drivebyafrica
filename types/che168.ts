/**
 * Types pour l'API CHE168 (auto-api.com)
 * Documentation: https://auto-api.com/che168
 * Source: Chine - che168.com (marché automobile chinois)
 */

// Types de base pour les filtres
export type Che168TransmissionType = 'Manual' | 'Automatic';

export type Che168Color =
  | 'White' | 'Black' | 'Silver' | 'Dark Gray' | 'Blue'
  | 'Red' | 'Brown' | 'Orange' | 'Yellow' | 'Green'
  | 'Purple' | 'Champagne' | 'Other';

export type Che168BodyType =
  | 'Crossover/SUV' | 'Sedan' | 'Hatchback' | 'Minivan'
  | 'Pickup' | 'Coupe/Roadster' | 'Microvan' | 'Light Truck'
  | 'Van' | 'Mini' | 'Sports Car' | 'Other';

export type Che168EngineType =
  | 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid'
  | 'Plug-in Hybrid' | 'Range Extender' | 'Hydrogen Fuel Cell'
  | 'Gasoline + 48V Mild Hybrid' | 'Gasoline + 24V Mild Hybrid'
  | 'Gasoline + CNG' | 'CNG' | 'Other';

export type Che168DriveType =
  | 'FWD' | 'RWD' | 'AWD'
  | 'RWD (dual-motor)' | 'AWD (dual-motor)'
  | 'AWD (tri-motor)' | 'AWD (quad-motor)'
  | 'RWD (mid-engine)' | 'Other';

export type Che168ChangeType = 'added' | 'changed' | 'removed';

export type Che168SellerType = 'dealer' | 'private';

// Structure de données d'un véhicule CHE168
export interface Che168VehicleData {
  id: number;
  inner_id: string;
  url: string;
  mark: string;
  model: string;
  title: string; // Titre complet du listing
  year: number;
  color: string;
  price: number; // Prix en CNY (Yuan chinois)
  km_age: number; // Kilométrage en km
  engine_type: string;
  transmission_type: string;
  body_type: string;
  drive_type: string;
  address: string;
  seller_type: Che168SellerType;
  is_dealer: boolean;
  section?: string; // "Used" ou "New"
  salon_id?: string;
  description?: string;
  displacement?: number; // Cylindrée en litres (ex: 5.2)
  offer_created?: string; // Date de création du listing
  images: string[] | string; // Peut être un array ou une string JSON
  extra?: Che168ExtraData;
  power?: number; // Puissance en chevaux (hp)
  vin?: string;
  city?: string;
  first_registration?: string; // Format: YYYY-MM
}

export interface Che168ExtraData {
  inspection?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
}

// Réponse de /offers
export interface Che168OfferResult {
  id: number;
  inner_id: string;
  change_type: Che168ChangeType;
  created_at: string;
  data: Che168VehicleData;
}

export interface Che168OffersResponse {
  result: Che168OfferResult[];
  meta: {
    page: number;
    next_page: number | null;
    limit: number;
  };
}

// Réponse de /changes
export interface Che168ChangeResult {
  id: number;
  inner_id: string;
  change_type: Che168ChangeType;
  created_at: string;
  data?: Che168VehicleData | Che168PriceChange;
}

export interface Che168PriceChange {
  new_price: number;
}

export interface Che168ChangesResponse {
  result: Che168ChangeResult[];
  meta: {
    cur_change_id: number;
    next_change_id: number;
    limit: number;
  };
}

// Réponse de /change_id
export interface Che168ChangeIdResponse {
  change_id: number;
}

// Réponse de /offer (détail d'un véhicule)
export interface Che168OfferResponse extends Che168VehicleData {}

// Structure des filtres disponibles
export interface Che168FiltersResponse {
  mark: Record<string, Che168MarkFilters>;
  transmission_type: Che168TransmissionType[];
  color: Che168Color[];
  body_type: Che168BodyType[];
  engine_type: Che168EngineType[];
  drive_type: Che168DriveType[];
}

export interface Che168MarkFilters {
  model: string[];
}

// Paramètres de requête pour /offers
export interface Che168OffersParams {
  page: number;
  mark?: string;
  model?: string;
  transmission_type?: string;
  color?: string;
  body_type?: string;
  engine_type?: string;
  drive_type?: string;
  year_from?: number;
  year_to?: number;
  km_age_from?: number;
  km_age_to?: number;
  price_from?: number; // En CNY
  price_to?: number; // En CNY
}

// Paramètres de requête pour /changes
export interface Che168ChangesParams {
  change_id: number;
}

// Paramètres de requête pour /change_id
export interface Che168ChangeIdParams {
  date: string; // Format: yyyy-mm-dd
}

// Paramètres de requête pour /offer
export interface Che168OfferParams {
  inner_id: string;
}

// Paramètres pour POST /api/v1/offer/info
export interface Che168OfferInfoParams {
  url: string;
}

// Configuration de l'API CHE168
export interface Che168ApiConfig {
  accessName: string;
  apiKey: string;
  baseUrl?: string;
}

// Erreur API CHE168
export interface Che168ApiError {
  message: string;
  status: number;
  code?: string;
}

// Types d'export quotidien
export type Che168ExportFormat = 'csv' | 'json' | 'xlsx';
export type Che168ExportFile =
  | 'all_active'
  | 'new_daily'
  | 'removed_daily';

// Conversion de prix CNY vers USD (taux approximatif)
// 1 USD ≈ 7.25 CNY (janvier 2025)
export const CNY_TO_USD_RATE = 0.138;

// Convertir le prix CHE168 (CNY) en USD
export function convertChe168PriceToUSD(priceCNY: number): number {
  return Math.round(priceCNY * CNY_TO_USD_RATE);
}

// Convertir la cylindrée en litres vers cc
export function convertDisplacementToCC(displacementLiters: number): number {
  return Math.round(displacementLiters * 1000);
}

// Marques populaires chinoises à synchroniser
export const CHE168_POPULAR_MAKES = [
  'BYD',
  'Geely',
  'Changan',
  'Haval',
  'Great Wall',
  'NIO',
  'XPeng',
  'Li Auto',
  'Zeekr',
  'Ora',
  'Tank',
  'Wey',
  'Jetour',
  'Chery',
  'GAC',
  'SAIC',
  'Dongfeng',
  'FAW',
  'BAIC',
  'JAC',
  // Marques internationales populaires en Chine
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Volkswagen',
  'Toyota',
  'Honda',
  'Porsche',
  'Tesla',
  'Land Rover',
  'Lexus',
];
