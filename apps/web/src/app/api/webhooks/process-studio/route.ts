/**
 * POST /api/webhooks/process-studio
 * Receives Supabase Database Webhook events and triggers workflow executions.
 *
 * Current triggers:
 *   - profiles table UPDATE where new.status = 'under_review'
 *     → starts the Tutor Approval workflow
 *
 * Security: validates x-webhook-secret header against PROCESS_STUDIO_WEBHOOK_SECRET env var.
 *
 * Supabase Dashboard config:
 *   Table: profiles, Event: UPDATE, Filter: status=under_review
 *   Target URL: {APP_URL}/api/webhooks/process-studio
 *   Headers: { x-webhook-secret: <PROCESS_STUDIO_WEBHOOK_SECRET> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/process-studio/runtime/PlatformWorkflowRuntime';

export const dynamic = 'force-dynamic';

interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const secret = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.PROCESS_STUDIO_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('[process-studio webhook] PROCESS_STUDIO_WEBHOOK_SECRET not set');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json() as SupabaseWebhookPayload;
    const { type, table, record, old_record } = payload;

    // Handle: profiles status changed to 'under_review' → start Tutor Approval
    if (
      table === 'profiles' &&
      type === 'UPDATE' &&
      record?.status === 'under_review' &&
      old_record?.status !== 'under_review'
    ) {
      const profileId = record.id as string;
      const email = record.email as string | undefined;

      // Look up the Tutor Approval process
      const supabase = await createServiceRoleClient();
      const { data: process } = await supabase
        .from('workflow_processes')
        .select('id, execution_mode')
        .eq('name', 'Tutor Approval')
        .single();

      if (!process) {
        console.warn('[process-studio webhook] Tutor Approval process not found — skipping');
        return NextResponse.json({ received: true, action: 'skipped', reason: 'process not found' });
      }

      if (process.execution_mode === 'design') {
        console.log('[process-studio webhook] Tutor Approval is in design mode — skipping');
        return NextResponse.json({ received: true, action: 'skipped', reason: 'design mode' });
      }

      // Resolve email if not present in profile record
      let tutorEmail = email;
      if (!tutorEmail) {
        const { data: authUser } = await supabase.auth.admin.getUserById(profileId);
        tutorEmail = authUser?.user?.email;
      }

      const executionId = await workflowRuntime.start(process.id, {
        profile_id: profileId,
        email: tutorEmail,
        caas_score: 0,
        is_shadow: process.execution_mode === 'shadow',
      });

      console.log(`[process-studio webhook] Started Tutor Approval execution ${executionId} for profile ${profileId}`);

      return NextResponse.json({
        received: true,
        action: 'started',
        trigger: 'tutor_approval',
        executionId,
        profileId,
        mode: process.execution_mode,
      });
    }

    // Unhandled event — log and ack
    console.log(`[process-studio webhook] Unhandled event: ${type} on ${table}`);
    return NextResponse.json({ received: true, action: 'ignored' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[process-studio webhook]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
