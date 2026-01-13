import { NextRequest, NextResponse } from 'next/server';
import { getOffers, normalizeOffers } from '@/lib/api/dongchedi';
import type { DongchediOffersParams } from '@/lib/api/dongchedi';

/**
 * GET /api/dongchedi/offers
 *
 * Fetch vehicle listings from Dongchedi API
 *
 * Query params:
 * - page: number (required)
 * - mark: string (brand filter)
 * - model: string
 * - body_type: string
 * - transmission_type: string
 * - engine_type: string
 * - drive_type: string
 * - color: string
 * - year_from: number
 * - year_to: number
 * - price_from: number (in CNY)
 * - price_to: number (in CNY)
 * - km_age_from: number
 * - km_age_to: number
 * - normalize: boolean (default: true) - normalize to our format
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (page < 1) {
      return NextResponse.json(
        { error: 'Page must be a positive integer' },
        { status: 400 }
      );
    }

    // Build params object
    const params: DongchediOffersParams = {
      page,
      mark: searchParams.get('mark') || undefined,
      model: searchParams.get('model') || undefined,
      complectation: searchParams.get('complectation') || undefined,
      body_type: searchParams.get('body_type') || undefined,
      transmission_type: searchParams.get('transmission_type') || undefined,
      engine_type: searchParams.get('engine_type') || undefined,
      drive_type: searchParams.get('drive_type') || undefined,
      color: searchParams.get('color') || undefined,
      year_from: searchParams.get('year_from')
        ? parseInt(searchParams.get('year_from')!, 10)
        : undefined,
      year_to: searchParams.get('year_to')
        ? parseInt(searchParams.get('year_to')!, 10)
        : undefined,
      price_from: searchParams.get('price_from')
        ? parseInt(searchParams.get('price_from')!, 10)
        : undefined,
      price_to: searchParams.get('price_to')
        ? parseInt(searchParams.get('price_to')!, 10)
        : undefined,
      km_age_from: searchParams.get('km_age_from')
        ? parseInt(searchParams.get('km_age_from')!, 10)
        : undefined,
      km_age_to: searchParams.get('km_age_to')
        ? parseInt(searchParams.get('km_age_to')!, 10)
        : undefined,
    };

    // Fetch from Dongchedi API
    const response = await getOffers(params);

    // Check if normalization is requested
    const shouldNormalize = searchParams.get('normalize') !== 'false';

    if (shouldNormalize) {
      // Extract and normalize offers
      const rawOffers = response.result
        .filter((change) => change.change_type === 'added' && 'url' in change.data)
        .map((change) => change.data as any);

      const normalizedOffers = normalizeOffers(rawOffers);

      return NextResponse.json({
        data: normalizedOffers,
        meta: {
          page: response.meta.page,
          nextPage: response.meta.next_page,
          limit: response.meta.limit,
          hasMore: response.meta.next_page !== null,
        },
      });
    }

    // Return raw response
    return NextResponse.json(response);
  } catch (error) {
    console.error('Dongchedi API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offers from Dongchedi' },
      { status: 500 }
    );
  }
}
