/**
 * Filename: src/services/seo/ahrefs-sync.ts
 * Purpose: Ahrefs API integration for backlink monitoring
 * Created: 2025-12-29
 *
 * TOGGLE SUPPORT: Respects seo_settings.ahrefs_enabled toggle
 * Works with or without Ahrefs API configured
 *
 * Ahrefs API Docs: https://ahrefs.com/api/documentation
 */

import { createClient } from '@/utils/supabase/server';

interface AhrefsBacklink {
  url_from: string;
  url_to: string;
  anchor: string;
  domain_rating: number;
  url_rating: number;
  is_dofollow: boolean;
  is_content: boolean;
  first_seen: string;
  last_seen: string;
}

interface AhrefsResponse {
  backlinks: AhrefsBacklink[];
  stats: {
    backlinks: number;
    referring_domains: number;
  };
}

/**
 * Check if Ahrefs integration is enabled
 */
async function isAhrefsEnabled(): Promise<boolean> {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('seo_settings')
    .select('ahrefs_enabled, ahrefs_api_key_set')
    .single();

  return settings?.ahrefs_enabled === true && settings?.ahrefs_api_key_set === true;
}

/**
 * Update service health status
 */
async function updateServiceHealth(status: 'healthy' | 'degraded' | 'down', errorMessage?: string) {
  const supabase = await createClient();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'healthy') {
    updateData.last_successful_call = new Date().toISOString();
    updateData.consecutive_failures = 0;
    updateData.error_message = null;
  } else {
    updateData.last_failed_call = new Date().toISOString();
    updateData.error_message = errorMessage;
  }

  await supabase
    .from('seo_service_health')
    .update(updateData)
    .eq('service_name', 'ahrefs');
}

/**
 * Fetch backlinks from Ahrefs API
 */
async function fetchAhrefsBacklinks(domain: string): Promise<AhrefsBacklink[]> {
  const apiToken = process.env.AHREFS_API_TOKEN;
  if (!apiToken) {
    throw new Error('Ahrefs API token not configured');
  }

  // Ahrefs API endpoint
  const url = `https://apiv2.ahrefs.com/v3/site-explorer/all-backlinks`;

  const params = new URLSearchParams({
    select: 'url_from,url_to,anchor,domain_rating,url_rating,is_dofollow,is_content,first_seen,last_seen',
    target: domain,
    mode: 'domain',
    limit: '1000', // Max backlinks to fetch
    order_by: 'domain_rating:desc',
  });

  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Ahrefs API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.backlinks || [];
}

/**
 * Sync backlinks from Ahrefs
 */
export async function syncAhrefsBacklinks(): Promise<{ synced: number; errors: number; skipped?: boolean; reason?: string }> {
  try {
    // Check if Ahrefs is enabled
    const enabled = await isAhrefsEnabled();
    if (!enabled) {
      console.log('Ahrefs sync skipped: service is disabled in settings');
      return { synced: 0, errors: 0, skipped: true, reason: 'Ahrefs disabled in settings' };
    }

    const supabase = await createClient();

    // Get domain from settings
    const { data: settings } = await supabase
      .from('seo_settings')
      .select('canonical_base_url')
      .single();

    const domain = settings?.canonical_base_url?.replace(/^https?:\/\//, '') || 'tutorwise.io';

    console.log(`Fetching backlinks for ${domain} from Ahrefs...`);

    // Fetch backlinks from Ahrefs
    const ahrefsBacklinks = await fetchAhrefsBacklinks(domain);
    console.log(`Received ${ahrefsBacklinks.length} backlinks from Ahrefs`);

    if (ahrefsBacklinks.length === 0) {
      console.log('No backlinks found in Ahrefs');
      await updateServiceHealth('healthy');
      return { synced: 0, errors: 0 };
    }

    // Get existing backlinks to check for lost ones
    const { data: existingBacklinks } = await supabase
      .from('seo_backlinks')
      .select('source_url, status');

    const existingUrls = new Set((existingBacklinks || []).map((bl) => bl.source_url));
    const currentUrls = new Set(ahrefsBacklinks.map((bl) => bl.url_from));

    let synced = 0;
    let errors = 0;

    // Upsert backlinks from Ahrefs
    for (const ahrefsLink of ahrefsBacklinks) {
      try {
        const linkType = ahrefsLink.is_dofollow ? 'dofollow' : 'nofollow';
        const status = 'active';

        const { error } = await supabase
          .from('seo_backlinks')
          .upsert(
            {
              source_url: ahrefsLink.url_from,
              source_domain: new URL(ahrefsLink.url_from).hostname,
              target_url: ahrefsLink.url_to,
              domain_rating: ahrefsLink.domain_rating,
              link_type: linkType,
              status,
              anchor_text: ahrefsLink.anchor,
              first_seen_at: ahrefsLink.first_seen,
              last_checked_at: new Date().toISOString(),
            },
            {
              onConflict: 'source_url,target_url',
            }
          );

        if (error) {
          console.error(`Error upserting backlink:`, error);
          errors++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`Error processing backlink:`, err);
        errors++;
      }
    }

    // Mark lost backlinks (existed before but not in current fetch)
    for (const existing of existingBacklinks || []) {
      if (!currentUrls.has(existing.source_url) && existing.status === 'active') {
        await supabase
          .from('seo_backlinks')
          .update({ status: 'lost', last_checked_at: new Date().toISOString() })
          .eq('source_url', existing.source_url);
      }
    }

    // Update service health
    await updateServiceHealth('healthy');

    console.log(`Ahrefs sync complete: ${synced} backlinks synced, ${errors} errors`);

    return { synced, errors };
  } catch (error) {
    console.error('Ahrefs sync error:', error);

    // Update service health
    await updateServiceHealth('down', error instanceof Error ? error.message : 'Unknown error');

    throw error;
  }
}

/**
 * Get competitor backlinks
 */
export async function getCompetitorBacklinks(competitorDomain: string): Promise<AhrefsBacklink[]> {
  const enabled = await isAhrefsEnabled();
  if (!enabled) {
    throw new Error('Ahrefs is not enabled');
  }

  return await fetchAhrefsBacklinks(competitorDomain);
}

/**
 * Find backlink opportunities (links competitors have but we don't)
 */
export async function findBacklinkOpportunities(competitorDomains: string[]): Promise<{
  domain: string;
  url: string;
  dr: number;
}[]> {
  const supabase = await createClient();

  // Get our backlinks
  const { data: ourBacklinks } = await supabase
    .from('seo_backlinks')
    .select('source_domain');

  const ourDomains = new Set((ourBacklinks || []).map((bl) => bl.source_domain));

  const opportunities: { domain: string; url: string; dr: number }[] = [];

  // Check each competitor
  for (const competitorDomain of competitorDomains) {
    try {
      const competitorLinks = await fetchAhrefsBacklinks(competitorDomain);

      for (const link of competitorLinks) {
        const domain = new URL(link.url_from).hostname;

        // If they have it and we don't, it's an opportunity
        if (!ourDomains.has(domain) && link.domain_rating >= 40) {
          opportunities.push({
            domain,
            url: link.url_from,
            dr: link.domain_rating,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching backlinks for ${competitorDomain}:`, error);
    }
  }

  // Sort by DR and dedupe
  const uniqueOpportunities = Array.from(
    new Map(opportunities.map((opp) => [opp.domain, opp])).values()
  );

  return uniqueOpportunities.sort((a, b) => b.dr - a.dr).slice(0, 50);
}
