import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// Quote status flow:
// - pending: Default state when user creates a quote
// - validated: Quote has been validated by admin, awaiting payment
// - accepted: Deposit of $1000 has been received

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('quotes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      // Special filter for price requests
      if (status === 'price_request') {
        query = query.eq('quote_type', 'price_request').eq('status', 'pending');
      } else {
        query = query.eq('status', status);
      }
    }

    if (search) {
      query = query.or(`quote_number.ilike.%${search}%,vehicle_make.ilike.%${search}%,vehicle_model.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: quotes, error, count } = await query;

    if (error) {
      console.error('Error fetching quotes:', error);
      throw error;
    }

    // Get user profiles for each quote
    const userIds = [...new Set(quotes?.map(q => q.user_id) || [])];
    let profiles: Record<string, { full_name: string | null; phone: string | null; whatsapp_number: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, whatsapp_number')
        .in('id', userIds);

      if (profilesData) {
        profiles = profilesData.reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, phone: p.phone, whatsapp_number: p.whatsapp_number };
          return acc;
        }, {} as Record<string, { full_name: string | null; phone: string | null; whatsapp_number: string | null }>);
      }
    }

    // Get user emails from auth.users via service role
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const userEmails: Record<string, string> = {};
    authUsers?.users?.forEach(u => {
      userEmails[u.id] = u.email || '';
    });

    // Enrich quotes with user info
    const enrichedQuotes = quotes?.map(quote => ({
      ...quote,
      customer_name: profiles[quote.user_id]?.full_name || 'Utilisateur',
      customer_phone: profiles[quote.user_id]?.phone || profiles[quote.user_id]?.whatsapp_number || '',
      customer_email: userEmails[quote.user_id] || '',
    })) || [];

    // Calculate stats
    const { data: statsData } = await supabase
      .from('quotes')
      .select('status, created_at');

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const stats = {
      total: statsData?.length || 0,
      pending: statsData?.filter(q => q.status === 'pending').length || 0,
      validated: statsData?.filter(q => q.status === 'validated').length || 0,
      accepted: statsData?.filter(q => q.status === 'accepted').length || 0,
      rejected: statsData?.filter(q => q.status === 'rejected').length || 0,
      // Deposit stats ($1000 per accepted quote)
      depositsToday: (statsData?.filter(q =>
        q.status === 'accepted' && new Date(q.created_at) >= startOfDay
      ).length || 0) * 1000,
      depositsThisMonth: (statsData?.filter(q =>
        q.status === 'accepted' && new Date(q.created_at) >= startOfMonth
      ).length || 0) * 1000,
      depositsThisYear: (statsData?.filter(q =>
        q.status === 'accepted' && new Date(q.created_at) >= startOfYear
      ).length || 0) * 1000,
      totalDeposits: (statsData?.filter(q => q.status === 'accepted').length || 0) * 1000,
    };

    return NextResponse.json({
      quotes: enrichedQuotes,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des devis' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID et statut requis' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'validated', 'accepted', 'rejected', 'price_received', 'reassigned'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('quotes')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote:', error);
      throw error;
    }

    return NextResponse.json({ success: true, quote: data });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du devis' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting quote:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du devis' },
      { status: 500 }
    );
  }
}
