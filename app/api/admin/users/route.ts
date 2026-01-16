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

// GET: Fetch all users with their stats
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Get all profiles
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,whatsapp_number.ilike.%${search}%,country.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: profiles, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get user IDs
    const userIds = profiles?.map(p => p.id) || [];

    // Get quotes count per user
    const quotesCountMap: Record<string, number> = {};
    const acceptedQuotesMap: Record<string, number> = {};

    if (userIds.length > 0) {
      // Get all quotes for these users
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('user_id, status')
        .in('user_id', userIds);

      if (quotesData) {
        quotesData.forEach(q => {
          quotesCountMap[q.user_id] = (quotesCountMap[q.user_id] || 0) + 1;
          if (q.status === 'accepted') {
            acceptedQuotesMap[q.user_id] = (acceptedQuotesMap[q.user_id] || 0) + 1;
          }
        });
      }
    }

    // Get favorites count per user
    const favoritesCountMap: Record<string, number> = {};

    if (userIds.length > 0) {
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select('user_id')
        .in('user_id', userIds);

      if (favoritesData) {
        favoritesData.forEach(f => {
          favoritesCountMap[f.user_id] = (favoritesCountMap[f.user_id] || 0) + 1;
        });
      }
    }

    // Enrich users with stats
    const enrichedUsers = profiles?.map(p => ({
      id: p.id,
      full_name: p.full_name || 'Utilisateur',
      phone: p.phone,
      whatsapp_number: p.whatsapp_number,
      country: p.country || 'Non spécifié',
      city: p.city,
      preferred_currency: p.preferred_currency || 'XAF',
      avatar_url: p.avatar_url,
      verification_status: p.verification_status || 'pending',
      created_at: p.created_at,
      updated_at: p.updated_at,
      // Stats
      quotes_count: quotesCountMap[p.id] || 0,
      orders_count: acceptedQuotesMap[p.id] || 0,
      favorites_count: favoritesCountMap[p.id] || 0,
      total_spent_usd: (acceptedQuotesMap[p.id] || 0) * 1000, // Each accepted quote = $1000 deposit
    })) || [];

    // Calculate stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const stats = {
      total: count || 0,
      newThisMonth: profiles?.filter(p => new Date(p.created_at) >= startOfMonth).length || 0,
      newThisYear: profiles?.filter(p => new Date(p.created_at) >= startOfYear).length || 0,
      withOrders: enrichedUsers.filter(u => u.orders_count > 0).length,
      totalQuotes: Object.values(quotesCountMap).reduce((a, b) => a + b, 0),
      totalOrders: Object.values(acceptedQuotesMap).reduce((a, b) => a + b, 0),
      totalDeposits: Object.values(acceptedQuotesMap).reduce((a, b) => a + b, 0) * 1000,
    };

    // Country distribution
    const countryDistribution: Record<string, number> = {};
    profiles?.forEach(p => {
      const country = p.country || 'Non spécifié';
      countryDistribution[country] = (countryDistribution[country] || 0) + 1;
    });

    return NextResponse.json({
      users: enrichedUsers,
      stats,
      countryDistribution,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}
