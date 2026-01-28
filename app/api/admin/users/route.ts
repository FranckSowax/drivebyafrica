import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for full access
function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET: Fetch all users with their stats
export async function GET(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    // Use service role client for full access to all profiles
    const supabase = createAdminClient();
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
      role: p.role || 'user',
      assigned_country: p.assigned_country || null, // Source country for collaborators
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

// PUT: Update user profile (role, assigned country, and profile fields)
export async function PUT(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    // Use service role client for full access
    const supabase = createAdminClient();
    const body = await request.json();
    const { userId, role, assignedCountry, fullName, phone, whatsappNumber, country, city } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Validate and add role if provided
    if (role !== undefined) {
      const validRoles = ['user', 'admin', 'super_admin', 'collaborator'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Rôle invalide' },
          { status: 400 }
        );
      }
      updateData.role = role;

      // Clear assigned_country if role is not collaborator
      if (role !== 'collaborator') {
        updateData.assigned_country = null;
      }
    }

    // Validate and add assigned_country if provided
    if (assignedCountry !== undefined) {
      const validCountries = ['all', 'china', 'korea', 'dubai', null];
      if (!validCountries.includes(assignedCountry)) {
        return NextResponse.json(
          { error: 'Pays assigné invalide. Valeurs autorisées: all, china, korea, dubai' },
          { status: 400 }
        );
      }
      updateData.assigned_country = assignedCountry;
    }

    // Add profile fields if provided
    if (fullName !== undefined) {
      updateData.full_name = fullName;
    }
    if (phone !== undefined) {
      updateData.phone = phone || null;
    }
    if (whatsappNumber !== undefined) {
      updateData.whatsapp_number = whatsappNumber || null;
    }
    if (country !== undefined) {
      updateData.country = country || null;
    }
    if (city !== undefined) {
      updateData.city = city || null;
    }

    // Update user
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Utilisateur mis à jour avec succès' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a user account
export async function DELETE(request: Request) {
  try {
    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      );
    }

    // Use service role client for admin operations
    const supabaseAdmin = createAdminClient();

    // First check if user exists and get their info
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Prevent deleting super_admin
    if (profile.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un super administrateur' },
        { status: 403 }
      );
    }

    // Delete related data first to speed up the cascade (run in parallel)
    // This prevents Supabase from having to do slow cascade deletes
    await Promise.all([
      supabaseAdmin.from('quotes').delete().eq('user_id', userId),
      supabaseAdmin.from('favorites').delete().eq('user_id', userId),
      supabaseAdmin.from('orders').delete().eq('user_id', userId),
    ]);

    // Delete the user from Supabase Auth (profile will cascade delete)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Delete auth error:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// Source country labels for display
const SOURCE_COUNTRY_LABELS: Record<string, string> = {
  all: '🌍 Tous les pays',
  china: '🇨🇳 Chine',
  korea: '🇰🇷 Corée du Sud',
  dubai: '🇦🇪 Dubaï',
};

// POST: Create a new collaborator account
export async function POST(request: Request) {
  try {
    // Check service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Configuration serveur manquante (service role)' },
        { status: 500 }
      );
    }

    // Vérification admin obligatoire
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) {
      return adminCheck.response;
    }

    const body = await request.json();
    const { email, password, fullName, phone, assignedCountry } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, mot de passe et nom complet sont requis' },
        { status: 400 }
      );
    }

    // Validate assigned country for collaborators
    if (!assignedCountry) {
      return NextResponse.json(
        { error: 'Le pays source est requis pour un collaborateur' },
        { status: 400 }
      );
    }

    const validCountries = ['all', 'china', 'korea', 'dubai'];
    if (!validCountries.includes(assignedCountry)) {
      return NextResponse.json(
        { error: 'Pays source invalide. Valeurs autorisées: all, china, korea, dubai' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for collaborators
    });

    if (authError) {
      console.error('Auth error:', authError);
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        );
      }
      throw authError;
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Échec de la création du compte' },
        { status: 500 }
      );
    }

    // Create or update profile with collaborator role and assigned country
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName,
        phone: phone || null,
        role: 'collaborator',
        assigned_country: assignedCountry, // Source country for this collaborator
        country: SOURCE_COUNTRY_LABELS[assignedCountry] || assignedCountry, // Display name
        verification_status: 'verified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Try to delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({
      success: true,
      message: `Collaborateur créé avec succès pour ${SOURCE_COUNTRY_LABELS[assignedCountry]}`,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName,
        assignedCountry,
      },
    });
  } catch (error) {
    console.error('Error creating collaborator:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du collaborateur' },
      { status: 500 }
    );
  }
}
