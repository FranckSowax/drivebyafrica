import { NextRequest, NextResponse } from 'next/server';
import { getEncarClient } from '@/lib/api/encar';

/**
 * GET /api/encar/changes
 * Récupère les changements (ajouts, modifications, suppressions) depuis un change_id
 *
 * Query params:
 * - change_id (required): ID de départ pour récupérer les changements
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
    if (isNaN(changeId) || changeId < 0) {
      return NextResponse.json(
        { error: 'Le paramètre change_id doit être un nombre positif' },
        { status: 400 }
      );
    }

    const client = getEncarClient();
    const changes = await client.getChanges({ change_id: changeId });

    return NextResponse.json(changes);
  } catch (error) {
    console.error('Erreur lors de la récupération des changements Encar:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les changements' },
      { status: 500 }
    );
  }
}
