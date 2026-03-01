/**
 * Filename: apps/web/src/app/api/cron/cas-dspy-optimize/route.ts
 * Purpose: Weekly DSPy optimization triggered by Supabase pg_cron
 * Created: 2026-02-28
 *
 * Called by pg_cron every Sunday at 2am UTC to optimize AI tutor prompts
 * using accumulated user feedback from the ai_feedback table.
 *
 * Pattern: Same as weekly-reports, session-reminders, and other cron routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — DSPy optimization can take a while

/**
 * GET /api/cron/cas-dspy-optimize
 * Triggers weekly DSPy optimization for Sage and Lexi prompts.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[CAS DSPy] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[CAS DSPy] Starting weekly optimization...');
  const startTime = Date.now();

  try {
    // Resolve the script path relative to the project root
    const projectRoot = path.resolve(process.cwd());
    const scriptPath = path.join(projectRoot, 'cas/optimization/schedule_weekly.sh');

    // Execute the optimization script
    const { stdout, stderr } = await execAsync(
      `bash "${scriptPath}"`,
      {
        cwd: path.join(projectRoot, 'cas/optimization'),
        timeout: 270_000, // 4.5 minutes (leave buffer for response)
        env: {
          ...process.env,
          PATH: `/opt/homebrew/opt/node@22/bin:/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:${process.env.PATH}`,
        },
      }
    );

    const duration = Date.now() - startTime;
    console.log(`[CAS DSPy] Optimization completed in ${duration}ms`);

    if (stderr) {
      console.warn('[CAS DSPy] stderr:', stderr);
    }

    // Try to persist event (non-critical)
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('cas_agent_events').insert({
          agent_id: 'dspy',
          event_type: 'weekly_optimization_complete',
          event_data: { duration, stdout: stdout.substring(0, 1000) },
        });
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      duration,
      output: stdout.substring(0, 2000),
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[CAS DSPy] Optimization failed after ${duration}ms:`, error.message);

    return NextResponse.json({
      success: false,
      duration,
      error: error.message,
      stderr: error.stderr?.substring(0, 1000),
    }, { status: 500 });
  }
}
