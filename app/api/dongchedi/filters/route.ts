import { NextResponse } from 'next/server';
import { getFilters, DONGCHEDI_POPULAR_BRANDS } from '@/lib/api/dongchedi';

/**
 * GET /api/dongchedi/filters
 *
 * Get available filter options from Dongchedi API
 * Returns brands, models, colors, body types, etc.
 */
export async function GET() {
  try {
    const filters = await getFilters();

    // Extract brand list
    const brands = Object.keys(filters.mark).sort();

    // Create a simplified response
    return NextResponse.json({
      brands,
      popularBrands: DONGCHEDI_POPULAR_BRANDS,
      transmissionTypes: filters.transmission_type,
      colors: filters.color,
      bodyTypes: filters.body_type,
      engineTypes: filters.engine_type,
      driveTypes: filters.drive_type,
      // Full brand/model/complectation hierarchy
      hierarchy: filters.mark,
    });
  } catch (error) {
    console.error('Dongchedi filters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters from Dongchedi' },
      { status: 500 }
    );
  }
}
