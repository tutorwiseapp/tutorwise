/**
 * Filename: src/app/sitemap-listings.xml/route.ts
 * Purpose: High-Trust Listings Sitemap
 * Created: 2025-12-31
 * Phase: Trust-First SEO - Enhancement
 *
 * Generates sitemap for listings from SEO-eligible providers only (score >= 75)
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
 * GET /sitemap-listings.xml
 * Returns sitemap of listings from high-trust providers only
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';

    const urls: SitemapUrl[] = [];

    // ============================================================================
    // TRUST-FIRST SEO: Listings from High-Trust Providers
    // ============================================================================
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        id,
        slug,
        updated_at,
        profile_id,
        profiles!inner (
          seo_eligible,
          seo_eligibility_score
        )
      `)
      .eq('status', 'active')
      .eq('profiles.seo_eligible', true)
      .gte('profiles.seo_eligibility_score', 75)
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10000); // Google limit is 50K URLs per sitemap

    if (error) {
      console.error('Error fetching listings for sitemap:', error);
      throw error;
    }

    if (listings) {
      for (const listing of listings) {
        const providerScore = (listing.profiles as any)?.seo_eligibility_score || 75;
        // Priority based on provider trust (75-100 → 0.4-0.7)
        const priority = 0.4 + ((providerScore - 75) / 125);

        urls.push({
          loc: `${baseUrl}/listings/${listing.id}/${listing.slug}`,
          lastmod: listing.updated_at || new Date().toISOString(),
          changefreq: 'monthly',
          priority: Math.min(priority, 0.7),
        });
      }
    }

    // Generate XML
    const sitemapXML = generateSitemapXML(urls);

    return new NextResponse(sitemapXML, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Sitemap-Listing-Count': urls.length.toString(),
      },
    });
  } catch (error) {
    console.error('Listings sitemap generation error:', error);
    return new NextResponse('Error generating listings sitemap', { status: 500 });
  }
}
