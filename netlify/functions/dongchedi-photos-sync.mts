import type { Config, Context } from '@netlify/functions';

/**
 * Scheduled function to sync Dongchedi photos
 * Runs daily at 06:30 UTC (after export files are available at 06:00 UTC)
 *
 * This function downloads photos from Dongchedi and caches them to Supabase storage
 * because Dongchedi photo links expire after 6 days.
 */
export default async function handler(req: Request, context: Context) {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:3000';

  console.log(`[Dongchedi Photos Sync] Starting at ${new Date().toISOString()}`);

  try {
    const response = await fetch(`${siteUrl}/api/dongchedi/photos/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use a service key for scheduled functions
        'x-scheduled-function': 'true',
      },
      body: JSON.stringify({
        limit: 200, // Process up to 200 photos per run
        dryRun: false,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Dongchedi Photos Sync] Error:', result);
      return new Response(JSON.stringify({ error: result }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Dongchedi Photos Sync] Success:', result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Dongchedi Photos Sync] Failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync photos', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const config: Config = {
  // Run daily at 06:30 UTC (after Dongchedi export files are available at 06:00 UTC)
  schedule: '30 6 * * *',
};
