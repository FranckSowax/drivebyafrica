import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/admin-check';

// Quote status flow:
// - pending: Default state when user creates a quote
// - validated: Quote has been validated by admin, awaiting payment
// - accepted: Deposit of $1000 has been received

export async function GET(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = supabaseAdmin;
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
    type ProfileData = { full_name: string | null; phone: string | null; whatsapp_number: string | null; email?: string | null };
    let profiles: Record<string, ProfileData> = {};
    let userEmails: Record<string, string> = {};

    if (userIds.length > 0) {
      // Try to get profiles with email column (after migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, whatsapp_number, email')
        .in('id', userIds) as { data: Array<{ id: string; full_name: string | null; phone: string | null; whatsapp_number: string | null; email?: string | null }> | null };

      if (profilesData) {
        profiles = profilesData.reduce((acc, p) => {
          acc[p.id] = {
            full_name: p.full_name,
            phone: p.phone,
            whatsapp_number: p.whatsapp_number,
            email: p.email || null
          };
          return acc;
        }, {} as Record<string, ProfileData>);

        // Check if any profile has email - if not, we need to fall back to auth lookup
        const hasEmails = profilesData.some(p => p.email);
        if (!hasEmails) {
          // Fallback: fetch only needed users by their IDs (much better than listUsers)
          for (const userId of userIds) {
            try {
              const { data: authUser } = await supabase.auth.admin.getUserById(userId);
              if (authUser?.user?.email) {
                userEmails[userId] = authUser.user.email;
              }
            } catch {
              // Skip if user not found
            }
          }
        }
      }
    }

    // Enrich quotes with user info
    const enrichedQuotes = quotes?.map(quote => ({
      ...quote,
      customer_name: profiles[quote.user_id]?.full_name || 'Utilisateur',
      customer_phone: profiles[quote.user_id]?.phone || profiles[quote.user_id]?.whatsapp_number || '',
      customer_email: profiles[quote.user_id]?.email || userEmails[quote.user_id] || '',
    })) || [];

    // Calculate stats using database function (O(1) instead of O(n) client-side filtering)
    let stats = {
      total: 0,
      pending: 0,
      validated: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      depositsToday: 0,
      depositsThisMonth: 0,
      depositsThisYear: 0,
      totalDeposits: 0,
    };

    try {
      // Call database function for efficient stats (typed as any since function may not exist in types yet)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: statsData, error: rpcError } = await (supabase.rpc as any)('get_quote_stats');
      if (!rpcError && statsData) {
        stats = statsData;
      } else {
        throw new Error('RPC not available');
      }
    } catch {
      // Fallback if database function doesn't exist yet (pre-migration)
      const { count: totalCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true });
      stats.total = totalCount || 0;
    }

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
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = supabaseAdmin;
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
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const supabase = supabaseAdmin;
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
