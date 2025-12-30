/**
 * Filename: src/services/seo/rank-tracking.ts
 * Purpose: Rank tracking with dual-mode support (SerpApi + Fallback)
 * Created: 2025-12-29
 *
 * TOGGLE SUPPORT:
 * - Works WITH SerpApi when enabled (accurate, automated)
 * - Works WITHOUT SerpApi using GSC data (free, less frequent)
 * - Fallback mode uses CTR-based position estimation
 */

import { createClient } from '@/utils/supabase/server';

interface RankCheckResult {
  keyword: string;
  position: number | null;
  url: string | null;
  source: 'serpapi' | 'gsc' | 'calculated' | 'manual';
  confidence: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  checkedAt: string;
}

/**
 * Check if SerpApi is enabled and configured
 */
async function isSerpApiEnabled(): Promise<boolean> {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('seo_settings')
    .select('serpapi_enabled, serpapi_api_key_set')
    .single();

  return settings?.serpapi_enabled === true && settings?.serpapi_api_key_set === true;
}

/**
 * Update service health status for SerpApi
 */
async function updateServiceHealth(
  serviceName: 'serpapi' | 'gsc',
  status: 'healthy' | 'degraded' | 'down',
  errorMessage?: string
) {
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
    .eq('service_name', serviceName);
}

/**
 * Track keyword rank using SerpApi (accurate method)
 */
async function trackRankWithSerpApi(keyword: string): Promise<RankCheckResult> {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      throw new Error('SerpApi API key not configured');
    }

    const supabase = await createClient();
    const { data: settings } = await supabase
      .from('seo_settings')
      .select('canonical_base_url')
      .single();

    const domain = settings?.canonical_base_url || 'https://tutorwise.io';

    // Call SerpApi
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(keyword)}&api_key=${apiKey}&num=100`
    );

    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.statusText}`);
    }

    const data = await response.json();

    // Find our domain in organic results
    const organicResults = data.organic_results || [];
    let position = null;
    let url = null;

    for (let i = 0; i < organicResults.length; i++) {
      const result = organicResults[i];
      if (result.link && result.link.includes(domain)) {
        position = i + 1;
        url = result.link;
        break;
      }
    }

    await updateServiceHealth('serpapi', 'healthy');

    return {
      keyword,
      position,
      url,
      source: 'serpapi',
      confidence: 1.0, // SerpApi is 100% accurate
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('SerpApi tracking error:', error);
    await updateServiceHealth('serpapi', 'down', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Track keyword rank using GSC data (fallback method)
 * Estimates position from CTR and impressions data
 */
async function trackRankWithGSC(keyword: string): Promise<RankCheckResult> {
  const supabase = await createClient();

  try {
    // Get recent GSC data for this keyword (last 7 days)
    const { data: gscData } = await supabase
      .from('seo_gsc_performance')
      .select('position, page_url, impressions, clicks, ctr')
      .eq('query', keyword)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (gscData) {
      // Have exact position data from GSC
      return {
        keyword,
        position: Math.round(gscData.position),
        url: gscData.page_url,
        source: 'gsc',
        confidence: 0.7, // GSC is fairly reliable but not real-time
        impressions: gscData.impressions,
        clicks: gscData.clicks,
        ctr: gscData.ctr,
        checkedAt: new Date().toISOString(),
      };
    }

    // No exact position, try to calculate from aggregate CTR
    const { data: aggregateData } = await supabase
      .from('seo_gsc_performance')
      .select('impressions, clicks, ctr, page_url')
      .eq('query', keyword)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (aggregateData && aggregateData.length > 0) {
      const totalImpressions = aggregateData.reduce((sum, row) => sum + (row.impressions || 0), 0);
      const totalClicks = aggregateData.reduce((sum, row) => sum + (row.clicks || 0), 0);
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Use the database function to estimate position
      const { data: estimatedPos } = await supabase.rpc('calculate_position_from_gsc', {
        p_impressions: totalImpressions,
        p_clicks: totalClicks,
        p_ctr: avgCTR,
      });

      const mostCommonUrl = aggregateData[0]?.page_url || null;

      return {
        keyword,
        position: estimatedPos || null,
        url: mostCommonUrl,
        source: 'calculated',
        confidence: 0.5, // Lower confidence for calculated positions
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: avgCTR,
        checkedAt: new Date().toISOString(),
      };
    }

    // No GSC data available
    return {
      keyword,
      position: null,
      url: null,
      source: 'gsc',
      confidence: 0,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('GSC rank tracking error:', error);
    throw error;
  }
}

/**
 * Track rank for a single keyword (auto-selects best method)
 * Uses SerpApi if enabled, otherwise falls back to GSC estimation
 */
export async function trackKeywordRank(keyword: string): Promise<RankCheckResult> {
  const supabase = await createClient();

  // Check which tracking method to use
  const { data: settings } = await supabase
    .from('seo_settings')
    .select('serpapi_enabled, use_fallback_tracking, fallback_tracking_method')
    .single();

  const serpApiEnabled = await isSerpApiEnabled();

  if (serpApiEnabled) {
    // Use SerpApi (most accurate)
    try {
      return await trackRankWithSerpApi(keyword);
    } catch (error) {
      // SerpApi failed, fall back to GSC if allowed
      if (settings?.use_fallback_tracking && settings?.fallback_tracking_method !== 'disabled') {
        console.log(`SerpApi failed for "${keyword}", falling back to GSC`);
        return await trackRankWithGSC(keyword);
      }
      throw error;
    }
  } else if (settings?.use_fallback_tracking && settings?.fallback_tracking_method === 'gsc_only') {
    // Use GSC fallback method
    return await trackRankWithGSC(keyword);
  } else {
    // No tracking method available
    return {
      keyword,
      position: null,
      url: null,
      source: 'manual',
      confidence: 0,
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Track ranks for multiple keywords
 */
export async function trackMultipleKeywords(keywords: string[]): Promise<RankCheckResult[]> {
  const results: RankCheckResult[] = [];

  for (const keyword of keywords) {
    try {
      const result = await trackKeywordRank(keyword);
      results.push(result);

      // Add delay to avoid rate limiting (100ms between requests)
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to track keyword "${keyword}":`, error);
      results.push({
        keyword,
        position: null,
        url: null,
        source: 'manual',
        confidence: 0,
        checkedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

/**
 * Update keyword positions in database from rank check results
 */
export async function updateKeywordPositions(results: RankCheckResult[]): Promise<number> {
  const supabase = await createClient();
  let updated = 0;

  for (const result of results) {
    try {
      // Find keyword by name
      const { data: keyword } = await supabase
        .from('seo_keywords')
        .select('id, current_position, position_history')
        .eq('keyword', result.keyword)
        .single();

      if (!keyword) {
        console.warn(`Keyword not found in database: ${result.keyword}`);
        continue;
      }

      // Update position history
      const positionHistory = Array.isArray(keyword.position_history) ? keyword.position_history : [];
      if (result.position) {
        positionHistory.push({
          date: result.checkedAt,
          position: result.position,
          url: result.url,
          source: result.source,
        });

        // Keep only last 90 days of history
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const filteredHistory = positionHistory.filter((h) => h.date >= ninetyDaysAgo);

        // Update best_position if this is better
        const bestPosition =
          keyword.current_position && result.position
            ? Math.min(keyword.current_position, result.position)
            : result.position || keyword.current_position;

        // Update keyword
        const { error } = await supabase
          .from('seo_keywords')
          .update({
            current_position: result.position,
            best_position: bestPosition,
            position_history: filteredHistory,
            position_source: result.source,
            position_confidence: result.confidence,
            impressions: result.impressions || 0,
            clicks: result.clicks || 0,
            ctr: result.ctr || null,
            last_checked_at: result.checkedAt,
            last_external_check_at: result.checkedAt,
            external_check_status: 'success',
          })
          .eq('id', keyword.id);

        if (error) {
          console.error(`Error updating keyword ${result.keyword}:`, error);
        } else {
          updated++;
        }
      }
    } catch (error) {
      console.error(`Error processing result for ${result.keyword}:`, error);
    }
  }

  return updated;
}

/**
 * Track all critical and high priority keywords
 */
export async function trackPriorityKeywords(): Promise<{ tracked: number; updated: number }> {
  const supabase = await createClient();

  // Get critical and high priority keywords
  const { data: keywords } = await supabase
    .from('seo_keywords')
    .select('keyword')
    .in('priority', ['critical', 'high'])
    .order('priority', { ascending: false });

  if (!keywords || keywords.length === 0) {
    return { tracked: 0, updated: 0 };
  }

  const keywordList = keywords.map((k) => k.keyword);
  const results = await trackMultipleKeywords(keywordList);
  const updated = await updateKeywordPositions(results);

  return { tracked: results.length, updated };
}
