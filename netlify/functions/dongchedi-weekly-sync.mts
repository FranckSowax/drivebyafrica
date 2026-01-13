import type { Config, Context } from '@netlify/functions';

/**
 * Scheduled function for weekly full sync of Dongchedi vehicles
 * Runs every Sunday at 04:00 UTC
 *
 * This function performs a complete sync of all vehicle listings
 * to ensure our database is fully in sync with Dongchedi.
 */
export default async function handler(req: Request, context: Context) {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:3000';

  console.log(`[Dongchedi Weekly Sync] Starting at ${new Date().toISOString()}`);

  try {
    const response = await fetch(`${siteUrl}/api/dongchedi/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use a service key for scheduled functions
        'x-scheduled-function': 'true',
      },
      body: JSON.stringify({
        mode: 'full',    // Full sync of all pages
        maxPages: 50,    // Limit to 50 pages per run
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Dongchedi Weekly Sync] Error:', result);
      return new Response(JSON.stringify({ error: result }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Dongchedi Weekly Sync] Success:', result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Dongchedi Weekly Sync] Failed:', error);
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
  // Run every Sunday at 04:00 UTC
  schedule: '0 4 * * 0',
};
