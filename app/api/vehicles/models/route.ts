import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const makes = searchParams.get('makes')?.split(',').filter(Boolean);

  if (!makes || makes.length === 0) {
    return NextResponse.json({ models: {} });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('make, model')
      .eq('is_visible', true)
      .in('make', makes)
      .not('model', 'is', null)
      .limit(50000);

    if (error) throw error;

    // Deduplicate and group models by make
    const modelsByMake: Record<string, string[]> = {};
    const seen = new Set<string>();

    for (const row of data || []) {
      if (!row.make || !row.model) continue;
      const key = `${row.make}::${row.model}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!modelsByMake[row.make]) modelsByMake[row.make] = [];
      modelsByMake[row.make].push(row.model);
    }

    for (const make of Object.keys(modelsByMake)) {
      modelsByMake[make].sort();
    }

    return NextResponse.json(
      { models: modelsByMake },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' } }
    );
  } catch {
    return NextResponse.json({ models: {} }, { status: 500 });
  }
}
