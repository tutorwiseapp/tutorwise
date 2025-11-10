/**
 * Filename: apps/web/src/app/api/network/invite-by-email/route.ts
 * Purpose: Invite users by email (existing users = connection request, new users = referral link)
 * Created: 2025-11-07
 * Specification: SDD v4.5, Section 3.2.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { sendConnectionInvitation } from '@/lib/email';
import { z } from 'zod';

const InviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and referral code
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, referral_code, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.referral_code) {
      return NextResponse.json(
        { error: 'Referral code not found' },
        { status: 400 }
      );
    }

    // Rate limiting (50 invites per day)
    const rateLimit = await checkRateLimit(user.id, 'network:invite');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimit),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt)
        }
      );
    }

    // Validate emails
    const body = await request.json();
    const validation = InviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid emails', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { emails } = validation.data;

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
        // Call the /api/network/request endpoint
        const requestResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/network/request`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({ receiver_ids: existingUserIds }),
          }
        );

        if (requestResponse.ok) {
          const data = await requestResponse.json();
          results.connection_requests_sent = data.count || existingUserIds.length;
        } else {
          results.errors.push('Some connection requests failed to send');
        }
      } catch (error) {
        console.error('[invite-by-email] Connection request error:', error);
        results.errors.push('Failed to send connection requests');
      }
    }

    // For new emails, send invitation with referral link
    if (newEmails.length > 0) {
      const referralUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/a/${profile.referral_code}?redirect=/network`;

      // Send email invitations via Resend
      const emailPromises = newEmails.map(async (email) => {
        try {
          await sendConnectionInvitation({
            to: email,
            senderName: profile.full_name,
            referralUrl,
          });
          return { email, success: true };
        } catch (error) {
          console.error(`[invite-by-email] Failed to send to ${email}:`, error);
          return { email, success: false, error };
        }
      });

      const emailResults = await Promise.all(emailPromises);
      const successfulSends = emailResults.filter((r) => r.success).map((r) => r.email);
      const failedSends = emailResults.filter((r) => !r.success);

      if (failedSends.length > 0) {
        console.warn('[invite-by-email] Failed sends:', failedSends);
        results.errors.push(`Failed to send ${failedSends.length} email(s)`);
      }

      // Log analytics for successful sends (using service_role to bypass RLS)
      const supabaseAdmin = await createClient();

      if (successfulSends.length > 0) {
        try {
          await supabaseAdmin.from('network_analytics').insert(
            successfulSends.map(email => ({
              profile_id: user.id,
              event_type: 'invite_sent',
              event_data: { email, via: 'email_invitation' },
              referral_code: profile.referral_code,
            }))
          );
        } catch (analyticsError) {
          console.error('[invite-by-email] Analytics error:', analyticsError);
          // Non-blocking error
        }
      }

      results.sent = successfulSends.length;
    }

    return NextResponse.json(
      {
        success: true,
        ...results,
        message: `Sent ${results.sent} invitation(s) and ${results.connection_requests_sent} connection request(s)`,
      },
      {
        headers: rateLimitHeaders(rateLimit.remaining - emails.length, rateLimit.resetAt)
      }
    );

  } catch (error) {
    console.error('[invite-by-email] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
