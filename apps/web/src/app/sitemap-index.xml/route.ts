/**
 * Filename: src/app/sitemap-index.xml/route.ts
 * Purpose: Sitemap Index - Links to individual sitemaps
 * Created: 2025-12-31
 * Phase: Trust-First SEO - Enhancement
 *
 * Generates sitemap index pointing to:
 * - sitemap.xml (static pages + content)
 * - sitemap-profiles.xml (high-trust profiles)
 * - sitemap-listings.xml (high-trust listings)
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /sitemap-index.xml
 * Returns sitemap index with links to all sub-sitemaps
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-profiles.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-listings.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new NextResponse(sitemapIndex, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
