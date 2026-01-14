/**
 * Script to sync Dongchedi photos locally (no timeout limits)
 *
 * Usage: npx tsx scripts/sync-dongchedi-photos.ts
 *
 * This script:
 * 1. Downloads the active_offer.csv from Dongchedi API
 * 2. Filters for valid photo links (not expired)
 * 3. Downloads photos and uploads to Supabase storage
 * 4. Updates vehicle records with cached URLs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
import { Readable } from 'stream';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DONGCHEDI_CONFIG = {
  // Daily Export Server (for CSV/JSON files with photo links)
  EXPORT_HOST: 'https://autobase-perez.auto-api.com',
  EXPORT_LOGIN: 'ewing',
  EXPORT_PASSWORD: 'iT6g1fVqqGRAHeYkPFtU',
  PHOTO_CACHE_BUCKET: 'dongchedi-photos',
  PHOTO_EXPIRY_DAYS: 6,
};

function getExportAuthHeader(): string {
  const credentials = `${DONGCHEDI_CONFIG.EXPORT_LOGIN}:${DONGCHEDI_CONFIG.EXPORT_PASSWORD}`;
  const base64 = Buffer.from(credentials).toString('base64');
  return `Basic ${base64}`;
}

function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

function isPhotoLinkValid(syncedAt: string): boolean {
  const syncDate = new Date(syncedAt);
  const now = new Date();
  const diffDays = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < DONGCHEDI_CONFIG.PHOTO_EXPIRY_DAYS;
}

interface PhotoRow {
  inner_id: string;
  images: string;
  synced_at: string;
}

async function* streamCsvRows(date: string): AsyncGenerator<PhotoRow> {
  const url = `${DONGCHEDI_CONFIG.EXPORT_HOST}/dongchedi/${date}/active_offer.csv`;
  console.log(`Streaming CSV from: ${url}`);

  const response = await fetch(url, {
    headers: {
      'Authorization': getExportAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download CSV: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let headers: string[] = [];
  let headersParsed = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      // Process remaining buffer
      if (buffer.trim()) {
        const values = buffer.split('|');
        if (headers.length > 0 && values.length >= headers.length) {
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx]?.trim() || '';
          });
          if (row.inner_id && row.images && row.synced_at) {
            yield row as unknown as PhotoRow;
          }
        }
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      if (!headersParsed) {
        headers = line.split('|').map(h => h.trim());
        headersParsed = true;
        continue;
      }

      const values = line.split('|');
      if (values.length < headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });

      if (row.inner_id && row.images && row.synced_at) {
        yield row as unknown as PhotoRow;
      }
    }
  }
}

async function syncPhotos(limit: number = 100, dryRun: boolean = false) {
  console.log(`\n🚀 Starting Dongchedi photo sync (limit: ${limit}, dryRun: ${dryRun})\n`);

  const date = getYesterdayDateString();
  console.log(`📅 Using date: ${date}`);

  const stats = {
    totalRows: 0,
    validRows: 0,
    processed: 0,
    uploaded: 0,
    skipped: 0,
    errors: 0,
    vehiclesUpdated: 0,
  };

  const validRows: PhotoRow[] = [];

  try {
    console.log('📥 Streaming and filtering CSV rows...');

    for await (const row of streamCsvRows(date)) {
      stats.totalRows++;

      if (isPhotoLinkValid(row.synced_at)) {
        stats.validRows++;
        if (validRows.length < limit) {
          validRows.push(row);
        }
      }

      // Progress every 10000 rows
      if (stats.totalRows % 10000 === 0) {
        console.log(`  Scanned ${stats.totalRows} rows, found ${stats.validRows} valid, collected ${validRows.length}/${limit}`);
      }

      // Stop early if we have enough
      if (validRows.length >= limit && stats.totalRows > limit * 10) {
        console.log(`  Early stop: collected ${validRows.length} valid rows`);
        break;
      }
    }

    console.log(`\n📊 Scan complete: ${stats.totalRows} total, ${stats.validRows} valid, ${validRows.length} to process`);

  } catch (error) {
    console.error(`❌ Failed to stream CSV:`, error);
    return stats;
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be made\n');
    console.log('Sample rows:');
    validRows.slice(0, 5).forEach((row, i) => {
      console.log(`  ${i + 1}. inner_id: ${row.inner_id}, synced_at: ${row.synced_at}`);
      console.log(`      Raw images (first 200 chars): ${row.images?.substring(0, 200)}`);
    });
    return stats;
  }

  // Process photos
  console.log(`\n🔄 Processing ${validRows.length} vehicles...\n`);

  for (const row of validRows) {
    stats.processed++;
    const progressPct = Math.round((stats.processed / validRows.length) * 100);

    // Clean up JSON-style image URLs: format is ["" url "","" url ""]
    let imagesStr = row.images;
    // Remove leading ["" and trailing ""]
    if (imagesStr.startsWith('[""')) imagesStr = imagesStr.slice(3);
    if (imagesStr.endsWith('""]')) imagesStr = imagesStr.slice(0, -3);
    // Split by "","" (double-quoted comma separator)
    const imageUrls = imagesStr
      .split('""')
      .map((url: string) => url.replace(/^,/, '').replace(/,$/, '').trim())
      .filter(Boolean)
      .filter((url: string) => url.startsWith('http'));
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
          console.error(`  ❌ Failed to fetch image: ${imageUrl.substring(0, 50)}...`);
          continue;
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `${row.inner_id}/${i}.${extension}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from(DONGCHEDI_CONFIG.PHOTO_CACHE_BUCKET)
          .upload(fileName, buffer, {
            contentType: blob.type || 'image/jpeg',
            upsert: true,
          });

        if (error) {
          console.error(`  ❌ Upload error for ${fileName}:`, error.message);
          stats.errors++;
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from(DONGCHEDI_CONFIG.PHOTO_CACHE_BUCKET)
            .getPublicUrl(fileName);

          cachedUrls.push(urlData.publicUrl);
          stats.uploaded++;
        }
      } catch (err: any) {
        console.error(`  ❌ Error processing image:`, err.message || err);
        stats.errors++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    // Update vehicle record with cached URLs
    if (cachedUrls.length > 0) {
      const { error } = await supabase
        .from('vehicles')
        .update({
          images: cachedUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('source', 'china')
        .eq('source_id', row.inner_id);

      if (!error) {
        stats.vehiclesUpdated++;
      }
    }

    // Progress log every 10 vehicles
    if (stats.processed % 10 === 0 || stats.processed === validRows.length) {
      console.log(`  [${progressPct}%] Processed: ${stats.processed}/${validRows.length}, Uploaded: ${stats.uploaded}, Updated: ${stats.vehiclesUpdated}`);
    }
  }

  console.log('\n✅ Sync completed!\n');
  console.log('📊 Stats:');
  console.log(`  - Total rows scanned: ${stats.totalRows}`);
  console.log(`  - Valid rows found: ${stats.validRows}`);
  console.log(`  - Processed: ${stats.processed}`);
  console.log(`  - Photos uploaded: ${stats.uploaded}`);
  console.log(`  - Vehicles updated: ${stats.vehiclesUpdated}`);
  console.log(`  - Skipped: ${stats.skipped}`);
  console.log(`  - Errors: ${stats.errors}`);

  return stats;
}

// Parse command line arguments
const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '100');
const dryRun = args.includes('--dry-run');

syncPhotos(limit, dryRun).catch(console.error);
