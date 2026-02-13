import { NextResponse } from 'next/server';
import { getEncarClient } from '@/lib/api/encar';

// Cache for 1 hour — filter options rarely change
export const revalidate = 3600;

/**
 * GET /api/encar/filters
 * Récupère tous les filtres disponibles (marques, modèles, couleurs, etc.)
 */
export async function GET() {
  try {
    const client = getEncarClient();
    const filters = await client.getFilters();

    return NextResponse.json(filters, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des filtres Encar:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les filtres' },
      { status: 500 }
    );
  }
}
