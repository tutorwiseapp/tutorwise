/**
 * Jira Ticket Creation for Lexi
 *
 * Creates Jira SUPPORT tickets from Lexi chat conversations.
 * Reuses the same Jira REST API v3 pattern as the Help Centre support request route.
 *
 * Required env vars: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_SUPPORT_PROJECT_KEY
 *
 * @module lib/integrations/jira-lexi-sync
 */

// --- Types ---

export type JiraSupportCategory =
  | 'account'
  | 'billing'
  | 'bookings'
  | 'technical'
  | 'features'
  | 'other';

export interface LexiJiraTicketParams {
  firstName: string;
  lastName: string;
  email?: string;
  userRole?: string;
  category: JiraSupportCategory;
  summary: string;
  details?: string;
  isUrgent: boolean;
}

export interface LexiJiraTicketResult {
  ticketKey: string;
  ticketUrl: string;
}

// --- Category Labels (matches help-centre/support/request/route.ts) ---

const CATEGORY_LABELS: Record<JiraSupportCategory, string> = {
  account: 'Account & Profile Settings',
  billing: 'Billing & Payments',
  bookings: 'Bookings & Scheduling',
  technical: 'Technical Issue',
  features: 'How to Use a Feature',
  other: 'Something Else',
};

// --- Jira Description Formatter ---

function formatDescription(params: LexiJiraTicketParams): string {
  let description = '';

  description += `*Reported by:* ${params.firstName} ${params.lastName}\n`;
  if (params.email) {
    description += `*Email:* ${params.email}\n`;
  }
  if (params.userRole) {
    description += `*Role:* ${params.userRole}\n`;
  }
  description += `*Source:* Lexi Chat\n`;
  description += '\n---\n\n';

  description += `*Category:* ${CATEGORY_LABELS[params.category]}\n\n`;
  description += `*Issue:*\n${params.summary}\n\n`;

  if (params.details) {
    description += `*Additional Details:*\n${params.details}\n\n`;
  }

  return description;
}

// --- Main Function ---

export async function createJiraTicketFromLexi(
  params: LexiJiraTicketParams
): Promise<LexiJiraTicketResult> {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  const jiraProjectKey = process.env.JIRA_SUPPORT_PROJECT_KEY || 'SUPPORT';

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    throw new Error('Jira configuration missing (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)');
  }

  const jiraIssue = {
    fields: {
      project: {
        key: jiraProjectKey,
      },
      issuetype: {
        name: 'Support Request',
      },
      summary: `[${CATEGORY_LABELS[params.category]}] ${params.summary}`,
      description: formatDescription(params),
      priority: {
        name: params.isUrgent ? 'High' : 'Normal',
      },
      labels: [
        'lexi-submitted',
        `category-${params.category}`,
        params.userRole || 'unknown-role',
        params.isUrgent ? 'urgent' : 'normal',
      ],
    },
  };

  const authString = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');

  const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(jiraIssue),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Jira Lexi Sync] API error:', response.status, errorText);
    throw new Error(`Jira API error: ${response.status}`);
  }

  const result = await response.json();

  console.log('[Jira Lexi Sync] Ticket created:', result.key);

  return {
    ticketKey: result.key,
    ticketUrl: `${jiraBaseUrl}/browse/${result.key}`,
  };
}
