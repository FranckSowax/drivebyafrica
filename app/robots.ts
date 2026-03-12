import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/collaborator', '/api', '/auth'],
      },
    ],
    sitemap: 'https://driveby-africa.com/sitemap.xml',
    host: 'https://driveby-africa.com',
  };
}
