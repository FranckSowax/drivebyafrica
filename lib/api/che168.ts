/**
 * Client API CHE168 (auto-api.com)
 * Documentation: https://auto-api.com/che168
 * Source: Marché automobile chinois (che168.com)
 */

import type {
  Che168ApiConfig,
  Che168FiltersResponse,
  Che168OffersResponse,
  Che168OffersParams,
  Che168ChangesResponse,
  Che168ChangesParams,
  Che168ChangeIdResponse,
  Che168ChangeIdParams,
  Che168OfferResponse,
  Che168OfferParams,
  Che168OfferInfoParams,
  Che168ApiError,
  Che168ExportFormat,
  Che168ExportFile,
} from '@/types/che168';

// Configuration par défaut - utilise la même clé API que Encar (même fournisseur)
const DEFAULT_CONFIG: Che168ApiConfig = {
  accessName: process.env.CHE168_ACCESS_NAME || process.env.ENCAR_ACCESS_NAME || 'api1',
  apiKey: process.env.CHE168_API_KEY || process.env.ENCAR_API_KEY || '',
};

/**
 * Client API CHE168
 */
export class Che168ApiClient {
  private config: Che168ApiConfig;
  private baseUrlV2: string;
  private baseUrlV1: string;

  constructor(config?: Partial<Che168ApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrlV2 = `https://${this.config.accessName}.auto-api.com/api/v2/che168`;
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
      const error: Che168ApiError = {
        message: `CHE168 API error: ${response.statusText}`,
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
      const error: Che168ApiError = {
        message: `CHE168 API error: ${response.statusText}`,
        status: response.status,
      };
      throw error;
    }

    return response.json();
  }

  /**
   * GET /filters - Récupère tous les filtres disponibles
   */
  async getFilters(): Promise<Che168FiltersResponse> {
    return this.fetchV2<Che168FiltersResponse>('/filters');
  }

  /**
   * GET /offers - Récupère la liste des véhicules avec pagination et filtres
   */
  async getOffers(params: Che168OffersParams): Promise<Che168OffersResponse> {
    return this.fetchV2<Che168OffersResponse>('/offers', params as unknown as Record<string, string | number | undefined>);
  }

  /**
   * GET /offer - Récupère les détails d'un véhicule par inner_id
   */
  async getOffer(params: Che168OfferParams): Promise<Che168OfferResponse> {
    return this.fetchV2<Che168OfferResponse>('/offer', { inner_id: params.inner_id });
  }

  /**
   * GET /change_id - Récupère le premier change_id pour une date donnée
   */
  async getChangeId(params: Che168ChangeIdParams): Promise<Che168ChangeIdResponse> {
    return this.fetchV2<Che168ChangeIdResponse>('/change_id', { date: params.date });
  }

  /**
   * GET /changes - Récupère les changements depuis un change_id
   */
  async getChanges(params: Che168ChangesParams): Promise<Che168ChangesResponse> {
    return this.fetchV2<Che168ChangesResponse>('/changes', { change_id: params.change_id });
  }

  /**
   * POST /api/v1/offer/info - Récupère les données d'une annonce par URL
   */
  async getOfferByUrl(params: Che168OfferInfoParams): Promise<Che168OfferResponse> {
    return this.fetchV1Post<Che168OfferResponse>('/offer/info', { url: params.url });
  }

  /**
   * Génère l'URL pour télécharger les exports quotidiens
   */
  getDailyExportUrl(
    date: string,
    file: Che168ExportFile,
    format: Che168ExportFormat
  ): string {
    return `https://${this.config.accessName}.auto-api.com/${date}/${file}.${format}`;
  }

  /**
   * Récupère toutes les offres en paginant automatiquement
   */
  async getAllOffers(
    params?: Omit<Che168OffersParams, 'page'>,
    onProgress?: (page: number, total: number) => void,
    maxPages?: number
  ): Promise<Che168OffersResponse['result']> {
    const allResults: Che168OffersResponse['result'] = [];
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

      // Vérifier si on a atteint la limite de pages
      if (maxPages && currentPage >= maxPages) {
        hasMore = false;
      } else if (response.meta.next_page === null) {
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
  ): Promise<Che168ChangesResponse['result']> {
    const allResults: Che168ChangesResponse['result'] = [];
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
let che168Client: Che168ApiClient | null = null;

/**
 * Récupère l'instance singleton du client CHE168
 */
export function getChe168Client(): Che168ApiClient {
  if (!che168Client) {
    che168Client = new Che168ApiClient();
  }
  return che168Client;
}

/**
 * Crée une nouvelle instance du client avec une configuration personnalisée
 */
export function createChe168Client(config: Partial<Che168ApiConfig>): Che168ApiClient {
  return new Che168ApiClient(config);
}

export default Che168ApiClient;
