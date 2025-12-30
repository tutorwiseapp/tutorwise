/**
 * Filename: src/app/sitemap.xml/route.ts
 * Purpose: Dynamic sitemap generation for SEO
 * Created: 2025-12-29
 *
 * Generates sitemap.xml including:
 * - All published hubs
 * - All published spokes
 * - Static pages
 *
 * Auto-submitted to Google Search Console when enabled
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/**
 * Generate sitemap XML from URLs
 */
function generateSitemapXML(urls: SitemapUrl[]): string {
  const urlsXML = urls
    .map(
      (url) => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlsXML}
</urlset>`;
}

/**
 * GET /sitemap.xml
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

    const urls: SitemapUrl[] = [];

    // Add static pages
    urls.push({
      loc: `${baseUrl}/`,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 1.0,
    });

    urls.push({
      loc: `${baseUrl}/guides`,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 0.9,
    });

    // Get all published hubs
    const { data: hubs } = await supabase
      .from('seo_hubs')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (hubs) {
      for (const hub of hubs) {
        urls.push({
          loc: `${baseUrl}/guides/${hub.slug}`,
          lastmod: hub.updated_at || hub.published_at || new Date().toISOString(),
          changefreq: 'weekly',
          priority: 0.8,
        });
      }
    }

    // Get all published spokes with their hub slugs
    const { data: spokes } = await supabase
      .from('seo_spokes')
      .select('slug, updated_at, published_at, seo_hubs(slug)')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (spokes) {
      for (const spoke of spokes) {
        const hubSlug = (spoke.seo_hubs as any)?.slug;
        if (hubSlug) {
          urls.push({
            loc: `${baseUrl}/guides/${hubSlug}/${spoke.slug}`,
            lastmod: spoke.updated_at || spoke.published_at || new Date().toISOString(),
            changefreq: 'weekly',
            priority: 0.6,
          });
        }
      }
    }

    // Generate XML
    const sitemapXML = generateSitemapXML(urls);

    return new NextResponse(sitemapXML, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}
