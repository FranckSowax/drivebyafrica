/**
 * Fix URL encoding in database
 * URLs with literal + signs need to be encoded as %2B for proper signature validation
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Normalize URL encoding
 * - Fix double-encoding: %252B -> %2B
 * - Encode literal + as %2B in query string (+ is interpreted as space by servers)
 */
function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  try {
    // First, handle double-encoding: %252B -> %2B, %253D -> %3D
    let normalized = url.replace(/%25([0-9A-Fa-f]{2})/g, '%$1');

    // Split URL into base and query string
    const questionIndex = normalized.indexOf('?');
    if (questionIndex === -1) return normalized;

    const base = normalized.substring(0, questionIndex);
    const query = normalized.substring(questionIndex + 1);

    // In query string, encode literal + as %2B
    // This ensures the signature is sent correctly to the server
    const fixedQuery = query.replace(/\+/g, '%2B');

    return base + '?' + fixedQuery;
  } catch {
    return url;
  }
}

async function fixUrls() {
  console.log('=== Fixing URL encoding in database ===\n');

  // Get all Chinese vehicles
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, source_id, images')
    .eq('source', 'china');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total vehicles:', vehicles.length);

  let fixed = 0;
  let unchanged = 0;
  let errors = 0;

  for (const v of vehicles) {
    if (!Array.isArray(v.images) || v.images.length === 0) {
      unchanged++;
      continue;
    }

    // Check if any URL has literal + that needs encoding
    const needsFixing = v.images.some((url: string) => {
      if (!url) return false;
      const queryStart = url.indexOf('?');
      if (queryStart === -1) return false;
      const query = url.substring(queryStart + 1);
      return query.includes('+');
    });

    if (!needsFixing) {
      unchanged++;
      continue;
    }

    // Normalize all URLs
    const normalizedImages = v.images.map(normalizeImageUrl);

    // Update in database
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ images: normalizedImages })
      .eq('id', v.id);

    if (updateError) {
      errors++;
    } else {
      fixed++;
    }
  }

  console.log('\n=== Summary ===');
  console.log('Fixed:', fixed);
  console.log('Unchanged:', unchanged);
  console.log('Errors:', errors);
}

fixUrls().catch(console.error);
