import type { Config, Context } from '@netlify/functions';

/**
 * Scheduled function to sync Dongchedi vehicle listings
 * Runs daily at 07:00 UTC (after photo sync completes)
 *
 * This function fetches new/changed/removed vehicles from Dongchedi
 * and updates our database accordingly.
 */
export default async function handler(req: Request, context: Context) {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:3000';

  console.log(`[Dongchedi Sync] Starting at ${new Date().toISOString()}`);

  try {
    const response = await fetch(`${siteUrl}/api/dongchedi/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use a service key for scheduled functions
        'x-scheduled-function': 'true',
      },
      body: JSON.stringify({
        mode: 'changes', // Only sync changes since last run
        sinceDays: 1,    // Get changes from the last 24 hours
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Dongchedi Sync] Error:', result);
      return new Response(JSON.stringify({ error: result }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Dongchedi Sync] Success:', result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Dongchedi Sync] Failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync vehicles', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const config: Config = {
  // Run daily at 07:00 UTC (after photo sync at 06:30)
  schedule: '0 7 * * *',
};
