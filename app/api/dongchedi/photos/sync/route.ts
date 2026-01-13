import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  downloadActiveOffersCsv,
  parseCsv,
  isPhotoLinkValid,
  DONGCHEDI_CONFIG,
  getYesterdayDateString,
} from '@/lib/api/dongchedi';

/**
 * POST /api/dongchedi/photos/sync
 *
 * Download and cache photos from Dongchedi
 *
 * IMPORTANT: Photo links from Dongchedi expire after 6 days.
 * This endpoint downloads the active_offer.csv file, checks for valid links,
 * and caches the photos to our Supabase storage.
 *
 * Body:
 * - date: string (yyyy-mm-dd, default: yesterday)
 * - limit: number (max photos to sync, default: 100)
 * - dryRun: boolean (just check, don't download)
 *
 * This should be run daily via cron job after 06:00 UTC
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const date = body.date || getYesterdayDateString();
    const limit = body.limit || 100;
    const dryRun = body.dryRun || false;

    // Download and parse active_offer.csv
    let csvContent: string;
    try {
      csvContent = await downloadActiveOffersCsv(date);
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to download export file for ${date}. Files are available after 06:00 UTC.` },
        { status: 404 }
      );
    }

    // Parse CSV (pipe-delimited)
    interface PhotoRow {
      inner_id: string;
      images: string;
      synced_at: string;
      [key: string]: string;
    }
    const rows = parseCsv<PhotoRow>(csvContent, '|');

    // Filter for valid links (synced_at < 6 days)
    const validRows = rows.filter((row) => {
      if (!row.synced_at || !row.images) return false;
      return isPhotoLinkValid(row.synced_at);
    });

    const stats = {
      totalRows: rows.length,
      validRows: validRows.length,
      processed: 0,
      uploaded: 0,
      skipped: 0,
      errors: 0,
    };

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        date,
        stats,
        sampleRows: validRows.slice(0, 5).map((r) => ({
          inner_id: r.inner_id,
          imageCount: r.images.split(',').length,
          synced_at: r.synced_at,
        })),
      });
    }

    // Process photos (limited)
    const rowsToProcess = validRows.slice(0, limit);

    for (const row of rowsToProcess) {
      stats.processed++;

      const imageUrls = row.images.split(',').map((url) => url.trim()).filter(Boolean);
      if (imageUrls.length === 0) {
        stats.skipped++;
        continue;
      }

      const cachedUrls: string[] = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];

        try {
          // Download image
          const response = await fetch(imageUrl);
          if (!response.ok) {
            console.error(`Failed to fetch image: ${imageUrl}`);
            continue;
          }

          const blob = await response.blob();
          const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
          const fileName = `${row.inner_id}/${i}.${extension}`;

          // Upload to Supabase storage
          const { data, error } = await supabase.storage
            .from(DONGCHEDI_CONFIG.PHOTO_CACHE_BUCKET)
            .upload(fileName, blob, {
              contentType: blob.type,
              upsert: true,
            });

          if (error) {
            console.error(`Upload error for ${fileName}:`, error);
            stats.errors++;
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from(DONGCHEDI_CONFIG.PHOTO_CACHE_BUCKET)
              .getPublicUrl(fileName);

            cachedUrls.push(urlData.publicUrl);
            stats.uploaded++;
          }
        } catch (err) {
          console.error(`Error processing image:`, err);
          stats.errors++;
        }

        // Rate limiting for image downloads
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Update vehicle record with cached URLs
      if (cachedUrls.length > 0) {
        await supabase
          .from('vehicles')
          .update({
            images: cachedUrls,
            updated_at: new Date().toISOString(),
          })
          .eq('source', 'china')
          .eq('source_id', row.inner_id);
      }
    }

    return NextResponse.json({
      success: true,
      date,
      stats,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Photo sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync photos' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dongchedi/photos/sync
 *
 * Check status of photo sync (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getYesterdayDateString();

    // Download and parse active_offer.csv
    let csvContent: string;
    try {
      csvContent = await downloadActiveOffersCsv(date);
    } catch (error) {
      return NextResponse.json(
        { error: `Export file not available for ${date}` },
        { status: 404 }
      );
    }

    interface PhotoRow {
      inner_id: string;
      images: string;
      synced_at: string;
      [key: string]: string;
    }
    const rows = parseCsv<PhotoRow>(csvContent, '|');

    const validRows = rows.filter((row) => {
      if (!row.synced_at || !row.images) return false;
      return isPhotoLinkValid(row.synced_at);
    });

    const expiredRows = rows.filter((row) => {
      if (!row.synced_at) return false;
      return !isPhotoLinkValid(row.synced_at);
    });

    return NextResponse.json({
      date,
      totalRows: rows.length,
      validRows: validRows.length,
      expiredRows: expiredRows.length,
      photoExpiryDays: DONGCHEDI_CONFIG.PHOTO_EXPIRY_DAYS,
      exportAvailableAfterUTC: DONGCHEDI_CONFIG.EXPORT_AVAILABLE_AFTER_UTC,
    });
  } catch (error) {
    console.error('Photo status error:', error);
    return NextResponse.json(
      { error: 'Failed to check photo status' },
      { status: 500 }
    );
  }
}
