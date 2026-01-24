import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Track when a user contacts a transitaire
export async function POST(request: Request) {
  try {
    const supabaseClient = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = supabaseClient as any;
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { order_id, transitaire_id, contact_method } = body;

    if (!order_id || !transitaire_id) {
      return NextResponse.json(
        { error: 'order_id et transitaire_id requis' },
        { status: 400 }
      );
    }

    // Verify the order belongs to the user
    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', order_id)
      .single();

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Upsert the suggestion tracking record
    const { error } = await supabase
      .from('order_transitaire_suggestions')
      .upsert(
        {
          order_id,
          transitaire_id,
          was_selected: true,
        },
        {
          onConflict: 'order_id,transitaire_id',
        }
      );

    if (error) {
      console.error('Error tracking transitaire selection:', error);
      // Don't fail the request - this is just tracking
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST track:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
