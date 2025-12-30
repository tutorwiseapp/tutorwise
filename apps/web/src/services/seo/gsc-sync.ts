/**
 * Filename: src/services/seo/gsc-sync.ts
 * Purpose: Google Search Console API integration for search performance data
 * Created: 2025-12-29
 *
 * Syncs search queries, impressions, clicks, CTR, and positions from GSC
 * Populates seo_gsc_performance table and updates seo_keywords
 *
 * TOGGLE SUPPORT: Respects seo_settings.gsc_enabled toggle
 * Works with or without GSC API configured
 */

import { google } from 'googleapis';
import { createClient } from '@/utils/supabase/server';

const webmasters = google.webmasters('v3');

/**
 * Check if GSC integration is enabled
 */
async function isGSCEnabled(): Promise<boolean> {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('seo_settings')
    .select('gsc_enabled, gsc_api_key_set')
    .single();

  return settings?.gsc_enabled === true && settings?.gsc_api_key_set === true;
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
    .eq('service_name', 'gsc');
}

interface GSCSearchAnalyticsRow {
  keys: string[]; // [query, page]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCSearchAnalyticsResponse {
  rows: GSCSearchAnalyticsRow[];
  responseAggregationType: string;
}

/**
 * Get OAuth2 client for Google Search Console
 */
async function getGSCClient() {
  const supabase = await createClient();

  // Get GSC credentials from settings
  const { data: settings } = await supabase
    .from('seo_settings')
    .select('gsc_property_id, google_search_console_property_url')
    .single();

  if (!settings?.gsc_property_id) {
    throw new Error('Google Search Console not configured');
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_SITE_URL + '/api/auth/google/callback'
  );

  // Set refresh token (stored securely)
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN,
  });

  return { oauth2Client, propertyUrl: settings.google_search_console_property_url || 'https://tutorwise.io' };
}

/**
 * Sync search performance data from GSC for last N days
 * Returns early if GSC is disabled in settings
 */
export async function syncGSCPerformance(days: number = 30) {
  try {
    // Check if GSC is enabled
    const enabled = await isGSCEnabled();
    if (!enabled) {
      console.log('GSC sync skipped: service is disabled in settings');
      return { synced: 0, errors: 0, skipped: true, reason: 'GSC disabled in settings' };
    }

    const { oauth2Client, propertyUrl } = await getGSCClient();
    const supabase = await createClient();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`Syncing GSC data from ${startDateStr} to ${endDateStr}`);

    // Query GSC API
    const response = await webmasters.searchanalytics.query({
      auth: oauth2Client,
      siteUrl: propertyUrl,
      requestBody: {
        startDate: startDateStr,
        endDate: endDateStr,
        dimensions: ['query', 'page', 'date', 'device'],
        rowLimit: 25000, // Max allowed by GSC
        dataState: 'final', // Use finalized data
      },
    });

    const rows = (response.data as GSCSearchAnalyticsResponse).rows || [];
    console.log(`Received ${rows.length} rows from GSC`);

    if (rows.length === 0) {
      console.log('No GSC data to sync');
      return { synced: 0, errors: 0 };
    }

    // Transform and insert data
    let synced = 0;
    let errors = 0;

    for (const row of rows) {
      const [query, page, date, device] = row.keys;

      try {
        // Upsert into seo_gsc_performance
        const { error } = await supabase
          .from('seo_gsc_performance')
          .upsert({
            page_url: page,
            query: query,
            date: date,
            device: device,
            impressions: row.impressions,
            clicks: row.clicks,
            ctr: row.ctr,
            position: row.position,
          }, {
            onConflict: 'page_url,query,date,device',
          });

        if (error) {
          console.error(`Error upserting GSC row:`, error);
          errors++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`Error processing GSC row:`, err);
        errors++;
      }
    }

    // Update last sync timestamp
    await supabase
      .from('seo_settings')
      .update({ gsc_last_sync_at: new Date().toISOString() })
      .eq('id', 1);

    console.log(`GSC sync complete: ${synced} rows synced, ${errors} errors`);

    // Update service health
    await updateServiceHealth('healthy');

    // After syncing, update keyword positions from GSC data
    await updateKeywordPositionsFromGSC();

    return { synced, errors, skipped: false };
  } catch (error) {
    console.error('GSC sync error:', error);

    // Update service health
    await updateServiceHealth('down', error instanceof Error ? error.message : 'Unknown error');

    // Increment consecutive failures
    const supabase = await createClient();
    await supabase.rpc('increment', {
      table_name: 'seo_service_health',
      column_name: 'consecutive_failures',
      row_id: 'gsc',
    });

    throw error;
  }
}

/**
 * Update seo_keywords.current_position from GSC data
 * Uses best position (lowest position number) for each keyword
 * Also calculates estimated position from CTR when exact position unavailable
 */
async function updateKeywordPositionsFromGSC() {
  const supabase = await createClient();

  // Get all keywords
  const { data: keywords } = await supabase
    .from('seo_keywords')
    .select('id, keyword');

  if (!keywords || keywords.length === 0) return;

  let updated = 0;

  for (const kw of keywords) {
    // Get best (lowest) position for this keyword from last 7 days
    const { data: gscData } = await supabase
      .from('seo_gsc_performance')
      .select('position, clicks, impressions, ctr')
      .eq('query', kw.keyword)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (gscData) {
      // Update keyword with GSC data
      const { error } = await supabase
        .from('seo_keywords')
        .update({
          current_position: Math.round(gscData.position),
          clicks: gscData.clicks,
          impressions: gscData.impressions,
          ctr: gscData.ctr,
          position_source: 'gsc',
          position_confidence: 0.7, // GSC data is fairly reliable
          last_checked_at: new Date().toISOString(),
          last_external_check_at: new Date().toISOString(),
          external_check_status: 'success',
        })
        .eq('id', kw.id);

      if (error) {
        console.error(`Error updating keyword ${kw.keyword}:`, error);
      } else {
        updated++;
      }
    } else {
      // No exact position data, try to estimate from CTR
      const { data: aggregateData } = await supabase
        .from('seo_gsc_performance')
        .select('impressions, clicks, ctr')
        .eq('query', kw.keyword)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (aggregateData && aggregateData.length > 0) {
        const totalImpressions = aggregateData.reduce((sum, row) => sum + (row.impressions || 0), 0);
        const totalClicks = aggregateData.reduce((sum, row) => sum + (row.clicks || 0), 0);
        const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        // Use the database function to estimate position
        const { data: estimatedPos } = await supabase
          .rpc('calculate_position_from_gsc', {
            p_impressions: totalImpressions,
            p_clicks: totalClicks,
            p_ctr: avgCTR,
          });

        if (estimatedPos) {
          await supabase
            .from('seo_keywords')
            .update({
              current_position: estimatedPos,
              clicks: totalClicks,
              impressions: totalImpressions,
              ctr: avgCTR,
              position_source: 'calculated',
              position_confidence: 0.5, // Lower confidence for calculated positions
              last_checked_at: new Date().toISOString(),
              last_external_check_at: new Date().toISOString(),
              external_check_status: 'success',
            })
            .eq('id', kw.id);

          updated++;
        }
      }
    }
  }

  console.log(`Updated ${updated} keyword positions from GSC data`);
}

/**
 * Get search queries with high impressions but low CTR (quick win opportunities)
 */
export async function getQuickWinOpportunities(minImpressions: number = 100, maxCTR: number = 5) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('seo_gsc_performance')
    .select('query, page_url, impressions, clicks, ctr, position')
    .gte('impressions', minImpressions)
    .lte('ctr', maxCTR)
    .gte('position', 3) // Not already in top 2
    .lte('position', 20) // Within reach
    .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days
    .order('impressions', { ascending: false })
    .limit(20);

  if (error) throw error;

  return data;
}

/**
 * Identify pages losing rankings (position drop > 5 in last 30 days)
 */
export async function getRankingDeclines() {
  const supabase = await createClient();

  // Get current positions
  const { data: currentData } = await supabase
    .from('seo_gsc_performance')
    .select('query, page_url, position, date')
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false });

  // Get positions from 30 days ago
  const { data: oldData } = await supabase
    .from('seo_gsc_performance')
    .select('query, page_url, position, date')
    .gte('date', new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .lte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  if (!currentData || !oldData) return [];

  // Compare positions
  const declines = [];
  const currentMap = new Map(currentData.map(d => [`${d.query}:${d.page_url}`, d.position]));
  const oldMap = new Map(oldData.map(d => [`${d.query}:${d.page_url}`, d.position]));

  for (const [key, currentPos] of currentMap) {
    const oldPos = oldMap.get(key);
    if (oldPos && (currentPos - oldPos) > 5) {
      const [query, page_url] = key.split(':');
      declines.push({
        query,
        page_url,
        old_position: oldPos,
        current_position: currentPos,
        decline: currentPos - oldPos,
      });
    }
  }

  return declines.sort((a, b) => b.decline - a.decline).slice(0, 20);
}
