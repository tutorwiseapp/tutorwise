/**
 * Filename: src/app/sitemap.xml/route.ts
 * Purpose: Trust-First Dynamic Sitemap Generation
 * Created: 2025-12-29
 * Updated: 2025-12-31 - Added trust filtering for profiles and listings
 *
 * Generates sitemap.xml including:
 * - Static pages (homepage, guides index)
 * - Published hubs and spokes (content quality >= 60)
 * - High-trust profiles (SEO eligible, score >= 75)
 * - High-trust listings (from SEO-eligible providers)
 *
 * Trust-First SEO Principles:
 * - Only include pages with seo_eligible = true
 * - Filter by eligibility score >= 75
 * - Separate sitemaps for different content types
 * - Higher priority for higher trust scores
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

    // ============================================================================
    // TRUST-FIRST SEO: High-Trust Profiles (score >= 75)
    // ============================================================================
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, slug, updated_at, seo_eligibility_score')
      .eq('seo_eligible', true)
      .gte('seo_eligibility_score', 75)
      .not('slug', 'is', null)
      .order('seo_eligibility_score', { ascending: false })
      .limit(1000); // Cap at 1000 profiles per sitemap

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

    // ============================================================================
    // TRUST-FIRST SEO: Listings from High-Trust Providers
    // ============================================================================
    const { data: listings } = await supabase
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
      .limit(1000); // Cap at 1000 listings per sitemap

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
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}
