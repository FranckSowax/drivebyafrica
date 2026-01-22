import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';

interface Transitaire {
  id: string;
  name: string;
  company_name: string | null;
  country: string;
  port: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  is_active: boolean;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

// GET: Fetch all transitaires (with optional filters)
export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminCheck.supabase as any;
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const port = searchParams.get('port');
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('transitaires')
      .select('*')
      .order('country')
      .order('average_rating', { ascending: false });

    if (country) {
      query = query.eq('country', country);
    }
    if (port) {
      query = query.eq('port', port);
    }
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transitaires:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des transitaires' }, { status: 500 });
    }

    // Get unique countries and ports for filters
    const { data: countries } = await supabase
      .from('transitaires')
      .select('country')
      .order('country');

    const { data: ports } = await supabase
      .from('transitaires')
      .select('port, country')
      .not('port', 'is', null)
      .order('port');

    const uniqueCountries = [...new Set(countries?.map((c: { country: string }) => c.country) || [])];
    const uniquePorts = ports?.reduce((acc: { port: string; country: string }[], p: { port: string; country: string }) => {
      if (p.port && !acc.find(x => x.port === p.port)) {
        acc.push({ port: p.port, country: p.country });
      }
      return acc;
    }, []) || [];

    return NextResponse.json({
      transitaires: data || [],
      filters: {
        countries: uniqueCountries,
        ports: uniquePorts,
      },
    });
  } catch (error) {
    console.error('Error in GET transitaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Create a new transitaire
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminCheck.supabase as any;
    const body = await request.json();

    const {
      name,
      company_name,
      country,
      port,
      phone,
      whatsapp,
      email,
      address,
      description,
      specialties,
      languages,
      is_active = true,
      is_verified = false,
    } = body;

    // Validation
    if (!name || !country || !phone) {
      return NextResponse.json(
        { error: 'Nom, pays et téléphone sont requis' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('transitaires')
      .insert({
        name,
        company_name,
        country,
        port,
        phone,
        whatsapp: whatsapp || phone, // Default whatsapp to phone if not provided
        email,
        address,
        description,
        specialties: specialties || [],
        languages: languages || ['french'],
        is_active,
        is_verified,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transitaire:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du transitaire' }, { status: 500 });
    }

    return NextResponse.json({ transitaire: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST transitaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT: Update a transitaire
export async function PUT(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminCheck.supabase as any;
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID du transitaire requis' }, { status: 400 });
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('transitaires')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transitaire:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du transitaire' }, { status: 500 });
    }

    return NextResponse.json({ transitaire: data });
  } catch (error) {
    console.error('Error in PUT transitaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE: Delete a transitaire (soft delete by setting is_active to false)
export async function DELETE(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminCheck.supabase as any;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const hardDelete = searchParams.get('hard') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'ID du transitaire requis' }, { status: 400 });
    }

    if (hardDelete) {
      // Hard delete - permanently remove
      const { error } = await supabase
        .from('transitaires')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting transitaire:', error);
        return NextResponse.json({ error: 'Erreur lors de la suppression du transitaire' }, { status: 500 });
      }
    } else {
      // Soft delete - just deactivate
      const { error } = await supabase
        .from('transitaires')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error deactivating transitaire:', error);
        return NextResponse.json({ error: 'Erreur lors de la désactivation du transitaire' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE transitaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
