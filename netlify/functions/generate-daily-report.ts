import { createClient } from '@supabase/supabase-js';

/**
 * Netlify Scheduled Function: Generate daily report at 6:00 AM UTC
 * Analyzes WhatsApp conversations and adds insights to knowledge base
 */
export const config = {
  schedule: '0 6 * * *', // 6:00 AM UTC daily
};

export default async function handler() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.log('[DailyReport] Missing config');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const dayStart = `${yesterday}T00:00:00Z`;
  const dayEnd = `${yesterday}T23:59:59Z`;

  console.log(`[DailyReport] Generating report for ${yesterday}`);

  // Check if report already exists
  const { data: existing } = await supabase
    .from('daily_reports' as any)
    .select('id')
    .eq('report_date', yesterday)
    .maybeSingle();

  if (existing) {
    console.log(`[DailyReport] Report already exists for ${yesterday}`);
    return;
  }

  // Fetch conversations
  const { data: conversations } = await supabase
    .from('whatsapp_conversations' as any)
    .select('id, phone, user_id, status, context, last_message_at')
    .gte('last_message_at', dayStart)
    .lte('last_message_at', dayEnd)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (!conversations || conversations.length === 0) {
    console.log(`[DailyReport] No conversations for ${yesterday}`);
    await supabase.from('daily_reports' as any).insert({
      report_date: yesterday,
      content: `# Rapport du ${yesterday}\n\nAucune conversation WhatsApp enregistrée ce jour.`,
      summary: 'Aucune conversation ce jour.',
      insights: {},
      conversations_analyzed: 0,
    });
    return;
  }

  // Collect transcripts
  const transcripts: string[] = [];
  for (const conv of (conversations as any[]).slice(0, 30)) {
    const ctx = conv.context as { recent_messages?: string[] } | null;
    if (ctx?.recent_messages && ctx.recent_messages.length > 0) {
      transcripts.push(
        `--- Conversation (${conv.phone}, ${conv.status}) ---\n${ctx.recent_messages.join('\n')}`
      );
    }
  }

  if (transcripts.length === 0) {
    console.log(`[DailyReport] No message content found for ${yesterday}`);
    return;
  }

  // GPT-4.1 analysis
  const systemPrompt = `Tu es un analyste business pour "Driveby Africa", plateforme leader d'importation de véhicules vers l'Afrique. Analyse les conversations WhatsApp pour un rapport stratégique quotidien.

Produis un rapport markdown structuré :
## Résumé exécutif
## Besoins et attentes clients
## Marques à mettre en avant
## Analyse des prix
## Qualité du chatbot
## Recommandations stratégiques

Sois factuel, précis, et actionnable.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${conversations.length} conversations du ${yesterday}:\n\n${transcripts.join('\n\n')}\n\nGénère le rapport.` },
      ],
      max_tokens: 2000,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    console.error(`[DailyReport] OpenAI error: ${response.statusText}`);
    return;
  }

  const data = await response.json();
  const reportContent = data.choices[0]?.message?.content || 'Erreur de génération.';

  const summaryMatch = reportContent.match(/## Résumé exécutif\s*\n+([\s\S]*?)(?=\n##|\n$)/);
  const summary = summaryMatch ? summaryMatch[1].trim().substring(0, 500) : reportContent.substring(0, 200);

  // Store report
  const { data: report, error } = await supabase
    .from('daily_reports' as any)
    .insert({
      report_date: yesterday,
      content: reportContent,
      summary,
      insights: {
        conversations_count: conversations.length,
        escalated_count: (conversations as any[]).filter(c => c.status === 'escalated').length,
        generated_at: new Date().toISOString(),
      },
      conversations_analyzed: conversations.length,
    })
    .select()
    .single();

  if (error) {
    console.error(`[DailyReport] DB error:`, error);
    return;
  }

  // Auto-add to knowledge base
  try {
    await supabase.from('knowledge_documents' as any).insert({
      title: `Rapport quotidien - ${yesterday}`,
      content: reportContent,
      category: 'general',
      language: 'fr',
      source: 'daily_report',
      is_active: true,
      metadata: {
        report_date: yesterday,
        conversations_analyzed: conversations.length,
        auto_generated: true,
      },
    });

    await supabase
      .from('daily_reports' as any)
      .update({ added_to_knowledge_base: true })
      .eq('id', (report as any).id);

    console.log(`[DailyReport] Report for ${yesterday} generated and added to KB`);
  } catch (err) {
    console.error('[DailyReport] KB add error:', err);
  }
}
