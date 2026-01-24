import type { Config, Context } from '@netlify/functions';

/**
 * Scheduled function to record daily vehicle count snapshot
 * Runs daily at 12:00 UTC (noon GMT)
 *
 * This function captures the total vehicle count on the platform
 * and stores it in vehicle_count_history for accurate historical tracking.
 */
export default async function handler(req: Request, context: Context) {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || '';

  console.log(`[Vehicle Count Snapshot] Starting at ${new Date().toISOString()}`);

  try {
    const response = await fetch(`${siteUrl}/api/cron/vehicle-count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Vehicle Count Snapshot] Error:', result);
      return new Response(JSON.stringify({ error: result }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Vehicle Count Snapshot] Success:', result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Vehicle Count Snapshot] Failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to record vehicle count', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const config: Config = {
  // Run daily at 12:00 UTC (noon GMT)
  schedule: '0 12 * * *',
};
