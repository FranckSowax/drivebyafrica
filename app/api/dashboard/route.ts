import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Fetch all dashboard data in parallel
    const [profileResult, ordersResult, favoritesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id),
    ]);

    // Fetch quotes separately (table may not exist)
    let quotesData: any[] = [];
    try {
      const { data: quotes } = await (supabase as any)
        .from('quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      quotesData = quotes || [];
    } catch {
      // quotes table may not exist
    }

    return NextResponse.json({
      profile: profileResult.data,
      orders: ordersResult.data || [],
      favorites: favoritesResult.data || [],
      quotes: quotesData,
    });
  } catch (error) {
    console.error('Dashboard API server error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
