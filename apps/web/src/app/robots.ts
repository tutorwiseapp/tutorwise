/**
 * Filename: apps/web/src/app/robots.ts
 * Purpose: Generate robots.txt for search engine crawlers
 * Created: 2026-01-15
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://tutorwise.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/*',
          '/api/*',
          '/hub/*',
          '/_next/*',
          '/static/*',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/*',
          '/api/*',
          '/hub/*',
        ],
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/resources/sitemap.xml`,
    ],
  };
}
