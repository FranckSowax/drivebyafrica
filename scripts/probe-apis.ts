/**
 * API Probe Script
 *
 * Counts total vehicles available from Dubicars and Dongchedi APIs
 * without any filters to understand inventory size.
 */

const DUBICARS_API = 'https://api1.auto-api.com/api/v2/dubicars';
const DONGCHEDI_API = 'https://api1.auto-api.com/api/v2/dongchedi';

const DUBICARS_KEY = process.env.DUBICARS_API_KEY || process.env.ENCAR_API_KEY;
const DONGCHEDI_KEY = process.env.DONGCHEDI_API_KEY;

interface ApiResponse {
  result?: any[];
  meta?: {
    next_page?: number | null;
  };
}

async function probeApi(
  apiName: string,
  baseUrl: string,
  apiKey: string | undefined,
  maxPages: number = 10000
): Promise<{ totalVehicles: number; pagesScanned: number }> {
  if (!apiKey) {
    console.log(`⚠️  ${apiName}: API key not found`);
    return { totalVehicles: 0, pagesScanned: 0 };
  }

  console.log(`\n🔍 Probing ${apiName}...`);

  let page = 1;
  let totalVehicles = 0;
  let emptyPages = 0;
  const seenIds = new Set<string>();

  while (page <= maxPages) {
    try {
      const url = `${baseUrl}/offers?api_key=${apiKey}&page=${page}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`   ❌ Error at page ${page}: ${response.status} ${response.statusText}`);
        break;
      }

      const data: ApiResponse = await response.json();
      const offers = data.result || [];

      if (offers.length === 0) {
        emptyPages++;
        if (emptyPages >= 3) {
          console.log(`   ⏹️  Stopping after ${emptyPages} empty pages at page ${page}`);
          break;
        }
      } else {
        emptyPages = 0;

        // Count unique vehicles
        for (const offer of offers) {
          const id = offer.data?.inner_id || offer.inner_id || offer.id;
          if (id && !seenIds.has(String(id))) {
            seenIds.add(String(id));
            totalVehicles++;
          }
        }
      }

      // Progress update every 100 pages
      if (page % 100 === 0) {
        console.log(`   📊 Page ${page}: ${totalVehicles.toLocaleString()} unique vehicles`);
      }

      // Check if there's a next page
      const hasMore = data.meta?.next_page !== null && data.meta?.next_page !== undefined;
      if (!hasMore) {
        console.log(`   ✅ Reached end at page ${page}`);
        break;
      }

      page++;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      console.log(`   ❌ Error at page ${page}:`, (e as Error).message);
      break;
    }
  }

  console.log(`\n   ✨ ${apiName} Results:`);
  console.log(`      Total unique vehicles: ${totalVehicles.toLocaleString()}`);
  console.log(`      Pages scanned: ${page - 1}`);

  return { totalVehicles, pagesScanned: page - 1 };
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('   API Inventory Probe');
  console.log('═══════════════════════════════════════');
  console.log(`Started: ${new Date().toLocaleString()}`);

  const startTime = Date.now();

  // Probe both APIs in parallel
  const [dubicarsResult, dongchediResult] = await Promise.all([
    probeApi('Dubicars', DUBICARS_API, DUBICARS_KEY),
    probeApi('Dongchedi', DONGCHEDI_API, DONGCHEDI_KEY),
  ]);

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log('\n═══════════════════════════════════════');
  console.log('   SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`\n📍 Dubicars (Dubai/UAE):`);
  console.log(`   Vehicles: ${dubicarsResult.totalVehicles.toLocaleString()}`);
  console.log(`   Pages: ${dubicarsResult.pagesScanned}`);

  console.log(`\n📍 Dongchedi (China):`);
  console.log(`   Vehicles: ${dongchediResult.totalVehicles.toLocaleString()}`);
  console.log(`   Pages: ${dongchediResult.pagesScanned}`);

  console.log(`\n📊 Grand Total:`);
  console.log(`   ${(dubicarsResult.totalVehicles + dongchediResult.totalVehicles).toLocaleString()} vehicles`);

  console.log(`\n⏱️  Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
  console.log('═══════════════════════════════════════\n');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
