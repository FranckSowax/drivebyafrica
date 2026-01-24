import { NextRequest, NextResponse } from 'next/server';
import { getEncarClient } from '@/lib/api/encar';

/**
 * GET /api/encar/change-id
 * Récupère le premier change_id pour une date donnée
 * Utilisé pour initialiser la synchronisation des changements
 *
 * Query params:
 * - date (required): date au format yyyy-mm-dd
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Le paramètre date est requis' },
        { status: 400 }
      );
    }

    // Valider le format de la date (yyyy-mm-dd)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Le format de date doit être yyyy-mm-dd' },
        { status: 400 }
      );
    }

    const client = getEncarClient();
    const result = await client.getChangeId({ date });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération du change_id Encar:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer le change_id' },
      { status: 500 }
    );
  }
}
