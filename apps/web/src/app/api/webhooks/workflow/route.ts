/**
 * POST /api/webhooks/workflow
 * Receives Supabase Database Webhook events and triggers workflow executions.
 *
 * Registered triggers (see migration 371):
 *   - profiles table UPDATE where new.status = 'under_review'
 *     → starts the Tutor Approval workflow
 *   - bookings table INSERT (any new booking)
 *     → starts Booking Lifecycle — Human Tutor (if booking is for a human tutor)
 *     → starts Booking Lifecycle — AI Tutor (if booking is for an AI agent tutor)
 *
 * Security: validates x-webhook-secret header against PROCESS_STUDIO_WEBHOOK_SECRET env var.
 *
 * Supabase trigger config (migration 371):
 *   - Table: profiles, Event: UPDATE, Filter: status=under_review
 *   - Table: bookings, Event: INSERT (all rows — engine checks execution_mode)
 *   Target URL for both: {APP_URL}/api/webhooks/workflow
 *   Headers: { x-webhook-secret: <PROCESS_STUDIO_WEBHOOK_SECRET> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/workflow/runtime/PlatformWorkflowRuntime';

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
      console.error('[workflow webhook] PROCESS_STUDIO_WEBHOOK_SECRET not set');
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

      const supabase = await createServiceRoleClient();
      const { data: process } = await supabase
        .from('workflow_processes')
        .select('id, execution_mode')
        .eq('name', 'Tutor Approval')
        .single();

      if (!process) {
        console.warn('[workflow webhook] Tutor Approval process not found — skipping');
        return NextResponse.json({ received: true, action: 'skipped', reason: 'process not found' });
      }

      if (process.execution_mode === 'design') {
        console.log('[workflow webhook] Tutor Approval is in design mode — skipping');
        return NextResponse.json({ received: true, action: 'skipped', reason: 'design mode' });
      }

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

      console.log(`[workflow webhook] Started Tutor Approval execution ${executionId} for profile ${profileId}`);

      return NextResponse.json({
        received: true,
        action: 'started',
        trigger: 'tutor_approval',
        executionId,
        profileId,
        mode: process.execution_mode,
      });
    }

    // Handle: new booking created → start Booking Lifecycle workflow
    if (table === 'bookings' && type === 'INSERT' && record) {
      const bookingId = record.id as string;
      const agentId = record.agent_id as string | null | undefined;
      const supabase = createServiceRoleClient();

      let isAiTutor = false;
      const tutorId = record.tutor_id as string | undefined;
      if (tutorId) {
        const { data: tutorProfile } = await supabase
          .from('profiles')
          .select('is_ai_agent')
          .eq('id', tutorId)
          .single();
        isAiTutor = tutorProfile?.is_ai_agent === true;
      }

      const processName = isAiTutor
        ? 'Booking Lifecycle — AI Tutor'
        : 'Booking Lifecycle — Human Tutor';

      const { data: process } = await supabase
        .from('workflow_processes')
        .select('id, execution_mode')
        .eq('name', processName)
        .single();

      if (!process) {
        console.warn(`[workflow webhook] ${processName} process not found — skipping`);
        return NextResponse.json({ received: true, action: 'skipped', reason: 'process not found' });
      }

      if (process.execution_mode === 'design') {
        console.log(`[workflow webhook] ${processName} is in design mode — skipping`);
        return NextResponse.json({ received: true, action: 'skipped', reason: 'design mode' });
      }

      const executionId = await workflowRuntime.start(process.id, {
        booking_id: bookingId,
        tutor_id: tutorId ?? null,
        client_id: record.client_id as string | null ?? null,
        agent_id: agentId ?? null,
        amount: record.amount as number | null ?? null,
        service_name: record.service_name as string | null ?? null,
        is_ai_tutor: isAiTutor,
      });

      console.log(
        `[workflow webhook] Started ${processName} execution ${executionId} ` +
        `for booking ${bookingId} (mode: ${process.execution_mode})`
      );

      return NextResponse.json({
        received: true,
        action: 'started',
        trigger: isAiTutor ? 'booking_ai_tutor' : 'booking_human_tutor',
        executionId,
        bookingId,
        mode: process.execution_mode,
      });
    }

    console.log(`[workflow webhook] Unhandled event: ${type} on ${table}`);
    return NextResponse.json({ received: true, action: 'ignored' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[workflow webhook]', message);

    // Write webhook failure exception (fire-and-forget)
    try {
      const supa = await createServiceRoleClient();
      const { writeException } = await import('@/lib/workflow/exception-writer');
      await writeException({
        supabase: supa,
        source: 'webhook_failure',
        severity: 'high',
        title: `Webhook processing failed`,
        description: message,
        sourceEntityType: 'webhook',
        context: { error: message },
      });
    } catch { /* fail-silent */ }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
