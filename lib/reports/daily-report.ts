/**
 * Daily Report Generator
 * Analyzes WhatsApp conversations and generates insights using GPT-4.1
 * Reports cover: customer needs, popular brands, pricing feedback, market insights
 */

import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface DailyReport {
  id: string;
  report_date: string;
  content: string;
  summary: string;
  insights: Record<string, unknown>;
  conversations_analyzed: number;
  added_to_knowledge_base: boolean;
  knowledge_document_id: string | null;
  created_at: string;
}

/**
 * Generate a daily report for the given date
 */
export async function generateDailyReport(date?: string): Promise<DailyReport> {
  const supabase = getAdmin();
  const reportDate = date || new Date().toISOString().split('T')[0];

  // Get conversations active on this date
  const dayStart = `${reportDate}T00:00:00Z`;
  const dayEnd = `${reportDate}T23:59:59Z`;

  const { data: conversations } = await (supabase as any)
    .from('whatsapp_conversations')
    .select('id, phone, user_id, status, context, last_message_at, created_at')
    .gte('last_message_at', dayStart)
    .lte('last_message_at', dayEnd)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (!conversations || conversations.length === 0) {
    // No conversations — create minimal report
    const { data: report, error } = await (supabase as any)
      .from('daily_reports')
      .upsert({
        report_date: reportDate,
        content: `# Rapport du ${reportDate}\n\nAucune conversation WhatsApp enregistrée ce jour.`,
        summary: 'Aucune conversation ce jour.',
        insights: {},
        conversations_analyzed: 0,
      }, { onConflict: 'report_date' })
      .select()
      .single();

    if (error) throw error;
    return report;
  }

  // Collect messages for each conversation
  const conversationTranscripts: string[] = [];

  for (const conv of conversations.slice(0, 30)) {
    const ctx = conv.context as { recent_messages?: string[] } | null;
    if (ctx?.recent_messages && ctx.recent_messages.length > 0) {
      conversationTranscripts.push(
        `--- Conversation (${conv.phone}, ${conv.status}) ---\n${ctx.recent_messages.join('\n')}`
      );
    }

    // Also try chat_messages if user_id exists
    if (conv.user_id) {
      const { data: chatConv } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', conv.user_id)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (chatConv) {
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('sender_type, content, created_at')
          .eq('conversation_id', chatConv.id)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd)
          .order('created_at', { ascending: true })
          .limit(50);

        if (msgs && msgs.length > 0) {
          const transcript = msgs.map((m: any) =>
            `${m.sender_type === 'user' ? 'Client' : m.sender_type === 'bot' ? 'Jason (Bot)' : 'Agent'}: ${m.content}`
          ).join('\n');
          conversationTranscripts.push(
            `--- Conversation détaillée (${conv.phone}, ${conv.status}) ---\n${transcript}`
          );
        }
      }
    }
  }

  // Call GPT-4.1 for analysis
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const systemPrompt = `Tu es un analyste business pour "Driveby Africa", plateforme leader d'importation de véhicules vers l'Afrique. Tu analyses les conversations WhatsApp du chatbot pour produire un rapport stratégique quotidien.

Produis un rapport structuré en markdown avec les sections suivantes :

## Résumé exécutif
2-3 lignes résumant la journée.

## Besoins et attentes clients
- Quels types de véhicules sont demandés (SUV, berlines, pickups, etc.)
- Budget moyen mentionné par les clients
- Pays de livraison demandés
- Usage prévu (famille, travail, brousse, etc.)

## Marques à mettre en avant
- Marques les plus demandées
- Marques dont les clients sont satisfaits
- Marques manquantes dans le catalogue que les clients recherchent

## Analyse des prix
- Fourchettes de prix demandées (en FCFA)
- Véhicules jugés trop chers par les clients
- Opportunités de pricing compétitif

## Qualité du chatbot
- Questions auxquelles le chatbot n'a pas bien répondu
- Escalations vers un agent humain et motifs
- Suggestions d'amélioration du chatbot

## Recommandations stratégiques
- Actions concrètes pour améliorer les ventes
- Véhicules à ajouter au catalogue
- Ajustements de pricing suggérés
- Améliorations du service client

Sois factuel, précis, et actionnable. Ce rapport sera lu par la direction de Driveby Africa.`;

  const userPrompt = `Voici les ${conversations.length} conversations WhatsApp du ${reportDate} :\n\n${conversationTranscripts.join('\n\n')}\n\nGénère le rapport d'analyse quotidien.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${(err as any).error?.message || response.statusText}`);
  }

  const data = await response.json();
  const reportContent = data.choices[0]?.message?.content || 'Erreur de génération du rapport.';

  // Extract summary (first paragraph after "Résumé exécutif")
  const summaryMatch = reportContent.match(/## Résumé exécutif\s*\n+([\s\S]*?)(?=\n##|\n$)/);
  const summary = summaryMatch ? summaryMatch[1].trim().substring(0, 500) : reportContent.substring(0, 200);

  // Store report
  const { data: report, error } = await (supabase as any)
    .from('daily_reports')
    .upsert({
      report_date: reportDate,
      content: reportContent,
      summary,
      insights: {
        conversations_count: conversations.length,
        escalated_count: conversations.filter((c: any) => c.status === 'escalated').length,
        generated_at: new Date().toISOString(),
      },
      conversations_analyzed: conversations.length,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'report_date' })
    .select()
    .single();

  if (error) throw error;
  return report;
}

/**
 * Add a report to the knowledge base
 */
export async function addReportToKnowledgeBase(reportId: string): Promise<void> {
  const supabase = getAdmin();

  const { data: report } = await (supabase as any)
    .from('daily_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (!report) throw new Error('Rapport introuvable');

  // Import addDocument from knowledge-base
  const { addDocument } = await import('@/lib/rag/knowledge-base');

  const doc = await addDocument(
    `Rapport quotidien - ${report.report_date}`,
    report.content,
    'general',
    {
      language: 'fr',
      source: 'daily_report' as any,
      metadata: {
        report_date: report.report_date,
        conversations_analyzed: report.conversations_analyzed,
      },
    }
  );

  // Update report with KB link
  await (supabase as any)
    .from('daily_reports')
    .update({
      added_to_knowledge_base: true,
      knowledge_document_id: doc.id,
    })
    .eq('id', reportId);
}
