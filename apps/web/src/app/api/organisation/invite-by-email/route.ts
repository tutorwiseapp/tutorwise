/**
 * Filename: apps/web/src/app/api/organisation/invite-by-email/route.ts
 * Purpose: Bulk invite users by email to join an organisation (v6.2)
 * Created: 2025-11-21
 *
 * Flow:
 * - Accept array of emails
 * - Check which emails are existing users
 * - Send connection requests to existing users (with org metadata)
 * - Send invitation emails to new users (with org referral link)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { sendOrganisationInvitation } from '@/lib/email';
import { z } from 'zod';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

const InviteSchema = z.object({
  organisationId: z.string().uuid(),
  emails: z.array(z.string().email()).min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validation = InviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { organisationId, emails } = validation.data;

    // Verify user owns this organisation
    const { data: organisation, error: orgError } = await supabase
      .from('connection_groups')
      .select('id, name, profile_id')
      .eq('id', organisationId)
      .eq('type', 'organisation')
      .eq('profile_id', user.id)
      .single();

    if (orgError || !organisation) {
      return NextResponse.json(
        { error: 'Organisation not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get inviter's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, referral_code, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.referral_code) {
      return NextResponse.json(
        { error: 'Profile or referral code not found' },
        { status: 400 }
      );
    }

    // Rate limiting (50 invites per day)
    const rateLimit = await checkRateLimit(user.id, 'organisation:invite');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimit),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt)
        }
      );
    }

    // Check which emails are existing users
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('email', emails);

    const existingEmails = new Set(existingUsers?.map(u => u.email) || []);
    const newEmails = emails.filter(email => !existingEmails.has(email));
    const existingUserIds = existingUsers?.map(u => u.id) || [];

    const results = {
      sent: 0,
      connection_requests_sent: 0,
      errors: [] as string[],
    };

    // For existing users, send connection requests via internal API call
    if (existingUserIds.length > 0) {
      try {
        // Call the /api/organisation/invite-users endpoint
        const requestResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/organisation/invite-users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              organisationId,
              user_ids: existingUserIds,
            }),
          }
        );

        if (requestResponse.ok) {
          const data = await requestResponse.json();
          results.connection_requests_sent = data.count || existingUserIds.length;
        } else {
          results.errors.push('Some connection requests failed to send');
        }
      } catch (error) {
        console.error('[organisation/invite-by-email] Connection request error:', error);
        results.errors.push('Failed to send connection requests');
      }
    }

    // For new emails, send invitation with organisation referral link
    if (newEmails.length > 0) {
      const referralUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/a/${profile.referral_code}?redirect=/organisation`;

      // Send email invitations via Resend
      const emailPromises = newEmails.map(async (email) => {
        try {
          await sendOrganisationInvitation({
            to: email,
            senderName: profile.full_name,
            organisationName: organisation.name,
            referralUrl,
          });
          return { email, success: true };
        } catch (error) {
          console.error(`[organisation/invite-by-email] Failed to send to ${email}:`, error);
          return { email, success: false, error };
        }
      });

      const emailResults = await Promise.all(emailPromises);
      const successfulSends = emailResults.filter((r) => r.success).map((r) => r.email);
      const failedSends = emailResults.filter((r) => !r.success);

      if (failedSends.length > 0) {
        console.warn('[organisation/invite-by-email] Failed sends:', failedSends);
        results.errors.push(`Failed to send ${failedSends.length} email(s)`);
      }

      // Log analytics for successful sends
      if (successfulSends.length > 0) {
        try {
          await supabase.from('network_analytics').insert(
            successfulSends.map(email => ({
              profile_id: user.id,
              event_type: 'organisation_invite_sent',
              event_data: {
                email,
                organisation_id: organisationId,
                organisation_name: organisation.name,
                via: 'email_invitation'
              },
              referral_code: profile.referral_code,
            }))
          );
        } catch (analyticsError) {
          console.error('[organisation/invite-by-email] Analytics error:', analyticsError);
          // Non-blocking error
        }
      }

      results.sent = successfulSends.length;
    }

    return NextResponse.json(
      {
        success: true,
        sent_count: results.sent + results.connection_requests_sent,
        ...results,
        message: `Sent ${results.sent} invitation request(s) and ${results.connection_requests_sent} connection request(s)`,
      },
      {
        headers: rateLimitHeaders(rateLimit.remaining - emails.length, rateLimit.resetAt)
      }
    );

  } catch (error) {
    console.error('[organisation/invite-by-email] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
