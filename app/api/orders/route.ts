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

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Orders API Supabase error (GET):', error);
      // Table doesn't exist yet - return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ orders: [] });
      }
      // Permission denied - RLS policy issue, return empty array
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        return NextResponse.json({ orders: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Orders API server error (GET):', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
