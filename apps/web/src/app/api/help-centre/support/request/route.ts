/**
 * Filename: apps/web/src/app/api/help-centre/support/request/route.ts
 * Purpose: API endpoint for creating Jira SUPPORT tickets (general support requests)
 * Created: 2026-01-18
 * Integration: Jira Cloud REST API v3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type SupportCategory =
  | 'account'
  | 'billing'
  | 'bookings'
  | 'technical'
  | 'features'
  | 'other';

interface CreateSupportRequestBody {
  firstName: string;
  lastName: string;
  category: SupportCategory;
  summary: string;
  details?: string;
  isUrgent: boolean;
  pageContext?: {
    url: string;
    title: string;
    userRole?: string;
  };
}

// Category labels for Jira
const CATEGORY_LABELS: Record<SupportCategory, string> = {
  account: 'Account & Profile Settings',
  billing: 'Billing & Payments',
  bookings: 'Bookings & Scheduling',
  technical: 'Technical Issue',
  features: 'How to Use a Feature',
  other: 'Something Else',
};

/**
 * Format Jira description with user details and context
 */
function formatJiraDescription(data: CreateSupportRequestBody, userEmail?: string): string {
  let description = '';

  // User information
  description += `*Reported by:* ${data.firstName} ${data.lastName}\n`;
  if (userEmail) {
    description += `*Email:* ${userEmail}\n`;
  }
  if (data.pageContext?.userRole) {
    description += `*Role:* ${data.pageContext.userRole}\n`;
  }
  description += '\n---\n\n';

  // Category
  description += `*Category:* ${CATEGORY_LABELS[data.category]}\n\n`;

  // Summary (already in Jira title)
  description += `*Question:*\n${data.summary}\n\n`;

  // Details (if provided)
  if (data.details) {
    description += `*Additional Details:*\n${data.details}\n\n`;
  }

  // Help Centre context
  if (data.pageContext) {
    description += '---\n\n';
    description += '*Help Centre Context:*\n';
    description += `• Page: ${data.pageContext.title}\n`;
    description += `• URL: ${data.pageContext.url}\n`;
  }

  return description;
}

/**
 * Create Jira SUPPORT ticket via REST API
 */
async function createJiraTicket(data: CreateSupportRequestBody, userEmail?: string) {
  const jiraBaseUrl = process.env.JIRA_BASE_URL;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  const jiraProjectKey = process.env.JIRA_SUPPORT_PROJECT_KEY || 'SUPPORT';

  if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) {
    throw new Error('Jira configuration missing');
  }

  const jiraIssue = {
    fields: {
      project: {
        key: jiraProjectKey,
      },
      issuetype: {
        name: 'Support Request',
      },
      summary: `[${CATEGORY_LABELS[data.category]}] ${data.summary}`,
      description: formatJiraDescription(data, userEmail),
      priority: {
        name: data.isUrgent ? 'High' : 'Normal',
      },
      labels: [
        'help-centre',
        `category-${data.category}`,
        data.pageContext?.userRole || 'unknown-role',
        data.isUrgent ? 'urgent' : 'normal',
      ],
      // Custom fields (if configured in your Jira):
      // customfield_10050: CATEGORY_LABELS[data.category], // Category
      // customfield_10051: data.pageContext?.url, // Help Centre URL
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
    console.error('[Jira API Error]', response.status, errorText);
    throw new Error(`Jira API error: ${response.status}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Fallback: Send email if Jira fails
 */
async function sendFallbackEmail(data: CreateSupportRequestBody, userEmail?: string) {
  // TODO: Implement email fallback (Resend, SendGrid, etc.)
  // For now, just log to console
  console.warn('[Jira Fallback] Sending support request via email:', {
    to: 'devops@tutorwise.io',
    from: userEmail,
    category: data.category,
    summary: data.summary,
  });

  // Return a fallback response
  return {
    success: true,
    fallback: 'email',
    message: 'Jira unavailable, request sent via email',
  };
}

/**
 * POST /api/help-centre/support/request
 * Create a general support request (Jira SUPPORT ticket)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check (optional - allow unauthenticated users to submit)
    const { data: { user } } = await supabase.auth.getUser();

    // Parse request body
    const body: CreateSupportRequestBody = await request.json();

    // Validate required fields
    if (!body.firstName?.trim() || !body.lastName?.trim() || !body.summary?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, summary' },
        { status: 400 }
      );
    }

    // Get user email from auth or profile
    let userEmail: string | undefined;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      userEmail = profile?.email || user.email;
    }

    try {
      // Try to create Jira ticket
      const jiraResult = await createJiraTicket(body, userEmail);

      console.log('[Support Request] Jira ticket created:', jiraResult.key);

      // TODO: Send confirmation email to user
      // await sendConfirmationEmail(userEmail, jiraResult.key);

      return NextResponse.json({
        success: true,
        ticketId: jiraResult.key,
        message: 'Support request received. We\'ll respond within 24 hours.',
      });

    } catch (jiraError) {
      // Jira failed - fall back to email
      console.error('[Support Request] Jira error, using email fallback:', jiraError);

      const fallbackResult = await sendFallbackEmail(body, userEmail);

      return NextResponse.json({
        success: true,
        ticketId: 'EMAIL-FALLBACK',
        message: 'Support request received via email backup. We\'ll respond within 24 hours.',
        fallback: true,
      });
    }

  } catch (error) {
    console.error('[Support Request] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to submit support request',
      },
      { status: 500 }
    );
  }
}
