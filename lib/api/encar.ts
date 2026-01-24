/**
 * Client API Encar (auto-api.com)
 * Documentation: https://auto-api.com/encar
 */

import type {
  EncarApiConfig,
  EncarFiltersResponse,
  EncarOffersResponse,
  EncarOffersParams,
  EncarChangesResponse,
  EncarChangesParams,
  EncarChangeIdResponse,
  EncarChangeIdParams,
  EncarOfferResponse,
  EncarOfferParams,
  EncarOfferInfoParams,
  EncarApiError,
  EncarExportFormat,
  EncarExportFile,
} from '@/types/encar';

// Configuration par défaut
const DEFAULT_CONFIG: EncarApiConfig = {
  accessName: process.env.ENCAR_ACCESS_NAME || 'driveby',
  apiKey: process.env.ENCAR_API_KEY || '',
};

/**
 * Client API Encar
 */
export class EncarApiClient {
  private config: EncarApiConfig;
  private baseUrlV2: string;
  private baseUrlV1: string;

  constructor(config?: Partial<EncarApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrlV2 = `https://${this.config.accessName}.auto-api.com/api/v2/encar`;
    this.baseUrlV1 = `https://${this.config.accessName}.auto-api.com/api/v1`;
  }

  /**
   * Effectue une requête GET vers l'API v2
   */
  private async fetchV2<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrlV2}${endpoint}`);
    url.searchParams.set('api_key', this.config.apiKey);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: EncarApiError = {
        message: `Encar API error: ${response.statusText}`,
        status: response.status,
      };
      throw error;
    }

    return response.json();
  }

  /**
   * Effectue une requête POST vers l'API v1
   */
  private async fetchV1Post<T>(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrlV1}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error: EncarApiError = {
        message: `Encar API error: ${response.statusText}`,
        status: response.status,
      };
      throw error;
    }

    return response.json();
  }

  /**
   * GET /filters - Récupère tous les filtres disponibles
   */
  async getFilters(): Promise<EncarFiltersResponse> {
    return this.fetchV2<EncarFiltersResponse>('/filters');
  }

  /**
   * GET /offers - Récupère la liste des véhicules avec pagination et filtres
   */
  async getOffers(params: EncarOffersParams): Promise<EncarOffersResponse> {
    return this.fetchV2<EncarOffersResponse>('/offers', params as unknown as Record<string, string | number | undefined>);
  }

  /**
   * GET /offer - Récupère les détails d'un véhicule par inner_id
   */
  async getOffer(params: EncarOfferParams): Promise<EncarOfferResponse> {
    return this.fetchV2<EncarOfferResponse>('/offer', { inner_id: params.inner_id });
  }

  /**
   * GET /change_id - Récupère le premier change_id pour une date donnée
   */
  async getChangeId(params: EncarChangeIdParams): Promise<EncarChangeIdResponse> {
    return this.fetchV2<EncarChangeIdResponse>('/change_id', { date: params.date });
  }

  /**
   * GET /changes - Récupère les changements depuis un change_id
   */
  async getChanges(params: EncarChangesParams): Promise<EncarChangesResponse> {
    return this.fetchV2<EncarChangesResponse>('/changes', { change_id: params.change_id });
  }

  /**
   * POST /api/v1/offer/info - Récupère les données d'une annonce par URL
   */
  async getOfferByUrl(params: EncarOfferInfoParams): Promise<EncarOfferResponse> {
    return this.fetchV1Post<EncarOfferResponse>('/offer/info', { url: params.url });
  }

  /**
   * Génère l'URL pour télécharger les exports quotidiens
   */
  getDailyExportUrl(
    date: string,
    file: EncarExportFile,
    format: EncarExportFormat
  ): string {
    return `https://${this.config.accessName}.auto-api.com/${date}/${file}.${format}`;
  }

  /**
   * Récupère toutes les offres en paginant automatiquement
   */
  async getAllOffers(
    params?: Omit<EncarOffersParams, 'page'>,
    onProgress?: (page: number, total: number) => void
  ): Promise<EncarOffersResponse['result']> {
    const allResults: EncarOffersResponse['result'] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getOffers({
        ...params,
        page: currentPage,
      });

      allResults.push(...response.result);

      if (onProgress) {
        onProgress(currentPage, allResults.length);
      }

      if (response.meta.next_page === null) {
        hasMore = false;
      } else {
        currentPage = response.meta.next_page;
      }

      // Respecter le rate limiting (pause de 100ms entre les requêtes)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return allResults;
  }

  /**
   * Récupère tous les changements depuis un change_id en paginant automatiquement
   */
  async getAllChanges(
    startChangeId: number,
    onProgress?: (changeId: number, total: number) => void
  ): Promise<EncarChangesResponse['result']> {
    const allResults: EncarChangesResponse['result'] = [];
    let currentChangeId = startChangeId;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getChanges({
        change_id: currentChangeId,
      });

      allResults.push(...response.result);

      if (onProgress) {
        onProgress(currentChangeId, allResults.length);
      }

      if (response.result.length === 0 || response.meta.next_change_id === currentChangeId) {
        hasMore = false;
      } else {
        currentChangeId = response.meta.next_change_id;
      }

      // Respecter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return allResults;
  }
}

// Instance singleton du client
let encarClient: EncarApiClient | null = null;

/**
 * Récupère l'instance singleton du client Encar
 */
export function getEncarClient(): EncarApiClient {
  if (!encarClient) {
    encarClient = new EncarApiClient();
  }
  return encarClient;
}

/**
 * Crée une nouvelle instance du client avec une configuration personnalisée
 */
export function createEncarClient(config: Partial<EncarApiConfig>): EncarApiClient {
  return new EncarApiClient(config);
}

export default EncarApiClient;
