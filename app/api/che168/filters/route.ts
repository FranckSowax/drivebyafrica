import { NextResponse } from 'next/server';
import { getChe168Client } from '@/lib/api/che168';

/**
 * GET /api/che168/filters
 * Récupère tous les filtres disponibles pour CHE168
 *
 * Retourne:
 * - mark: marques avec leurs modèles associés
 * - transmission_type: types de transmission
 * - color: couleurs disponibles
 * - body_type: types de carrosserie
 * - engine_type: types de moteur
 * - drive_type: types de transmission
 */
export async function GET() {
  try {
    const client = getChe168Client();
    const filters = await client.getFilters();

    return NextResponse.json(filters);
  } catch (error) {
    console.error('Erreur lors de la récupération des filtres CHE168:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les filtres' },
      { status: 500 }
    );
  }
}
