import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Scheduled Function for processing WhatsApp marketing campaigns
 * Schedule: Run every 5 minutes
 *
 * Processes campaigns in 'sending' or 'scheduled' status:
 * - Scheduled campaigns that are past their scheduled_at time are started
 * - Sending campaigns get their next batch of recipients processed
 */
export const config = {
  schedule: '*/5 * * * *', // Every 5 minutes
};

const MAX_BATCH_SIZE = 50;
const META_API_VERSION = 'v21.0';

function formatPhoneForMeta(phone: string): string {
  return phone.replace(/[\s\-\(\)\+@s\.whatsapp\.net]/g, '');
}

async function sendTemplateMessage(
  phone: string,
  templateName: string,
  components: Array<{ type: string; parameters?: unknown[] }>,
  language: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return { success: false, error: 'Meta WhatsApp not configured' };
  }

  const formattedPhone = formatPhoneForMeta(phone);

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default async function handler() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('[CampaignProcessor] Missing Supabase config');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Check for scheduled campaigns that should start
  const now = new Date().toISOString();
  const { data: scheduledCampaigns } = await supabase
    .from('whatsapp_campaigns')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now);

  if (scheduledCampaigns && scheduledCampaigns.length > 0) {
    for (const camp of scheduledCampaigns) {
      await supabase
        .from('whatsapp_campaigns')
        .update({
          status: 'sending',
          started_at: now,
        })
        .eq('id', camp.id);
      console.log(`[CampaignProcessor] Started scheduled campaign: ${camp.id}`);
    }
  }

  // 2. Process sending campaigns
  const { data: sendingCampaigns } = await supabase
    .from('whatsapp_campaigns')
    .select('*')
    .eq('status', 'sending');

  if (!sendingCampaigns || sendingCampaigns.length === 0) {
    console.log('[CampaignProcessor] No active campaigns');
    return;
  }

  for (const campaign of sendingCampaigns) {
    console.log(`[CampaignProcessor] Processing campaign: ${campaign.name} (${campaign.id})`);

    // Fetch pending recipients
    const { data: recipients } = await supabase
      .from('whatsapp_campaign_recipients')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('status', 'pending')
      .limit(MAX_BATCH_SIZE);

    if (!recipients || recipients.length === 0) {
      // No more pending — mark as sent
      await supabase
        .from('whatsapp_campaigns')
        .update({
          status: 'sent',
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);
      console.log(`[CampaignProcessor] Campaign completed: ${campaign.id}`);
      continue;
    }

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await sendTemplateMessage(
        recipient.phone,
        campaign.template_name,
        campaign.template_components || [],
        campaign.template_language || 'fr'
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

      // Rate limit: 50ms between sends
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Update campaign stats
    const { data: allRecipients } = await supabase
      .from('whatsapp_campaign_recipients')
      .select('status')
      .eq('campaign_id', campaign.id);

    if (allRecipients) {
      const statCounts = {
        total: allRecipients.length,
        sent: allRecipients.filter(r => ['sent', 'delivered', 'read'].includes(r.status)).length,
        delivered: allRecipients.filter(r => ['delivered', 'read'].includes(r.status)).length,
        read: allRecipients.filter(r => r.status === 'read').length,
        failed: allRecipients.filter(r => r.status === 'failed').length,
      };

      await supabase
        .from('whatsapp_campaigns')
        .update({ stats: statCounts })
        .eq('id', campaign.id);
    }

    console.log(`[CampaignProcessor] Batch done for ${campaign.id}: sent=${sent}, failed=${failed}`);
  }
}
