/**
 * Netlify Scheduled Function: Sync vehicle knowledge base
 * Runs daily at 7:00 AM UTC (after vehicle sync scripts finish)
 *
 * Generates 2 RAG documents from the vehicles table:
 *   1. Catalogue with brand stats, prices, inventory summary
 *   2. User language patterns for better chatbot understanding
 */

export const config = {
  schedule: '0 7 * * *', // 7:00 AM UTC daily (after vehicle syncs)
};

export default async function handler() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.log('[SyncVehicleKB] Missing env vars — skipping');
    return;
  }

  try {
    // Dynamic import to avoid bundling issues with Netlify Functions
    const { syncVehicleKnowledge } = await import('../../lib/rag/vehicle-knowledge-sync');
    const result = await syncVehicleKnowledge();
    console.log(`[SyncVehicleKB] Success:`, result);
  } catch (err) {
    console.error('[SyncVehicleKB] Error:', err);
  }
}
