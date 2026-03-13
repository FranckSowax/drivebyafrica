import type { MetadataRoute } from 'next';

const BASE_URL = 'https://driveby-africa.com';

// Use REST API directly (like home page) to avoid supabaseAdmin issues at build time
async function fetchVehicleIds(): Promise<{ id: string; updated_at: string }[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  const allVehicles: { id: string; updated_at: string }[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      const params = new URLSearchParams();
      params.set('select', 'id,updated_at');
      params.set('is_visible', 'eq.true');
      params.set('order', 'updated_at.desc');
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));

      const res = await fetch(`${supabaseUrl}/rest/v1/vehicles?${params}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 3600 },
      });

      if (!res.ok) break;

      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) {
        hasMore = false;
      } else {
        allVehicles.push(...batch);
        offset += PAGE_SIZE;
        if (batch.length < PAGE_SIZE) hasMore = false;
      }
    }
  } catch (err) {
    console.error('[sitemap] Failed to fetch vehicles:', err);
  }

  return allVehicles;
}

// Fetch approved visible batches for sitemap
async function fetchBatchIds(): Promise<{ id: string; updated_at: string }[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const params = new URLSearchParams();
    params.set('select', 'id,updated_at');
    params.set('is_visible', 'eq.true');
    params.set('status', 'eq.approved');
    params.set('order', 'updated_at.desc');

    const res = await fetch(`${supabaseUrl}/rest/v1/vehicle_batches?${params}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[sitemap] Failed to fetch batches:', err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/cars`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/import/chine`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/import/coree`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/import/dubai`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/faq`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/guides`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/calculator`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/careers`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Vehicle pages (paginated fetch)
  const vehicles = await fetchVehicleIds();
  const vehiclePages: MetadataRoute.Sitemap = vehicles.map((v) => ({
    url: `${BASE_URL}/cars/${v.id}`,
    lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // Batch pages
  const batches = await fetchBatchIds();
  const batchPages: MetadataRoute.Sitemap = batches.map((b) => ({
    url: `${BASE_URL}/batches/${b.id}`,
    lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Batches listing page
  const batchesListing: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/batches`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  return [...staticPages, ...batchesListing, ...vehiclePages, ...batchPages];
}
