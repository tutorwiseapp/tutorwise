/**
 * Filename: apps/web/src/app/api/help-centre/support/snapshot/route.ts
 * Purpose: API endpoint for submitting help centre support snapshots
 * Created: 2025-01-21
 * Phase: Help Centre Phase 3 - Context-driven bug reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface SnapshotSubmission {
  action: string;
  issue: string;
  impact: 'blocking' | 'degraded' | 'minor';
  captureLevel: 'minimal' | 'standard' | 'diagnostic';
  includeScreenshot: boolean;
  includeNetwork: boolean;
  screenshot?: string; // Base64 data URL
  pageContext: {
    url: string;
    title: string;
    userRole?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: SnapshotSubmission = await request.json();
    const {
      action,
      issue,
      impact,
      captureLevel,
      screenshot,
      includeNetwork,
      pageContext,
    } = body;

    // Validate required fields
    if (!action || !issue || !impact || !captureLevel || !pageContext) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Upload screenshot to storage if provided
    let screenshot_url: string | null = null;
    if (screenshot && screenshot.startsWith('data:image')) {
      try {
        // Extract base64 data
        const base64Data = screenshot.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${user.id}/${timestamp}.png`;

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('support-snapshots')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false,
          });

        if (uploadError) {
          console.error('Screenshot upload error:', uploadError);
          // Continue without screenshot rather than failing
        } else if (uploadData) {
          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from('support-snapshots').getPublicUrl(fileName);
          screenshot_url = publicUrl;
        }
      } catch (uploadErr) {
        console.error('Screenshot processing error:', uploadErr);
        // Continue without screenshot
      }
    }

    // Capture network logs if requested (placeholder for now)
    let network_logs: any = null;
    if (includeNetwork) {
      // TODO: Implement network logs capture from client-side Performance API
      network_logs = {
        note: 'Network logs capture to be implemented',
        timestamp: new Date().toISOString(),
      };
    }

    // Get user profile for role information
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_role')
      .eq('id', user.id)
      .single();

    // Capture additional context
    const user_agent = request.headers.get('user-agent') || 'Unknown';
    const viewport_size = `${request.headers.get('sec-ch-viewport-width') || ''}x${request.headers.get('sec-ch-viewport-height') || ''}`;

    // Create snapshot record
    const { data: snapshot, error: insertError } = await supabase
      .from('help_support_snapshots')
      .insert({
        user_id: user.id,
        action: action.trim(),
        issue: issue.trim(),
        impact,
        capture_level: captureLevel,
        page_url: pageContext.url,
        page_title: pageContext.title,
        user_role: profile?.active_role || pageContext.userRole,
        screenshot_url,
        network_logs,
        user_agent,
        viewport_size,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Snapshot insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create snapshot' },
        { status: 500 }
      );
    }

    // Create Service Desk request immediately
    // Note: This runs synchronously. For high-volume apps, consider background processing.
    try {
      const { createServiceDeskRequestFromSnapshot } = await import(
        '@/lib/integrations/jira-service-desk-sync'
      );
      const { issueKey, issueUrl } = await createServiceDeskRequestFromSnapshot(snapshot);

      return NextResponse.json({
        success: true,
        snapshot_id: snapshot.id,
        jira_ticket_key: issueKey,
        jira_ticket_url: issueUrl,
        message: 'Bug report submitted successfully',
      });
    } catch (jiraError) {
      // Snapshot was saved, but Jira sync failed
      console.error('Jira Service Desk sync failed:', jiraError);

      // Still return success - snapshot is in database for later sync
      return NextResponse.json({
        success: true,
        snapshot_id: snapshot.id,
        message: 'Bug report submitted successfully (Jira sync pending)',
        warning: 'Ticket creation will be retried in background',
      });
    }
  } catch (error) {
    console.error('Snapshot submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
