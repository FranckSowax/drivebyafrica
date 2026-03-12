import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';

const BASE_URL = 'https://driveby-africa.com';

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

  // Vehicle pages
  let vehiclePages: MetadataRoute.Sitemap = [];
  try {
    const { data: vehicles } = await supabaseAdmin
      .from('vehicles')
      .select('id, updated_at')
      .eq('is_visible', true)
      .order('updated_at', { ascending: false });

    if (vehicles) {
      vehiclePages = vehicles.map((v) => ({
        url: `${BASE_URL}/cars/${v.id}`,
        lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.error('[sitemap] Failed to fetch vehicles:', err);
  }

  return [...staticPages, ...vehiclePages];
}
