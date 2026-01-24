/**
 * Types pour l'API Encar (auto-api.com)
 * Documentation: https://auto-api.com/encar
 */

// Types de base pour les filtres
export type EncarTransmissionType =
  | 'Manual'
  | 'Automatic'
  | 'Semi-Automatic'
  | 'CVT'
  | 'Other';

export type EncarColor =
  | 'White' | 'Black' | 'Silver' | 'Gray' | 'Blue'
  | 'Red' | 'Brown' | 'Beige' | 'Gold' | 'Green'
  | 'Yellow' | 'Orange' | 'Purple' | 'Pink' | 'Pearl'
  | 'Burgundy' | 'Turquoise' | 'Sky Blue' | 'Other';

export type EncarBodyType =
  | 'SUV' | 'Sedan' | 'Hatchback' | 'Minivan'
  | 'Pickup Truck' | 'Coupe/Roadster' | 'Microbus' | 'RV' | 'Other';

export type EncarEngineType =
  | 'Gasoline' | 'Diesel' | 'Electric'
  | 'Hybrid (Gasoline)' | 'Hybrid (Diesel)' | 'Hydrogen'
  | 'LPG' | 'CNG' | 'Gasoline + LPG' | 'Gasoline + CNG'
  | 'LPG + Electric' | 'Other';

export type EncarChangeType = 'added' | 'changed' | 'removed';

export type EncarSellerType = 'DEALER' | 'PRIVATE';

// Structure de données d'un véhicule Encar
export interface EncarVehicleData {
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
  price: number; // En unités de 10,000 KRW
  price_won: string; // Prix complet en KRW
  km_age: number; // Kilométrage
  engine_type: string;
  transmission_type: string;
  body_type: string;
  address: string;
  seller_type: EncarSellerType;
  is_dealer: boolean;
  section?: string;
  seller?: string;
  salon_id?: string;
  description?: string;
  displacement?: string; // Cylindrée en cc
  offer_created?: string;
  images: string[];
  extra?: EncarExtraData;
  options?: string[];
}

export interface EncarExtraData {
  diagnosis?: Record<string, unknown>;
  inspection?: Record<string, unknown>;
  accidents?: unknown[];
}

// Réponse de /offers
export interface EncarOfferResult {
  id: number;
  inner_id: string;
  change_type: EncarChangeType;
  created_at: string;
  data: EncarVehicleData;
}

export interface EncarOffersResponse {
  result: EncarOfferResult[];
  meta: {
    page: number;
    next_page: number | null;
    limit: number;
  };
}

// Réponse de /changes
export interface EncarChangeResult {
  id: number;
  inner_id: string;
  change_type: EncarChangeType;
  created_at: string;
  data?: EncarVehicleData | EncarPriceChange;
}

export interface EncarPriceChange {
  new_price: number;
  new_price_won: number;
}

export interface EncarChangesResponse {
  result: EncarChangeResult[];
  meta: {
    cur_change_id: number;
    next_change_id: number;
    limit: number;
  };
}

// Réponse de /change_id
export interface EncarChangeIdResponse {
  change_id: number;
}

// Réponse de /offer (détail d'un véhicule)
export interface EncarOfferResponse extends EncarVehicleData {
  year_month?: string;
  power?: string;
  vin?: string;
}

// Structure des filtres disponibles
export interface EncarFiltersResponse {
  mark: Record<string, EncarMarkFilters>;
  transmission_type: EncarTransmissionType[];
  color: EncarColor[];
  body_type: EncarBodyType[];
  engine_type: EncarEngineType[];
}

export interface EncarMarkFilters {
  model: Record<string, EncarModelFilters>;
}

export interface EncarModelFilters {
  configuration: Record<string, EncarConfigurationFilters>;
}

export interface EncarConfigurationFilters {
  complectation: string[];
}

// Paramètres de requête pour /offers
export interface EncarOffersParams {
  page: number;
  mark?: string;
  model?: string;
  configuration?: string;
  complectation?: string;
  transmission_type?: string;
  color?: string;
  body_type?: string;
  engine_type?: string;
  year_from?: number;
  year_to?: number;
  km_age_from?: number;
  km_age_to?: number;
  price_from?: number; // En unités de 10,000 KRW
  price_to?: number; // En unités de 10,000 KRW
}

// Paramètres de requête pour /changes
export interface EncarChangesParams {
  change_id: number;
}

// Paramètres de requête pour /change_id
export interface EncarChangeIdParams {
  date: string; // Format: yyyy-mm-dd
}

// Paramètres de requête pour /offer
export interface EncarOfferParams {
  inner_id: string;
}

// Paramètres pour POST /api/v1/offer/info
export interface EncarOfferInfoParams {
  url: string;
}

// Configuration de l'API Encar
export interface EncarApiConfig {
  accessName: string;
  apiKey: string;
  baseUrl?: string;
}

// Erreur API Encar
export interface EncarApiError {
  message: string;
  status: number;
  code?: string;
}

// Types d'export quotidien
export type EncarExportFormat = 'csv' | 'json' | 'xlsx';
export type EncarExportFile =
  | 'all_active'
  | 'new_daily'
  | 'removed_daily';

// Conversion de prix KRW vers USD (taux approximatif)
export const KRW_TO_USD_RATE = 0.00075;

// Convertir le prix Encar (unités de 10,000 KRW) en USD
export function convertEncarPriceToUSD(priceUnits: number): number {
  const priceKRW = priceUnits * 10000;
  return Math.round(priceKRW * KRW_TO_USD_RATE);
}

// Convertir le prix KRW complet en USD
export function convertKRWToUSD(priceKRW: number): number {
  return Math.round(priceKRW * KRW_TO_USD_RATE);
}
