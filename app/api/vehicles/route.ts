import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '36');
    const offset = (page - 1) * limit;

    // Filters
    const source = searchParams.get('source');
    const makes = searchParams.get('makes')?.split(',').filter(Boolean);
    const models = searchParams.get('models')?.split(',').filter(Boolean);
    const yearFrom = searchParams.get('yearFrom');
    const yearTo = searchParams.get('yearTo');
    const priceFrom = searchParams.get('priceFrom');
    const priceTo = searchParams.get('priceTo');
    const mileageMax = searchParams.get('mileageMax');
    const transmission = searchParams.get('transmission');
    const fuelType = searchParams.get('fuelType');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at_desc';

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('vehicles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    if (makes && makes.length > 0) {
      query = query.in('make', makes);
    }

    if (models && models.length > 0) {
      query = query.in('model', models);
    }

    if (yearFrom) {
      query = query.gte('year', parseInt(yearFrom));
    }

    if (yearTo) {
      query = query.lte('year', parseInt(yearTo));
    }

    if (priceFrom) {
      query = query.gte('current_price_usd', parseInt(priceFrom));
    }

    if (priceTo) {
      query = query.lte('current_price_usd', parseInt(priceTo));
    }

    if (mileageMax) {
      query = query.lte('mileage', parseInt(mileageMax));
    }

    if (transmission) {
      query = query.eq('transmission', transmission);
    }

    if (fuelType) {
      query = query.eq('fuel_type', fuelType);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      query = query.or(`make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_asc':
        query = query.order('start_price_usd', { ascending: true, nullsFirst: false });
        break;
      case 'price_desc':
        query = query.order('start_price_usd', { ascending: false, nullsFirst: false });
        break;
      case 'year_desc':
        query = query.order('year', { ascending: false, nullsFirst: false });
        break;
      case 'year_asc':
        query = query.order('year', { ascending: true, nullsFirst: false });
        break;
      case 'mileage_asc':
        query = query.order('mileage', { ascending: true, nullsFirst: false });
        break;
      case 'mileage_desc':
        query = query.order('mileage', { ascending: false, nullsFirst: false });
        break;
      default:
        query = query.order('created_at', { ascending: false, nullsFirst: false });
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: vehicles, error, count } = await query;

    if (error) {
      console.error('Vehicles API error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des véhicules' },
        { status: 500 }
      );
    }

    // Filter vehicles that have at least one valid (non-expired) image
    const validVehicles = (vehicles || []).filter(vehicle => {
      if (!vehicle.images) return false;
      try {
        const images = typeof vehicle.images === 'string'
          ? JSON.parse(vehicle.images)
          : vehicle.images;

        if (!Array.isArray(images) || images.length === 0) return false;

        // Check if at least one image is valid (not expired)
        return images.some((img: string) => {
          if (!img) return false;

          // Permanent URLs
          if (img.includes('supabase') || img.includes('encar') || img.includes('autoimg.cn')) {
            return true;
          }

          // Check x-expires for Dongchedi (byteimg.com)
          const expiresMatch = img.match(/x-expires=(\d+)/);
          if (expiresMatch) {
            const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
            return expiresTimestamp > Date.now() + 300000; // 5 min buffer
          }

          return true; // Other URLs assumed valid
        });
      } catch {
        return false;
      }
    });

    return NextResponse.json({
      vehicles: validVehicles,
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Vehicles API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
