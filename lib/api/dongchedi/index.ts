/**
 * Dongchedi API Module
 *
 * Export all Dongchedi API functionality
 */

// Configuration
export {
  DONGCHEDI_CONFIG,
  DONGCHEDI_ENDPOINTS,
  DONGCHEDI_EXPORT_FILES,
  buildApiUrl,
  buildExportUrl,
  convertCnyToUsd,
  isPhotoLinkValid,
  getTodayDateString,
  getYesterdayDateString,
} from './config';

// Types
export type {
  DongchediFiltersResponse,
  DongchediOffer,
  DongchediOfferChange,
  DongchediOffersResponse,
  DongchediChangesResponse,
  DongchediChangeIdResponse,
  DongchediOffersParams,
  DongchediChangesParams,
  DongchediOfferParams,
  DongchediActiveOfferRow,
  NormalizedDongchediVehicle,
} from './types';

export {
  TRANSMISSION_MAP,
  ENGINE_TYPE_MAP,
  DRIVE_TYPE_MAP,
  BODY_TYPE_MAP,
} from './types';

// Service methods
export {
  getFilters,
  getOffers,
  getAllOffers,
  getOffer,
  getChangeId,
  getChanges,
  getAllChangesSince,
  downloadExportCsv,
  downloadActiveOffersCsv,
  parseCsv,
  normalizeOffer,
  normalizeOffers,
  getValidPhotoLinks,
  DONGCHEDI_POPULAR_BRANDS,
} from './service';
