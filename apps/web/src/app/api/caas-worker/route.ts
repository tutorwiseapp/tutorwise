/**
 * Filename: apps/web/src/app/api/caas-worker/route.ts
 * Purpose: CaaS Score Recalculation Worker (Pattern 2 - Internal Worker API) v5.5
 * Created: 2025-11-15
 * Pattern: Pattern 2 (Internal Worker API) - API Solution Design v5.1
 *
 * This endpoint is triggered by Vercel Cron every 10 minutes to process the
 * caas_recalculation_queue and update scores in the caas_scores table.
 *
 * Security: CRON_SECRET authentication (Bearer token)
 * Batch Size: 100 jobs per run
 * Schedule: Every 10 minutes (configured in vercel.json)
 * Processing Capacity: 600 updates/hour
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CaaSService } from '@/lib/services/caas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // ================================================================
    // STEP 1: VERIFY CRON SECRET (Pattern 2 Security)
    // ================================================================
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      console.error('[caas-worker] Unauthorized request - invalid or missing CRON_SECRET');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ================================================================
    // STEP 2: CREATE SERVICE_ROLE SUPABASE CLIENT
    // ================================================================
    // MUST use service_role key to bypass RLS and call RPC functions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ================================================================
    // STEP 3: FETCH JOBS FROM QUEUE (BATCH SIZE: 100)
    // ================================================================
    const { data: jobs, error: queueError } = await supabase
      .from('caas_recalculation_queue')
      .select('profile_id')
      .order('created_at', { ascending: true }) // FIFO order (oldest first)
      .limit(100); // Process up to 100 jobs per run

    if (queueError) {
      console.error('[caas-worker] Error fetching queue:', queueError);
      return NextResponse.json(
        { error: 'Failed to fetch queue', details: queueError.message },
        { status: 500 }
      );
    }

    // If queue is empty, return success
    if (!jobs || jobs.length === 0) {
      console.log('[caas-worker] Queue is empty - no jobs to process');
      return NextResponse.json({
        success: true,
        message: 'Queue empty',
        processed: 0,
      });
    }

    console.log(`[caas-worker] Processing ${jobs.length} jobs from queue`);

    // ================================================================
    // STEP 4: PROCESS ALL JOBS IN PARALLEL
    // ================================================================
    const results = await Promise.allSettled(
      jobs.map((job) => CaaSService.calculate_caas(job.profile_id, supabase))
    );

    // Count successes and failures
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;

    // Log failures for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `[caas-worker] Failed to calculate score for ${jobs[index].profile_id}:`,
          result.reason
        );
      }
    });

    // ================================================================
    // STEP 5: CLEAR PROCESSED JOBS FROM QUEUE
    // ================================================================
    // Only clear jobs that were successfully processed
    const successfulProfileIds = jobs
      .filter((_, index) => results[index].status === 'fulfilled')
      .map((job) => job.profile_id);

    if (successfulProfileIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('caas_recalculation_queue')
        .delete()
        .in('profile_id', successfulProfileIds);

      if (deleteError) {
        console.error('[caas-worker] Error clearing queue:', deleteError);
        // Don't fail the request - jobs were processed successfully
      } else {
        console.log(`[caas-worker] Cleared ${successfulProfileIds.length} jobs from queue`);
      }
    }

    // ================================================================
    // STEP 6: RETURN RESULTS
    // ================================================================
    const message = `Processed ${successCount} jobs successfully, ${failureCount} failed`;
    console.log(`[caas-worker] ${message}`);

    return NextResponse.json({
      success: true,
      message,
      processed: successCount,
      failed: failureCount,
      total: jobs.length,
    });
  } catch (error) {
    console.error('[caas-worker] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint (GET)
 * Allows monitoring the worker status and queue depth
 */
export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET for health check too
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get queue depth
    const { count, error } = await supabase
      .from('caas_recalculation_queue')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    // Get total scores in cache
    const { count: scoresCount } = await supabase
      .from('caas_scores')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      status: 'healthy',
      queue_depth: count || 0,
      total_scores_cached: scoresCount || 0,
      batch_size: 100,
      schedule: 'Every 10 minutes',
      processing_capacity: '600 updates/hour',
    });
  } catch (error) {
    console.error('[caas-worker] Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
