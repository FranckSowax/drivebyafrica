import { NextRequest, NextResponse } from 'next/server';
import { getChe168Client } from '@/lib/api/che168';

/**
 * GET /api/che168/changes
 * Récupère les changements depuis un change_id (ajouts, modifications, suppressions)
 *
 * Query params:
 * - change_id (required): ID du dernier changement synchronisé
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const changeIdStr = searchParams.get('change_id');

    if (!changeIdStr) {
      return NextResponse.json(
        { error: 'Le paramètre change_id est requis' },
        { status: 400 }
      );
    }

    const changeId = parseInt(changeIdStr, 10);

    if (isNaN(changeId) || changeId < 1) {
      return NextResponse.json(
        { error: 'Le paramètre change_id doit être un nombre positif' },
        { status: 400 }
      );
    }

    const client = getChe168Client();
    const changes = await client.getChanges({ change_id: changeId });

    return NextResponse.json(changes);
  } catch (error) {
    console.error('Erreur lors de la récupération des changements CHE168:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les changements' },
      { status: 500 }
    );
  }
}
