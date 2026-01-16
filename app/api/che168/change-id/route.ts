import { NextRequest, NextResponse } from 'next/server';
import { getChe168Client } from '@/lib/api/che168';

/**
 * GET /api/che168/change-id
 * Récupère le premier change_id pour une date donnée
 * Utilisé pour initialiser le suivi des changements
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
        { error: 'Le paramètre date est requis (format: yyyy-mm-dd)' },
        { status: 400 }
      );
    }

    // Valider le format de la date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Format de date invalide. Utilisez yyyy-mm-dd' },
        { status: 400 }
      );
    }

    const client = getChe168Client();
    const result = await client.getChangeId({ date });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération du change_id CHE168:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer le change_id' },
      { status: 500 }
    );
  }
}
