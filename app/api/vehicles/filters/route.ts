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
    // Try using the optimized SQL function (1 query instead of 8+)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_vehicle_filter_options');

    if (!rpcError && rpcData) {
      // RPC succeeded — also fetch total count for the search bar
      const { count } = await supabase
        .from('vehicles')
        .select('*', { count: 'estimated', head: true })
        .eq('is_visible', true);

      return NextResponse.json({
        makes: rpcData.makes || [],
        transmissions: rpcData.transmissions || [],
        fuelTypes: rpcData.fuel_types || [],
        driveTypes: rpcData.drive_types || [],
        bodyTypes: rpcData.body_types || [],
        colors: rpcData.colors || [],
        minYear: rpcData.min_year || 2000,
        maxYear: rpcData.max_year || new Date().getFullYear(),
        totalCount: count || 0,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
      });
    }

    // Fallback: run parallel queries if RPC function doesn't exist yet
    const [
      makesResult,
      transmissionsResult,
      fuelTypesResult,
      driveTypesResult,
      bodyTypesResult,
      colorsResult,
      yearsResult,
      countResult,
    ] = await Promise.all([
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
      supabase
        .from('vehicles')
        .select('*', { count: 'estimated', head: true })
        .eq('is_visible', true),
    ]);

    // Merge makes from all sources using Set directly
    const makesSet = new Set<string>();
    for (const result of makesResult) {
      if (result.data) {
        for (const row of result.data) {
          if (row.make) makesSet.add(row.make);
        }
      }
    }

    const makes = [...makesSet].sort();
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
      totalCount: countResult.count || 0,
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
