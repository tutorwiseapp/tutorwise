/**
 * Filename: src/app/sitemap-profiles.xml/route.ts
 * Purpose: High-Trust Profiles Sitemap
 * Created: 2025-12-31
 * Phase: Trust-First SEO - Enhancement
 *
 * Generates sitemap for SEO-eligible profiles only (score >= 75)
 * Separated from main sitemap for better organization and Google Search Console tracking
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
 * GET /sitemap-profiles.xml
 * Returns sitemap of high-trust profiles only
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

    const urls: SitemapUrl[] = [];

    // ============================================================================
    // TRUST-FIRST SEO: High-Trust Profiles (score >= 75)
    // ============================================================================
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, slug, updated_at, seo_eligibility_score')
      .eq('seo_eligible', true)
      .gte('seo_eligibility_score', 75)
      .not('slug', 'is', null)
      .order('seo_eligibility_score', { ascending: false })
      .limit(10000); // Google limit is 50K URLs per sitemap

    if (error) {
      console.error('Error fetching profiles for sitemap:', error);
      throw error;
    }

    if (profiles) {
      for (const profile of profiles) {
        // Priority based on trust score (75-100 → 0.5-0.8)
        const priority = 0.5 + ((profile.seo_eligibility_score - 75) / 100);

        urls.push({
          loc: `${baseUrl}/public-profile/${profile.id}/${profile.slug}`,
          lastmod: profile.updated_at || new Date().toISOString(),
          changefreq: 'monthly',
          priority: Math.min(priority, 0.8),
        });
      }
    }

    // Generate XML
    const sitemapXML = generateSitemapXML(urls);

    return new NextResponse(sitemapXML, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Sitemap-Profile-Count': urls.length.toString(),
      },
    });
  } catch (error) {
    console.error('Profiles sitemap generation error:', error);
    return new NextResponse('Error generating profiles sitemap', { status: 500 });
  }
}
