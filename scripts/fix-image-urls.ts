/**
 * Fix URL encoding in database
 * URLs from Dongchedi CSV may be partially encoded, we need to decode them
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

    // Check if any URL needs decoding
    const needsDecoding = v.images.some((url: string) => url && url.includes('%'));
    if (!needsDecoding) {
      unchanged++;
      continue;
    }

    // Decode all URLs
    const decodedImages = v.images.map((url: string) => {
      if (!url) return url;
      try {
        let decoded = url;
        // Decode until no more encoded chars or no change
        let iterations = 0;
        while (decoded.includes('%') && iterations < 3) {
          const newDecoded = decodeURIComponent(decoded);
          if (newDecoded === decoded) break;
          decoded = newDecoded;
          iterations++;
        }
        return decoded;
      } catch {
        return url;
      }
    });

    // Update in database
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ images: decodedImages })
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
