import { NextRequest, NextResponse } from 'next/server';
import { getOffer, normalizeOffer } from '@/lib/api/dongchedi';

/**
 * GET /api/dongchedi/offer/[id]
 *
 * Get a single vehicle listing by inner_id
 *
 * Params:
 * - id: string (inner_id from Dongchedi)
 *
 * Query params:
 * - normalize: boolean (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const offer = await getOffer({ inner_id: id });

    // Check if normalization is requested
    const { searchParams } = new URL(request.url);
    const shouldNormalize = searchParams.get('normalize') !== 'false';

    if (shouldNormalize) {
      const normalizedOffer = normalizeOffer(offer);
      return NextResponse.json({ data: normalizedOffer });
    }

    return NextResponse.json({ data: offer });
  } catch (error) {
    console.error('Dongchedi offer error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offer from Dongchedi' },
      { status: 500 }
    );
  }
}
