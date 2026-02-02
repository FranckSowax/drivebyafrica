import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Public Supabase client (no auth needed for partner form)
function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Calculate 15-day cycle start date from a fixed epoch
function getCycleStart(): string {
  const epoch = new Date('2026-01-01T00:00:00Z');
  const now = new Date();
  const daysSinceEpoch = Math.floor((now.getTime() - epoch.getTime()) / 86400000);
  const cycleNumber = Math.floor(daysSinceEpoch / 15);
  const cycleStart = new Date(epoch.getTime() + cycleNumber * 15 * 86400000);
  return cycleStart.toISOString().split('T')[0];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabase = createPublicClient();

    // 1. Find partner by token
    const { data: partner, error: partnerError } = await supabase
      .from('shipping_partners')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // 2. Get all destinations from shipping_routes
    const { data: routes } = await supabase
      .from('shipping_routes')
      .select('destination_id, destination_name, destination_country, destination_flag')
      .order('destination_name');

    // 3. Check 15-day cycle
    const cycleStart = getCycleStart();
    const { data: recentQuotes } = await supabase
      .from('shipping_partner_quotes')
      .select('id, submitted_at')
      .eq('partner_id', partner.id)
      .gte('cycle_start', cycleStart)
      .order('submitted_at', { ascending: false })
      .limit(1);

    const canSubmit = !recentQuotes || recentQuotes.length === 0;
    const lastSubmission = recentQuotes?.[0]?.submitted_at || null;

    return NextResponse.json({
      partner: {
        company_name: partner.company_name,
        contact_person: partner.contact_person,
        email: partner.email,
        phone: partner.phone,
        country: partner.country,
      },
      destinations: routes || [],
      canSubmit,
      lastSubmission,
    });
  } catch (error) {
    console.error('Error in partner shipping GET:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, partner_info, routes, notes } = body;

    if (!token || !routes || !Array.isArray(routes)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const supabase = createPublicClient();

    // 1. Find partner by token
    const { data: partner, error: partnerError } = await supabase
      .from('shipping_partners')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // 2. Check cycle
    const cycleStart = getCycleStart();
    const { data: recentQuotes } = await supabase
      .from('shipping_partner_quotes')
      .select('id')
      .eq('partner_id', partner.id)
      .gte('cycle_start', cycleStart)
      .limit(1);

    if (recentQuotes && recentQuotes.length > 0) {
      return NextResponse.json(
        { error: 'Already submitted for this period' },
        { status: 409 }
      );
    }

    // 3. Update partner contact info if provided
    if (partner_info) {
      await supabase
        .from('shipping_partners')
        .update({
          company_name: partner_info.company_name || partner.company_name,
          contact_person: partner_info.contact_person || partner.contact_person,
          email: partner_info.email || partner.email,
          phone: partner_info.phone || partner.phone,
          country: partner_info.country || partner.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', partner.id);
    }

    // 4. Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('shipping_partner_quotes')
      .insert({
        partner_id: partner.id,
        notes: notes || null,
        cycle_start: cycleStart,
      })
      .select('id')
      .single();

    if (quoteError || !quote) {
      console.error('Error creating quote:', quoteError);
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }

    // 5. Insert route prices
    const routeRows = routes.map((route: {
      destination_id: string;
      destination_name: string;
      destination_country: string;
      destination_flag: string;
      korea_cost_usd: number | null;
      china_cost_usd: number | null;
      dubai_cost_usd: number | null;
      is_active: boolean;
    }) => ({
      quote_id: quote.id,
      destination_id: route.destination_id,
      destination_name: route.destination_name,
      destination_country: route.destination_country,
      destination_flag: route.destination_flag || '',
      korea_cost_usd: route.korea_cost_usd || null,
      china_cost_usd: route.china_cost_usd || null,
      dubai_cost_usd: route.dubai_cost_usd || null,
      is_active: route.is_active ?? true,
    }));

    const { error: routesError } = await supabase
      .from('shipping_partner_quote_routes')
      .insert(routeRows);

    if (routesError) {
      console.error('Error inserting routes:', routesError);
      return NextResponse.json({ error: 'Failed to save routes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, quoteId: quote.id });
  } catch (error) {
    console.error('Error in partner shipping POST:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
