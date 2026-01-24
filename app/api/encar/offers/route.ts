import { NextRequest, NextResponse } from 'next/server';
import { getEncarClient } from '@/lib/api/encar';
import type { EncarOffersParams } from '@/types/encar';

/**
 * GET /api/encar/offers
 * Récupère la liste des véhicules avec pagination et filtres
 *
 * Query params:
 * - page (required): numéro de page
 * - mark: marque (ex: Hyundai, Kia)
 * - model: modèle
 * - configuration: configuration
 * - complectation: finition
 * - transmission_type: type de transmission
 * - color: couleur
 * - body_type: type de carrosserie
 * - engine_type: type de moteur
 * - year_from, year_to: plage d'années
 * - km_age_from, km_age_to: plage de kilométrage
 * - price_from, price_to: plage de prix (en unités de 10,000 KRW)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Le paramètre page doit être un nombre positif' },
        { status: 400 }
      );
    }

    const params: EncarOffersParams = {
      page,
      mark: searchParams.get('mark') || undefined,
      model: searchParams.get('model') || undefined,
      configuration: searchParams.get('configuration') || undefined,
      complectation: searchParams.get('complectation') || undefined,
      transmission_type: searchParams.get('transmission_type') || undefined,
      color: searchParams.get('color') || undefined,
      body_type: searchParams.get('body_type') || undefined,
      engine_type: searchParams.get('engine_type') || undefined,
      year_from: searchParams.get('year_from')
        ? parseInt(searchParams.get('year_from')!, 10)
        : undefined,
      year_to: searchParams.get('year_to')
        ? parseInt(searchParams.get('year_to')!, 10)
        : undefined,
      km_age_from: searchParams.get('km_age_from')
        ? parseInt(searchParams.get('km_age_from')!, 10)
        : undefined,
      km_age_to: searchParams.get('km_age_to')
        ? parseInt(searchParams.get('km_age_to')!, 10)
        : undefined,
      price_from: searchParams.get('price_from')
        ? parseInt(searchParams.get('price_from')!, 10)
        : undefined,
      price_to: searchParams.get('price_to')
        ? parseInt(searchParams.get('price_to')!, 10)
        : undefined,
    };

    const client = getEncarClient();
    const offers = await client.getOffers(params);

    return NextResponse.json(offers);
  } catch (error) {
    console.error('Erreur lors de la récupération des offres Encar:', error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les offres' },
      { status: 500 }
    );
  }
}
