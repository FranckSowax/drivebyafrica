import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/admin/campaigns
 * List campaigns with optional status filter
 */
export async function GET(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const supabase = getAdmin();
    let query = supabase
      .from('whatsapp_campaigns')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      campaigns: data || [],
      total: count || 0,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error('Campaign list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/admin/campaigns
 * Create a new campaign
 */
export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await request.json();
    const { name, description, template_name, template_language, template_components, target_segment, scheduled_at } = body;

    if (!name || !template_name) {
      return NextResponse.json({ error: 'Nom et template requis' }, { status: 400 });
    }

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .insert({
        name,
        description: description || null,
        template_name,
        template_language: template_language || 'fr',
        template_components: template_components || [],
        target_segment: target_segment || {},
        status: scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: scheduled_at || null,
        created_by: adminCheck.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, campaign: data });
  } catch (error) {
    console.error('Campaign create error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/admin/campaigns
 * Update an existing campaign
 */
export async function PUT(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Only allow updates on draft/scheduled campaigns
    const supabase = getAdmin();
    const { data: existing } = await supabase
      .from('whatsapp_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Campagne non trouvée' }, { status: 404 });
    }

    if (!['draft', 'scheduled'].includes(existing.status)) {
      return NextResponse.json({ error: 'Seules les campagnes en brouillon ou programmées peuvent être modifiées' }, { status: 400 });
    }

    const allowedFields = ['name', 'description', 'template_name', 'template_language', 'template_components', 'target_segment', 'scheduled_at', 'status'];
    const filtered: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) filtered[key] = updates[key];
    }

    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, campaign: data });
  } catch (error) {
    console.error('Campaign update error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/campaigns
 * Delete a campaign (only draft/scheduled)
 */
export async function DELETE(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const supabase = getAdmin();
    const { data: existing } = await supabase
      .from('whatsapp_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    if (existing && !['draft', 'scheduled'].includes(existing.status)) {
      return NextResponse.json({ error: 'Impossible de supprimer une campagne en cours ou terminée' }, { status: 400 });
    }

    const { error } = await supabase
      .from('whatsapp_campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Campaign delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
