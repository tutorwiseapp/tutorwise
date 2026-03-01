/**
 * POST /api/admin/cas/resume-workflow
 *
 * Resumes a paused CAS workflow after admin approval or rejection.
 * Called from the Admin Approvals UI when an admin clicks Approve/Reject.
 *
 * Auth: Admin with cas:approve permission
 * Body: { approvalId: string, decision: 'approved' | 'rejected', comments?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 300; // 5 minutes — workflow resume can take time

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin + cas:approve permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check granular permission via RPC
    const { data: hasPermission } = await supabase.rpc('has_admin_permission', {
      p_user_id: user.id,
      p_resource: 'cas',
      p_action: 'approve',
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: cas:approve permission required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { approvalId, decision, comments } = body;

    if (!approvalId || !decision) {
      return NextResponse.json(
        { error: 'Missing required fields: approvalId, decision' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Look up the approval request to get the workflow ID
    const { data: approvalRequest, error: lookupError } = await supabase
      .from('cas_approval_requests')
      .select('*')
      .eq('id', approvalId)
      .single();

    if (lookupError || !approvalRequest) {
      return NextResponse.json(
        { error: `Approval request not found: ${approvalId}` },
        { status: 404 }
      );
    }

    if (approvalRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Approval already ${approvalRequest.status}` },
        { status: 409 }
      );
    }

    // Update the approval request status
    const { error: updateError } = await supabase
      .from('cas_approval_requests')
      .update({
        status: decision,
        approved_by: user.id,
        comments: comments || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', approvalId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update approval: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Resume the workflow
    const workflowId = approvalRequest.workflow_id;

    try {
      // Dynamic import to avoid loading CAS modules at build time
      const { resumePlanningWorkflow } = await import(
        '@cas/packages/core/src/workflows/PlanningGraph'
      );

      const result = await resumePlanningWorkflow({
        workflowId,
        decision,
      });

      return NextResponse.json({
        success: true,
        approvalId,
        workflowId,
        decision,
        workflowStatus: result.status,
        completedSteps: result.state?.completedSteps,
      });
    } catch (resumeError: any) {
      console.error(`[Resume Workflow] Failed to resume workflow ${workflowId}:`, resumeError);

      // The approval status is already updated — workflow resume failed
      return NextResponse.json({
        success: false,
        approvalId,
        workflowId,
        decision,
        error: `Workflow resume failed: ${resumeError.message}`,
        note: 'Approval status was updated but workflow did not resume. Check logs.',
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Resume Workflow] Unexpected error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
