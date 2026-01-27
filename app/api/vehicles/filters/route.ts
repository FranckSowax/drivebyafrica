import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Use admin client for efficient distinct queries
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// Cache the response for 1 hour (3600 seconds)
export const revalidate = 3600;

// GET - Return all vehicle filter options
export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    // Run all distinct queries in parallel for best performance
    // Using raw SQL via rpc would be faster, but these queries are still efficient with proper indexes
    const [
      makesResult,
      transmissionsResult,
      fuelTypesResult,
      driveTypesResult,
      bodyTypesResult,
      colorsResult,
      yearsResult,
    ] = await Promise.all([
      // Get all distinct makes (sampling 50k from each source to ensure coverage)
      // This approach works around the lack of DISTINCT in PostgREST
      Promise.all([
        supabase
          .from('vehicles')
          .select('make')
          .eq('is_visible', true)
          .eq('source', 'china')
          .not('make', 'is', null)
          .limit(50000),
        supabase
          .from('vehicles')
          .select('make')
          .eq('is_visible', true)
          .eq('source', 'korea')
          .not('make', 'is', null)
          .limit(50000),
        supabase
          .from('vehicles')
          .select('make')
          .eq('is_visible', true)
          .eq('source', 'dubai')
          .not('make', 'is', null)
          .limit(50000),
      ]),
      supabase
        .from('vehicles')
        .select('transmission')
        .eq('is_visible', true)
        .not('transmission', 'is', null)
        .limit(10000),
      supabase
        .from('vehicles')
        .select('fuel_type')
        .eq('is_visible', true)
        .not('fuel_type', 'is', null)
        .limit(10000),
      supabase
        .from('vehicles')
        .select('drive_type')
        .eq('is_visible', true)
        .not('drive_type', 'is', null)
        .limit(10000),
      supabase
        .from('vehicles')
        .select('body_type')
        .eq('is_visible', true)
        .not('body_type', 'is', null)
        .limit(10000),
      supabase
        .from('vehicles')
        .select('color')
        .eq('is_visible', true)
        .not('color', 'is', null)
        .limit(10000),
      supabase
        .from('vehicles')
        .select('year')
        .eq('is_visible', true)
        .not('year', 'is', null)
        .limit(10000),
    ]);

    // Merge makes from all sources
    const allMakes: string[] = [];
    for (const result of makesResult) {
      if (result.data) {
        for (const row of result.data) {
          if (row.make) allMakes.push(row.make);
        }
      }
    }

    // Extract unique values
    const makes = [...new Set(allMakes)].sort();
    const transmissions = [...new Set(
      transmissionsResult.data?.map(r => r.transmission).filter((v): v is string => !!v) || []
    )].sort();
    const fuelTypes = [...new Set(
      fuelTypesResult.data?.map(r => r.fuel_type).filter((v): v is string => !!v) || []
    )].sort();
    const driveTypes = [...new Set(
      driveTypesResult.data?.map(r => r.drive_type).filter((v): v is string => !!v) || []
    )].sort();
    const bodyTypes = [...new Set(
      bodyTypesResult.data?.map(r => r.body_type).filter((v): v is string => !!v) || []
    )].sort();
    const colors = [...new Set(
      colorsResult.data?.map(r => r.color).filter((v): v is string => !!v) || []
    )].sort();

    // Get year range
    const years = yearsResult.data?.map(r => r.year).filter((y): y is number => y !== null) || [];
    const minYear = years.length > 0 ? Math.min(...years) : 2000;
    const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

    return NextResponse.json({
      makes,
      transmissions,
      fuelTypes,
      driveTypes,
      bodyTypes,
      colors,
      minYear,
      maxYear,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching vehicle filters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    );
  }
}
