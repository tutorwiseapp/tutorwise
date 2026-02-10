/**
 * Filename: src/app/api/cron/seo-sync/route.ts
 * Purpose: Automated SEO data synchronization cron job
 * Created: 2025-12-29
 *
 * Schedule:
 * - GSC sync: Daily at 6am UTC
 * - Rank tracking: Daily at 7am UTC (critical/high priority keywords)
 * - Content quality: Weekly Monday at 3am UTC
 *
 * Usage: Configure in Vercel cron or external scheduler
 * curl -X POST https://tutorwise.io/api/cron/seo-sync \
 *   -H "Authorization: Bearer ${CRON_SECRET}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncGSCPerformance } from '@/services/seo/gsc-sync';
import { trackPriorityKeywords } from '@/services/seo/rank-tracking';
import { analyzeAllContent } from '@/services/seo/content-quality';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

interface SyncResult {
  task: string;
  success: boolean;
  details?: any;
  error?: string;
  skipped?: boolean;
}

/**
 * Verify cron secret for security
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - cron endpoint is unsecured');
    return true; // Allow if no secret configured (development)
  }

  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  return token === cronSecret;
}

/**
 * Sync Google Search Console data
 */
async function syncGSC(): Promise<SyncResult> {
  try {
    const result = await syncGSCPerformance(30); // Last 30 days

    if (result.skipped) {
      return {
        task: 'GSC Sync',
        success: true,
        skipped: true,
        details: { reason: result.reason },
      };
    }

    return {
      task: 'GSC Sync',
      success: true,
      details: {
        synced: result.synced,
        errors: result.errors,
      },
    };
  } catch (error) {
    return {
      task: 'GSC Sync',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Track priority keyword rankings
 */
async function trackRankings(): Promise<SyncResult> {
  try {
    const result = await trackPriorityKeywords();

    return {
      task: 'Rank Tracking',
      success: true,
      details: {
        tracked: result.tracked,
        updated: result.updated,
      },
    };
  } catch (error) {
    return {
      task: 'Rank Tracking',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Analyze content quality for all published content
 */
async function analyzeContent(): Promise<SyncResult> {
  try {
    const result = await analyzeAllContent();

    return {
      task: 'Content Quality Analysis',
      success: true,
      details: {
        analyzed: result.analyzed,
        updated: result.updated,
      },
    };
  } catch (error) {
    return {
      task: 'Content Quality Analysis',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log sync results to database
 */
async function logSyncResults(results: SyncResult[]): Promise<void> {
  const supabase = await createClient();

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  const skippedCount = results.filter((r) => r.skipped).length;

  console.log(`SEO Cron completed: ${successCount} success, ${failureCount} failures, ${skippedCount} skipped`);

  // Update last sync timestamp in settings
  await supabase
    .from('seo_settings')
    .update({
      gsc_last_sync_at: new Date().toISOString(),
    })
    .eq('id', 1);
}

/**
 * Main cron handler
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: SyncResult[] = [];

  console.log('SEO Cron started at', new Date().toISOString());

  // Parse request body for task selection
  const body = await request.json().catch(() => ({}));
  const tasks = body.tasks || ['gsc', 'ranks', 'quality'];

  // 1. Sync GSC data
  if (tasks.includes('gsc')) {
    console.log('Running GSC sync...');
    const gscResult = await syncGSC();
    results.push(gscResult);
  }

  // 2. Track keyword rankings
  if (tasks.includes('ranks')) {
    console.log('Running rank tracking...');
    const rankResult = await trackRankings();
    results.push(rankResult);
  }

  // 3. Analyze content quality (weekly only)
  if (tasks.includes('quality')) {
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1 || body.force_quality) {
      // Monday or forced
      console.log('Running content quality analysis...');
      const qualityResult = await analyzeContent();
      results.push(qualityResult);
    } else {
      results.push({
        task: 'Content Quality Analysis',
        success: true,
        skipped: true,
        details: { reason: 'Only runs on Mondays' },
      });
    }
  }

  // Log results
  await logSyncResults(results);

  const duration = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    duration: `${duration}ms`,
    results,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET endpoint for health check
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();

  // Get last sync timestamp
  const { data: settings } = await supabase
    .from('seo_settings')
    .select('gsc_last_sync_at')
    .single();

  // Get service health
  const { data: health } = await supabase.from('seo_service_health').select('*');

  return NextResponse.json({
    status: 'healthy',
    last_sync: settings?.gsc_last_sync_at,
    services: health,
  });
}
