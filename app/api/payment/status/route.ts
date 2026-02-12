import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkPaymentStatus } from '@/lib/payment';

/**
 * GET /api/payment/status?ref=DBA_xxx
 * Checks the payment status via PHP backend.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const ref = request.nextUrl.searchParams.get('ref');
    if (!ref) {
      return NextResponse.json({ error: 'Paramètre ref requis' }, { status: 400 });
    }

    const result = await checkPaymentStatus(ref);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Payment Status] Error:', error);
    return NextResponse.json({ completed: false, status: 'pending' });
  }
}
