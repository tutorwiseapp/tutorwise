/**
 * Filename: apps/web/src/lib/integrations/jira-snapshot-sync.ts
 * Purpose: Jira integration for help centre bug reports
 * Created: 2025-01-21
 * Phase: Help Centre Phase 3 - Jira ticket creation
 */

import { createClient } from '@/utils/supabase/client';

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

interface JiraTicketResponse {
  ticketKey: string;
  ticketUrl: string;
}

/**
 * Determines which Jira project to use based on snapshot data
 *
 * Routing logic:
 * - Help Centre snapshots → SUPPORT (Support project)
 * - Other application bugs → TUTOR (Main development project)
 *
 * You can customize this logic based on:
 * - snapshot.impact (route blocking issues to TUTOR)
 * - snapshot.page_url (route specific pages to different projects)
 * - snapshot.user_role (route admin issues differently)
 *
 * Examples:
 * ```typescript
 * // Route blocking issues to main dev team
 * if (snapshot.impact === 'blocking') {
 *   return JIRA_PROJECT_KEY;
 * }
 *
 * // Route by page URL
 * if (snapshot.page_url.includes('/admin')) {
 *   return JIRA_PROJECT_KEY;
 * }
 *
 * // Default to support project
 * return JIRA_SUPPORT_PROJECT_KEY;
 * ```
 */
function getJiraProjectKey(snapshot: SnapshotData): string {
  const {
    JIRA_PROJECT_KEY = 'TUTOR',
    JIRA_SUPPORT_PROJECT_KEY = 'SUPPORT',
  } = process.env;

  // All Help Centre snapshots go to Support project by default
  // Customize this logic based on your team's workflow
  return JIRA_SUPPORT_PROJECT_KEY;
}

/**
 * Creates a Jira ticket from a support snapshot
 * This function should be called from a server-side context (API route or Edge Function)
 */
export async function createJiraTicketFromSnapshot(
  snapshot: SnapshotData,
  options?: { projectKey?: string }
): Promise<JiraTicketResponse> {
  const {
    JIRA_BASE_URL,
    JIRA_EMAIL,
    JIRA_API_TOKEN,
  } = process.env;

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    throw new Error('Jira credentials not configured');
  }

  // Determine which project to use
  const projectKey = options?.projectKey || getJiraProjectKey(snapshot);

  // Create Basic Auth header
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
    'base64'
  );

  // Map impact to Jira priority
  const priorityMap = {
    blocking: 'Highest',
    degraded: 'High',
    minor: 'Medium',
  };

  // Build Jira issue description using Atlassian Document Format (ADF)
  const descriptionContent: any[] = [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'User Report' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Action: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: snapshot.action },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Issue: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: snapshot.issue },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Impact: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: snapshot.impact },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Context' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Page: ', marks: [{ type: 'strong' }] },
        {
          type: 'text',
          text: snapshot.page_title,
          marks: [
            {
              type: 'link',
              attrs: { href: snapshot.page_url },
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'User Role: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: snapshot.user_role || 'Unknown' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Capture Level: ', marks: [{ type: 'strong' }] },
        { type: 'text', text: snapshot.capture_level },
      ],
    },
  ];

  // Add screenshot link if available
  if (snapshot.screenshot_url) {
    descriptionContent.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Screenshot: ', marks: [{ type: 'strong' }] },
        {
          type: 'text',
          text: 'View Screenshot',
          marks: [
            {
              type: 'link',
              attrs: { href: snapshot.screenshot_url },
            },
          ],
        },
      ],
    });
  }

  // Add snapshot ID reference
  descriptionContent.push(
    {
      type: 'rule',
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Snapshot ID: ', marks: [{ type: 'code' }] },
        { type: 'text', text: snapshot.id, marks: [{ type: 'code' }] },
      ],
    }
  );

  // Build Jira issue payload
  const issueData = {
    fields: {
      project: { key: projectKey },
      summary: `[Help Centre] ${snapshot.action}`,
      description: {
        type: 'doc',
        version: 1,
        content: descriptionContent,
      },
      issuetype: { name: 'Bug' },
      priority: {
        name: priorityMap[snapshot.impact],
      },
      labels: [
        'help-centre-bug-report',
        'user-submitted',
        `impact-${snapshot.impact}`,
        `capture-${snapshot.capture_level}`,
      ],
    },
  };

  try {
    // Create Jira ticket
    const response = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issueData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira ticket creation failed:', errorText);
      throw new Error(`Jira API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const ticketKey = result.key;
    const ticketUrl = `${JIRA_BASE_URL}/browse/${ticketKey}`;

    console.log(`✓ Created Jira ticket: ${ticketKey}`);

    // Update snapshot with Jira info
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('help_support_snapshots')
      .update({
        jira_ticket_key: ticketKey,
        jira_ticket_url: ticketUrl,
        jira_sync_status: 'synced',
        jira_synced_at: new Date().toISOString(),
      })
      .eq('id', snapshot.id);

    if (updateError) {
      console.error('Failed to update snapshot with Jira info:', updateError);
    }

    return { ticketKey, ticketUrl };
  } catch (error) {
    console.error('Jira integration error:', error);

    // Mark as failed in database
    const supabase = createClient();
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
 * Background job to sync pending snapshots to Jira
 * This should be called periodically (e.g., via cron job or Supabase Edge Function)
 */
export async function syncPendingSnapshotsToJira(): Promise<void> {
  const supabase = createClient();

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

  console.log(`Syncing ${snapshots.length} pending snapshots to Jira...`);

  for (const snapshot of snapshots) {
    try {
      await createJiraTicketFromSnapshot(snapshot);
      console.log(`✓ Synced snapshot ${snapshot.id}`);
    } catch (error) {
      console.error(`✗ Failed to sync snapshot ${snapshot.id}:`, error);
      // Continue with next snapshot
    }
  }

  console.log('Jira sync completed');
}
