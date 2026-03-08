import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { createClient } from '@supabase/supabase-js';
import { sendTemplateMessage, formatPhoneForMeta, isConfigured, type TemplateComponent } from '@/lib/whatsapp/meta-client';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/admin/campaigns/send
 * Actions: populate (build recipient list), send (start sending), pause, resume
 */
export async function POST(request: Request) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await request.json();
    const { campaign_id, action } = body;

    if (!campaign_id || !action) {
      return NextResponse.json({ error: 'campaign_id et action requis' }, { status: 400 });
    }

    const supabase = getAdmin();

    if (action === 'populate') {
      return await populateRecipients(supabase, campaign_id);
    }

    if (action === 'send') {
      return await startSending(supabase, campaign_id);
    }

    if (action === 'pause') {
      await supabase
        .from('whatsapp_campaigns')
        .update({ status: 'paused' })
        .eq('id', campaign_id)
        .in('status', ['sending', 'scheduled']);
      return NextResponse.json({ success: true });
    }

    if (action === 'cancel') {
      await supabase
        .from('whatsapp_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaign_id)
        .in('status', ['draft', 'scheduled', 'paused']);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Campaign send error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Build the recipient list from target_segment criteria
 */
async function populateRecipients(supabase: ReturnType<typeof getAdmin>, campaignId: string) {
  const { data: campaign, error: campError } = await supabase
    .from('whatsapp_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: 'Campagne non trouvée' }, { status: 404 });
  }

  if (!['draft', 'scheduled'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Peut uniquement peupler les campagnes en brouillon' }, { status: 400 });
  }

  const segment = campaign.target_segment as {
    countries?: string[];
    has_orders?: boolean;
    has_quotes?: boolean;
    has_whatsapp?: boolean;
    min_last_activity_days?: number;
  };

  // Build query for eligible users
  let query = supabase
    .from('profiles')
    .select('id, full_name, phone, whatsapp_number, country');

  // Filter by country
  if (segment.countries && segment.countries.length > 0) {
    query = query.in('country', segment.countries);
  }

  // Must have a phone/whatsapp number
  if (segment.has_whatsapp) {
    query = query.not('whatsapp_number', 'is', null);
  }

  const { data: profiles, error: profError } = await query;
  if (profError) throw profError;

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ success: true, recipients_count: 0, message: 'Aucun contact correspondant' });
  }

  // Filter further by order/quote status if needed
  let eligibleIds = profiles.map(p => p.id);

  if (segment.has_orders) {
    const { data: orderUsers } = await supabase
      .from('orders')
      .select('user_id')
      .in('user_id', eligibleIds);
    const orderUserIds = new Set(orderUsers?.map(o => o.user_id) || []);
    eligibleIds = eligibleIds.filter(id => orderUserIds.has(id));
  }

  if (segment.has_quotes) {
    const { data: quoteUsers } = await supabase
      .from('quotes')
      .select('user_id')
      .in('user_id', eligibleIds);
    const quoteUserIds = new Set(quoteUsers?.map(q => q.user_id) || []);
    eligibleIds = eligibleIds.filter(id => quoteUserIds.has(id));
  }

  const eligibleProfiles = profiles.filter(p => eligibleIds.includes(p.id));

  // Delete existing recipients and rebuild
  await supabase
    .from('whatsapp_campaign_recipients')
    .delete()
    .eq('campaign_id', campaignId);

  // Build recipient rows
  const recipients = eligibleProfiles
    .map(p => {
      const phone = p.whatsapp_number || p.phone;
      if (!phone) return null;
      return {
        campaign_id: campaignId,
        phone: formatPhoneForMeta(phone),
        user_id: p.id,
        name: p.full_name || null,
        status: 'pending' as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Deduplicate by phone
  const seen = new Set<string>();
  const uniqueRecipients = recipients.filter(r => {
    if (seen.has(r.phone)) return false;
    seen.add(r.phone);
    return true;
  });

  if (uniqueRecipients.length > 0) {
    // Insert in batches of 500
    for (let i = 0; i < uniqueRecipients.length; i += 500) {
      const batch = uniqueRecipients.slice(i, i + 500);
      const { error } = await supabase
        .from('whatsapp_campaign_recipients')
        .insert(batch);
      if (error) throw error;
    }
  }

  // Update campaign stats
  await supabase
    .from('whatsapp_campaigns')
    .update({
      stats: { total: uniqueRecipients.length, sent: 0, delivered: 0, read: 0, failed: 0 },
    })
    .eq('id', campaignId);

  return NextResponse.json({
    success: true,
    recipients_count: uniqueRecipients.length,
  });
}

/**
 * Start sending the campaign (processes a batch immediately, rest handled by scheduled function)
 */
async function startSending(supabase: ReturnType<typeof getAdmin>, campaignId: string) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'WhatsApp Meta API non configurée' }, { status: 500 });
  }

  const { data: campaign, error: campError } = await supabase
    .from('whatsapp_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: 'Campagne non trouvée' }, { status: 404 });
  }

  if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Campagne ne peut pas être lancée dans cet état' }, { status: 400 });
  }

  // Check we have recipients
  const { count } = await supabase
    .from('whatsapp_campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending');

  if (!count || count === 0) {
    return NextResponse.json({ error: 'Aucun destinataire en attente. Peuplez d\'abord la liste.' }, { status: 400 });
  }

  // Mark campaign as sending
  await supabase
    .from('whatsapp_campaigns')
    .update({
      status: 'sending',
      started_at: campaign.started_at || new Date().toISOString(),
    })
    .eq('id', campaignId);

  // Send first batch (50 messages) immediately
  const batchResult = await sendBatch(supabase, campaignId, campaign);

  return NextResponse.json({
    success: true,
    batch_sent: batchResult.sent,
    batch_failed: batchResult.failed,
    remaining: (count || 0) - batchResult.sent - batchResult.failed,
  });
}

/**
 * Send a batch of messages for a campaign
 */
export async function sendBatch(
  supabase: ReturnType<typeof getAdmin>,
  campaignId: string,
  campaign: { template_name: string; template_language: string; template_components: TemplateComponent[] | null }
): Promise<{ sent: number; failed: number }> {
  // Fetch pending recipients
  const { data: recipients, error } = await supabase
    .from('whatsapp_campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .limit(50);

  if (error || !recipients || recipients.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const result = await sendTemplateMessage(
        recipient.phone,
        campaign.template_name,
        campaign.template_language || 'fr',
        (campaign.template_components || []) as TemplateComponent[]
      );

      if (result.success) {
        await supabase
          .from('whatsapp_campaign_recipients')
          .update({
            status: 'sent',
            whatsapp_message_id: result.messageId || null,
            sent_at: new Date().toISOString(),
          })
          .eq('id', recipient.id);
        sent++;
      } else {
        await supabase
          .from('whatsapp_campaign_recipients')
          .update({
            status: 'failed',
            error_message: result.error || 'Unknown error',
          })
          .eq('id', recipient.id);
        failed++;
      }

      // Rate limit: 50ms between messages
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err) {
      await supabase
        .from('whatsapp_campaign_recipients')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Send error',
        })
        .eq('id', recipient.id);
      failed++;
    }
  }

  // Update campaign stats
  const { data: stats } = await supabase
    .from('whatsapp_campaign_recipients')
    .select('status')
    .eq('campaign_id', campaignId);

  if (stats) {
    const statCounts = {
      total: stats.length,
      sent: stats.filter(s => s.status === 'sent' || s.status === 'delivered' || s.status === 'read').length,
      delivered: stats.filter(s => s.status === 'delivered' || s.status === 'read').length,
      read: stats.filter(s => s.status === 'read').length,
      failed: stats.filter(s => s.status === 'failed').length,
    };

    const pending = stats.filter(s => s.status === 'pending').length;

    await supabase
      .from('whatsapp_campaigns')
      .update({
        stats: statCounts,
        ...(pending === 0 ? { status: 'sent', completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', campaignId);
  }

  return { sent, failed };
}
