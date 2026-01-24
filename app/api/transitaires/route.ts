import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch active transitaires for a specific country/port (public API for users)
export async function GET(request: Request) {
  try {
    const supabaseClient = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseClient as any;
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const port = searchParams.get('port');

    if (!country) {
      return NextResponse.json({ error: 'Pays requis' }, { status: 400 });
    }

    let query = supabase
      .from('transitaires')
      .select(`
        id,
        name,
        company_name,
        country,
        port,
        phone,
        whatsapp,
        email,
        description,
        specialties,
        languages,
        is_verified,
        average_rating,
        total_reviews
      `)
      .eq('is_active', true)
      .eq('country', country)
      .order('is_verified', { ascending: false }) // Verified first
      .order('average_rating', { ascending: false }); // Then by rating

    // If port is specified, prioritize transitaires for that port but also include country-wide ones
    if (port) {
      // First get port-specific, then country-wide (port is null)
      const { data: portSpecific } = await query.eq('port', port);
      const { data: countryWide } = await supabase
        .from('transitaires')
        .select(`
          id,
          name,
          company_name,
          country,
          port,
          phone,
          whatsapp,
          email,
          description,
          specialties,
          languages,
          is_verified,
          average_rating,
          total_reviews
        `)
        .eq('is_active', true)
        .eq('country', country)
        .is('port', null)
        .order('is_verified', { ascending: false })
        .order('average_rating', { ascending: false });

      const combined = [...(portSpecific || []), ...(countryWide || [])];
      // Remove duplicates
      const unique = combined.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);

      return NextResponse.json({ transitaires: unique });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transitaires:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des transitaires' }, { status: 500 });
    }

    return NextResponse.json({ transitaires: data || [] });
  } catch (error) {
    console.error('Error in GET transitaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
