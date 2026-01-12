import { NextRequest, NextResponse } from 'next/server';
import { getEncarClient } from '@/lib/api/encar';

/**
 * GET /api/encar/offer
 * Récupère les détails complets d'un véhicule par inner_id
 *
 * Query params:
 * - inner_id (required): identifiant de l'annonce sur encar.com
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

    const client = getEncarClient();
    const offer = await client.getOffer({ inner_id: innerId });

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'offre Encar:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer l\'offre' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/encar/offer
 * Récupère les détails d'un véhicule par URL encar.com
 *
 * Body:
 * - url (required): lien vers l'annonce sur encar.com
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

    // Valider que l'URL est bien une URL encar.com
    if (!url.includes('encar.com')) {
      return NextResponse.json(
        { error: 'L\'URL doit être une URL encar.com valide' },
        { status: 400 }
      );
    }

    const client = getEncarClient();
    const offer = await client.getOfferByUrl({ url });

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'offre par URL:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer l\'offre' },
      { status: 500 }
    );
  }
}
