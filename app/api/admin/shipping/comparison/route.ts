import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';

export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) return adminCheck.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminCheck.supabase as any;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // 1. Fetch current admin rates
    const { data: adminRates } = await supabase
      .from('shipping_routes')
      .select('*')
      .order('destination_name');

    // 2. Fetch partner quotes with routes
    let quotesQuery = supabase
      .from('shipping_partner_quotes')
      .select('id, partner_id, submitted_at, notes, cycle_start')
      .order('submitted_at', { ascending: false });

    if (from) {
      quotesQuery = quotesQuery.gte('submitted_at', from);
    }
    if (to) {
      quotesQuery = quotesQuery.lte('submitted_at', to);
    }

    const { data: quotes } = await quotesQuery;

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({
        adminRates: adminRates || [],
        partnerQuotes: [],
      });
    }

    // 3. Fetch partners for these quotes
    const partnerIds = [...new Set(quotes.map((q: { partner_id: string }) => q.partner_id))];
    const { data: partners } = await supabase
      .from('shipping_partners')
      .select('id, company_name, contact_person, country')
      .in('id', partnerIds);

    const partnersMap = new Map(
      (partners || []).map((p: { id: string; company_name: string; contact_person: string; country: string }) => [p.id, p])
    );

    // 4. Fetch route data for each quote
    const quoteIds = quotes.map((q: { id: string }) => q.id);
    const { data: quoteRoutes } = await supabase
      .from('shipping_partner_quote_routes')
      .select('*')
      .in('quote_id', quoteIds);

    // Group routes by quote_id
    const routesByQuote = new Map<string, typeof quoteRoutes>();
    for (const route of quoteRoutes || []) {
      const existing = routesByQuote.get(route.quote_id) || [];
      existing.push(route);
      routesByQuote.set(route.quote_id, existing);
    }

    // 5. Assemble response — only keep the latest quote per partner
    const latestByPartner = new Map<string, { partner_id: string; id: string; submitted_at: string; notes: string | null }>();
    for (const q of quotes) {
      if (!latestByPartner.has(q.partner_id)) {
        latestByPartner.set(q.partner_id, q);
      }
    }

    const partnerQuotes = Array.from(latestByPartner.values()).map((q) => ({
      partner: partnersMap.get(q.partner_id) || { id: q.partner_id, company_name: 'Unknown', contact_person: '', country: '' },
      quote: {
        id: q.id,
        submitted_at: q.submitted_at,
        notes: q.notes,
      },
      routes: routesByQuote.get(q.id) || [],
    }));

    return NextResponse.json({
      adminRates: adminRates || [],
      partnerQuotes,
    });
  } catch (error) {
    console.error('Error fetching comparison:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
