/**
 * Filename: apps/web/src/lib/integrations/jira-service-desk-sync.ts
 * Purpose: Jira Service Desk integration for help centre bug reports
 * Created: 2025-12-21
 * Phase: Help Centre Phase 3 - Service Desk request creation
 */

import { createClient } from '@/utils/supabase/server';

interface SnapshotData {
  id: string;
  user_id: string;
  action: string;
  issue: string;
  impact: 'blocking' | 'degraded' | 'minor';
  page_url: string;
  page_title: string;
  user_role?: string;
  screenshot_url?: string;
  capture_level: string;
  created_at: string;
}

interface ServiceDeskRequestResponse {
  issueId: string;
  issueKey: string;
  requestTypeId: string;
  serviceDeskId: string;
  createdDate: string;
  reporter: any;
  requestFieldValues: any[];
  currentStatus: any;
  _links: {
    jiraRest: string;
    web: string;
    self: string;
  };
}

/**
 * Creates a Jira Service Desk request from a support snapshot
 * This function should be called from a server-side context (API route or Edge Function)
 */
export async function createServiceDeskRequestFromSnapshot(
  snapshot: SnapshotData
): Promise<{ issueKey: string; issueUrl: string }> {
  const {
    JIRA_BASE_URL,
    JIRA_EMAIL,
    JIRA_API_TOKEN,
    JIRA_SERVICE_DESK_ID,
    JIRA_REQUEST_TYPE_ID,
  } = process.env;

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    throw new Error('Jira credentials not configured');
  }

  if (!JIRA_SERVICE_DESK_ID || !JIRA_REQUEST_TYPE_ID) {
    throw new Error('Service Desk configuration missing (JIRA_SERVICE_DESK_ID or JIRA_REQUEST_TYPE_ID)');
  }

  // Create Basic Auth header
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

  // Map impact to Jira priority
  const _priorityMap: Record<string, string> = {
    blocking: '1',    // Highest
    degraded: '2',    // High
    minor: '3',       // Medium
  };

  // Build request summary (maps to "What is your question or general request?")
  const summary = `[Help Centre] ${snapshot.action}`;

  // Build detailed description
  let description = `**User Report**\n\n`;
  description += `**Action:** ${snapshot.action}\n`;
  description += `**Issue:** ${snapshot.issue}\n`;
  description += `**Impact:** ${snapshot.impact}\n\n`;
  description += `---\n\n`;
  description += `**Context**\n\n`;
  description += `**Page:** [${snapshot.page_title}](${snapshot.page_url})\n`;
  description += `**User Role:** ${snapshot.user_role || 'Unknown'}\n`;
  description += `**Capture Level:** ${snapshot.capture_level}\n`;

  if (snapshot.screenshot_url) {
    description += `**Screenshot:** [View Screenshot](${snapshot.screenshot_url})\n`;
  }

  description += `\n---\n\n`;
  description += `*Snapshot ID: \`${snapshot.id}\`*`;

  // Build Service Desk request payload
  // Note: Priority field is not available for "Ask a question" request type
  // Support team will set priority manually based on impact shown in description
  const requestData = {
    serviceDeskId: JIRA_SERVICE_DESK_ID,
    requestTypeId: JIRA_REQUEST_TYPE_ID,
    requestFieldValues: {
      summary: summary,
      description: description,
      // priority not supported by current request type
    },
  };

  try {
    // Create Service Desk request
    const response = await fetch(
      `${JIRA_BASE_URL}/rest/servicedeskapi/request`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Service Desk request creation failed:', errorText);
      throw new Error(`Service Desk API error: ${response.status} - ${errorText}`);
    }

    const result: ServiceDeskRequestResponse = await response.json();
    const issueKey = result.issueKey;
    const issueUrl = result._links.web;

    console.log(`✓ Created Service Desk request: ${issueKey}`);

    // Update snapshot with Jira info
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('help_support_snapshots')
      .update({
        jira_ticket_key: issueKey,
        jira_ticket_url: issueUrl,
        jira_sync_status: 'synced',
        jira_synced_at: new Date().toISOString(),
      })
      .eq('id', snapshot.id);

    if (updateError) {
      console.error('Failed to update snapshot with Jira info:', updateError);
    }

    return { issueKey, issueUrl };
  } catch (error) {
    console.error('Service Desk integration error:', error);

    // Mark as failed in database
    const supabase = await createClient();
    await supabase
      .from('help_support_snapshots')
      .update({
        jira_sync_status: 'failed',
        jira_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', snapshot.id);

    throw error;
  }
}

/**
 * Background job to sync pending snapshots to Jira Service Desk
 * This should be called periodically (e.g., via cron job or Supabase Edge Function)
 */
export async function syncPendingSnapshotsToServiceDesk(): Promise<void> {
  const supabase = await createClient();

  // Get pending snapshots
  const { data: snapshots, error } = await supabase
    .from('help_support_snapshots')
    .select('*')
    .eq('jira_sync_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Failed to fetch pending snapshots:', error);
    return;
  }

  if (!snapshots || snapshots.length === 0) {
    console.log('No pending snapshots to sync');
    return;
  }

  console.log(`Syncing ${snapshots.length} pending snapshots to Service Desk...`);

  for (const snapshot of snapshots) {
    try {
      await createServiceDeskRequestFromSnapshot(snapshot);
      console.log(`✓ Synced snapshot ${snapshot.id}`);
    } catch (error) {
      console.error(`✗ Failed to sync snapshot ${snapshot.id}:`, error);
      // Continue with next snapshot
    }
  }

  console.log('Service Desk sync completed');
}
