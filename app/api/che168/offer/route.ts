import { NextRequest, NextResponse } from 'next/server';
import { getChe168Client } from '@/lib/api/che168';

/**
 * GET /api/che168/offer
 * Récupère les détails d'un véhicule CHE168 par inner_id
 *
 * Query params:
 * - inner_id (required): ID interne du véhicule sur che168.com
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const innerId = searchParams.get('inner_id');

    if (!innerId) {
      return NextResponse.json(
        { error: 'Le paramètre inner_id est requis' },
        { status: 400 }
      );
    }

    const client = getChe168Client();
    const offer = await client.getOffer({ inner_id: innerId });

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'offre CHE168:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer l\'offre' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/che168/offer
 * Récupère les détails d'un véhicule CHE168 par URL
 *
 * Body:
 * - url (required): URL de l'annonce sur che168.com
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Le paramètre url est requis' },
        { status: 400 }
      );
    }

    const client = getChe168Client();
    const offer = await client.getOfferByUrl({ url });

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'offre CHE168 par URL:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer l\'offre' },
      { status: 500 }
    );
  }
}
