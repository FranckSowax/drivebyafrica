import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPayment } from '@/lib/payment';

/**
 * POST /api/payment/init
 * Initializes a payment via E-Billing (PHP backend + E-Billing API).
 * Returns the portal URL for the user to complete payment in an iframe.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, description, phoneNumber } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    const result = await createPayment(
      user.id,
      amount,
      description || 'Acompte Driveby Africa',
      user.email || undefined,
      phoneNumber,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Payment Init] Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
