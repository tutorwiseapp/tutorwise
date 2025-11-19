/**
 * Filename: apps/web/src/app/api/organisation/invite/route.ts
 * Purpose: Invite members to join an organisation (v6.1)
 * Created: 2025-11-19
 * Reference: organisation-solution-design-v6.md
 *
 * Flow:
 * - Existing users: Send connection request + add to organisation group
 * - New users: Send email invitation with referral link
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { sendConnectionInvitation } from '@/lib/email';
import { z } from 'zod';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

const InviteSchema = z.object({
  organisationId: z.string().uuid(),
  email: z.string().email(),
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

    const { organisationId, email } = validation.data;

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

    // Check if email belongs to an existing user
    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    if (invitedUser) {
      // Existing user: Send connection request
      try {
        // First, check if they're already connected
        const { data: existingConnection } = await supabase
          .from('profile_graph')
          .select('id, status')
          .eq('relationship_type', 'SOCIAL')
          .or(`and(source_profile_id.eq.${user.id},target_profile_id.eq.${invitedUser.id}),and(source_profile_id.eq.${invitedUser.id},target_profile_id.eq.${user.id})`)
          .maybeSingle();

        if (existingConnection) {
          if (existingConnection.status === 'ACTIVE') {
            return NextResponse.json(
              { success: true, message: 'User is already connected and can be added to the organisation' },
              { status: 200 }
            );
          } else if (existingConnection.status === 'PENDING') {
            return NextResponse.json(
              { success: true, message: 'Connection request already pending' },
              { status: 200 }
            );
          }
        }

        // Send connection request via profile_graph
        await supabase.from('profile_graph').insert({
          source_profile_id: user.id,
          target_profile_id: invitedUser.id,
          relationship_type: 'SOCIAL',
          status: 'PENDING',
          metadata: {
            type: 'organisation_invite',
            organisation_id: organisationId,
            organisation_name: organisation.name,
          },
        });

        return NextResponse.json(
          {
            success: true,
            type: 'connection_request',
            message: `Connection request sent to ${invitedUser.full_name || email}`,
          },
          {
            headers: rateLimitHeaders(rateLimit.remaining - 1, rateLimit.resetAt)
          }
        );

      } catch (error) {
        console.error('[organisation/invite] Connection request error:', error);
        return NextResponse.json(
          { error: 'Failed to send connection request' },
          { status: 500 }
        );
      }

    } else {
      // New user: Send email invitation with referral link
      try {
        const referralUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/a/${profile.referral_code}?redirect=/organisation`;

        await sendConnectionInvitation({
          to: email,
          senderName: profile.full_name,
          referralUrl,
        });

        // Log analytics
        try {
          await supabase.from('network_analytics').insert({
            profile_id: user.id,
            event_type: 'organisation_invite_sent',
            event_data: {
              email,
              organisation_id: organisationId,
              organisation_name: organisation.name,
              via: 'email_invitation',
            },
            referral_code: profile.referral_code,
          });
        } catch (analyticsError) {
          console.error('[organisation/invite] Analytics error:', analyticsError);
          // Non-blocking
        }

        return NextResponse.json(
          {
            success: true,
            type: 'email_invitation',
            message: `Invitation sent to ${email}`,
          },
          {
            headers: rateLimitHeaders(rateLimit.remaining - 1, rateLimit.resetAt)
          }
        );

      } catch (error) {
        console.error('[organisation/invite] Email send error:', error);
        return NextResponse.json(
          { error: 'Failed to send invitation email' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('[organisation/invite] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
