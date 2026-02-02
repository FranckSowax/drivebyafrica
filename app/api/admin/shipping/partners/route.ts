import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';

export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) return adminCheck.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminCheck.supabase as any;

    // Fetch all partners with their latest quote date
    const { data: partners, error } = await supabase
      .from('shipping_partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ partners: [] });
      }
      throw error;
    }

    // Fetch latest quote date for each partner
    const partnerIds = (partners || []).map((p: { id: string }) => p.id);
    let latestQuotes: Record<string, string> = {};

    if (partnerIds.length > 0) {
      const { data: quotes } = await supabase
        .from('shipping_partner_quotes')
        .select('partner_id, submitted_at')
        .in('partner_id', partnerIds)
        .order('submitted_at', { ascending: false });

      if (quotes) {
        for (const q of quotes) {
          if (!latestQuotes[q.partner_id]) {
            latestQuotes[q.partner_id] = q.submitted_at;
          }
        }
      }
    }

    const enriched = (partners || []).map((p: { id: string }) => ({
      ...p,
      last_quote_at: latestQuotes[p.id] || null,
    }));

    return NextResponse.json({ partners: enriched });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) return adminCheck.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminCheck.supabase as any;
    const body = await request.json();

    const { company_name, contact_person, email, phone, country, notes } = body;

    if (!company_name || !contact_person || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shipping_partners')
      .insert({
        company_name,
        contact_person,
        email,
        phone,
        country: country || '',
        notes: notes || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ partner: data });
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) return adminCheck.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminCheck.supabase as any;
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Partner ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shipping_partners')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ partner: data });
  } catch (error) {
    console.error('Error updating partner:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.isAdmin) return adminCheck.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = adminCheck.supabase as any;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Partner ID required' }, { status: 400 });
    }

    // Soft delete
    const { error } = await supabase
      .from('shipping_partners')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
