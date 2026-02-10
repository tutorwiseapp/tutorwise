/**
 * POST /api/v1/referrals/create
 * Purpose: Create a referral programmatically (AI agent endpoint)
 * Authentication: API key required (Bearer token)
 * Scope: referrals:write
 *
 * Use Cases:
 * - ChatGPT: "Refer my friend jane@example.com as a tutor"
 * - Claude: "Send a referral invitation to john@example.com"
 * - Custom bot: Bulk referral invitations from CRM
 */

import { withApiAuth } from '@/middleware/api-auth';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { sendReferralInvitationEmail } from '@/lib/email/referral-invitation';

export const dynamic = 'force-dynamic';

interface CreateReferralRequest {
  referrer_code?: string; // Optional: defaults to authenticated user's code
  referred_email: string;
  referred_name?: string;
  context?: string; // AI agent context (e.g., "ChatGPT conversation")
  send_email?: boolean; // Whether to send invitation email (default: true)
}

export async function POST(request: Request) {
  return withApiAuth(
    request,
    async (authContext) => {
      const supabase = await createClient();

      // Parse request body
      let body: CreateReferralRequest;
      try {
        body = await request.json();
      } catch (_err) {
        return NextResponse.json(
          {
            error: 'invalid_json',
            message: 'Request body must be valid JSON',
          },
          { status: 400 }
        );
      }

      // Validate required fields
      if (!body.referred_email) {
        return NextResponse.json(
          {
            error: 'missing_field',
            message: 'referred_email is required',
          },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.referred_email)) {
        return NextResponse.json(
          {
            error: 'invalid_email',
            message: 'referred_email must be a valid email address',
          },
          { status: 400 }
        );
      }

      // Get authenticated user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, referral_code, full_name')
        .eq('id', authContext.profileId)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          {
            error: 'profile_not_found',
            message: 'Could not find profile for authenticated API key',
          },
          { status: 404 }
        );
      }

      // Use provided referrer_code or default to user's own code
      const referrerCode = body.referrer_code || profile.referral_code;

      if (!referrerCode) {
        return NextResponse.json(
          {
            error: 'no_referral_code',
            message: 'User does not have a referral code. Please create one first.',
          },
          { status: 400 }
        );
      }

      // Check if referral already exists
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id, status')
        .eq('referred_email', body.referred_email.toLowerCase())
        .maybeSingle();

      if (existingReferral) {
        return NextResponse.json(
          {
            error: 'referral_exists',
            message: 'A referral for this email already exists',
            referral: {
              id: existingReferral.id,
              status: existingReferral.status,
            },
          },
          { status: 409 }
        );
      }

      // Get agent_id from referral code
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referrerCode.toUpperCase())
        .single();

      if (!agentProfile) {
        return NextResponse.json(
          {
            error: 'invalid_referrer_code',
            message: `Referrer code '${referrerCode}' not found`,
          },
          { status: 404 }
        );
      }

      // Create referral record
      const { data: newReferral, error: createError } = await supabase
        .from('referrals')
        .insert({
          agent_id: agentProfile.id,
          referred_email: body.referred_email.toLowerCase(),
          referred_name: body.referred_name || null,
          status: 'Referred',
          referral_source: 'ai_agent',
          attribution_method: 'api',
          metadata: {
            created_via: 'api',
            api_context: body.context || 'AI agent referral',
            created_by_profile_id: authContext.profileId,
          },
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Referral creation error:', createError);
        return NextResponse.json(
          {
            error: 'creation_failed',
            message: 'Failed to create referral',
            details: createError.message,
          },
          { status: 500 }
        );
      }

      // Generate referral link
      const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tutorwise.com'}/a/${referrerCode}`;

      // Send invitation email if requested (default: true)
      if (body.send_email !== false) {
        try {
          await sendReferralInvitationEmail({
            to: body.referred_email,
            referredName: body.referred_name,
            referrerName: profile.full_name || 'A Tutorwise user',
            referralLink,
          });
        } catch (emailError) {
          // Log but don't fail the referral creation if email fails
          console.error('Referral invitation email failed:', emailError);
        }
      }

      // Return success response
      return NextResponse.json(
        {
          success: true,
          referral: {
            id: newReferral.id,
            referred_email: newReferral.referred_email,
            referred_name: newReferral.referred_name,
            status: newReferral.status,
            referral_link: referralLink,
            created_at: newReferral.created_at,
          },
          message: 'Referral created successfully',
        },
        { status: 201 }
      );
    },
    {
      requiredScopes: ['referrals:write'],
    }
  );
}
