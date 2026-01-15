import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  DONGCHEDI_CONFIG,
  getTodayDateString,
} from '@/lib/api/dongchedi';

// Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}


/**
 * POST /api/dongchedi/photos/update-urls
 *
 * Update vehicle image URLs from the daily active_offer.csv export.
 * This is faster than downloading images - just updates URLs in database.
 * URLs are valid for 6 days from synced_at date.
 *
 * Body:
 * - date: string (yyyy-mm-dd, default: today)
 * - batchSize: number (default: 500)
 * - maxBatches: number (default: 20)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseAdmin();

    // Check if this is a scheduled function call (from Netlify cron) or authenticated user
    const isScheduledFunction = request.headers.get('x-scheduled-function') === 'true';

    if (!isScheduledFunction) {
      // Check user authentication for manual calls
      const userSupabase = await createServerClient();
      const { data: { user } } = await userSupabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const date = body.date || getTodayDateString();
    const batchSize = body.batchSize || 500;
    const maxBatches = body.maxBatches || 20;

    // Download active_offer.csv
    const csvUrl = `${DONGCHEDI_CONFIG.EXPORT_HOST}/dongchedi/${date}/active_offer.csv`;

    console.log(`Downloading photos CSV from ${csvUrl}...`);

    const csvResponse = await fetch(csvUrl, {
      headers: {
        'Authorization': DONGCHEDI_CONFIG.EXPORT_AUTH_HEADER,
      },
    });

    if (!csvResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download CSV for ${date}. Status: ${csvResponse.status}` },
        { status: 404 }
      );
    }

    const csvContent = await csvResponse.text();
    const lines = csvContent.split('\n');

    // Parse header
    const header = lines[0].split('|');
    const innerIdIndex = header.indexOf('inner_id');
    const imagesIndex = header.indexOf('images');

    if (innerIdIndex === -1 || imagesIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid CSV format - missing inner_id or images column' },
        { status: 400 }
      );
    }

    const stats = {
      totalLines: lines.length - 1,
      processed: 0,
      updated: 0,
      notFound: 0,
      errors: 0,
      batches: 0,
    };

    // Parse all data lines first
    const dataLines = lines.slice(1).filter(line => line.trim());
    const updates: { source_id: string; images: string[] }[] = [];

    for (const line of dataLines) {
      try {
        const columns = line.split('|');
        const sourceId = columns[innerIdIndex]?.trim();
        let imagesJson = columns[imagesIndex]?.trim();

        if (!sourceId || !imagesJson) continue;

        // Parse images JSON array
        imagesJson = imagesJson.replace(/^"|"$/g, '');

        let images: string[];
        try {
          images = JSON.parse(imagesJson);
        } catch {
          images = imagesJson
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map(url => url.trim().replace(/^"|"$/g, ''))
            .filter(Boolean);
        }

        if (!Array.isArray(images) || images.length === 0) continue;

        updates.push({
          source_id: sourceId,
          images: images,
        });
      } catch {
        stats.errors++;
      }
    }

    stats.totalLines = updates.length;
    console.log(`Parsed ${updates.length} valid photo records`);

    // Process in SQL batches for efficiency
    const sqlBatchSize = batchSize;
    const maxRecords = maxBatches * sqlBatchSize;
    const recordsToProcess = updates.slice(0, maxRecords);

    for (let i = 0; i < recordsToProcess.length; i += sqlBatchSize) {
      const batch = recordsToProcess.slice(i, i + sqlBatchSize);
      stats.batches++;

      // Build bulk update using raw SQL for efficiency
      const sourceIds = batch.map(u => u.source_id);

      // Update each record - use Promise.all for parallel processing
      const updatePromises = batch.map(async (update) => {
        const { error, count } = await supabase
          .from('vehicles')
          .update({
            images: update.images,
            updated_at: new Date().toISOString(),
          })
          .eq('source', 'china')
          .eq('source_id', update.source_id);

        if (error) {
          return { error: true };
        }
        return { updated: (count || 0) > 0 };
      });

      const results = await Promise.all(updatePromises);

      for (const result of results) {
        stats.processed++;
        if ('error' in result && result.error) {
          stats.errors++;
        } else if ('updated' in result && result.updated) {
          stats.updated++;
        } else {
          stats.notFound++;
        }
      }

      console.log(`Batch ${stats.batches}: processed ${stats.processed}, updated ${stats.updated}`);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      date,
      stats,
      duration: `${(duration / 1000).toFixed(1)}s`,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Photo URL update error:', error);
    return NextResponse.json(
      { error: 'Failed to update photo URLs' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dongchedi/photos/update-urls
 *
 * Check CSV availability and sample data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayDateString();

    const csvUrl = `${DONGCHEDI_CONFIG.EXPORT_HOST}/dongchedi/${date}/active_offer.csv`;

    const csvResponse = await fetch(csvUrl, {
      method: 'HEAD',
      headers: {
        'Authorization': DONGCHEDI_CONFIG.EXPORT_AUTH_HEADER,
      },
    });

    return NextResponse.json({
      date,
      available: csvResponse.ok,
      status: csvResponse.status,
      url: csvUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check CSV availability' },
      { status: 500 }
    );
  }
}
