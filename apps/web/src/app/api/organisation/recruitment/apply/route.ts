/**
 * Filename: apps/web/src/app/api/organisation/recruitment/apply/route.ts
 * Purpose: Handle recruitment applications to join organisation teams
 * Created: 2026-01-05
 *
 * Flow:
 * 1. User submits application via JoinTeamModal
 * 2. Creates profile_graph entry with relationship_type='ORGANISATION_RECRUITMENT'
 * 3. Status is PENDING until organisation owner approves/rejects
 * 4. On approval, user is auto-added to group_members with Member permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { z } from 'zod';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

const ApplicationSchema = z.object({
  organisation_id: z.string().uuid(),
  organisation_name: z.string(),
  expertise: z.string().min(10).max(1000),
  subjects: z.array(z.string()).min(1).max(20),
  why_join: z.string().min(10).max(1000),
  availability: z.array(z.string()).min(1).max(10),
  tuition_fee_expectation: z.number().positive().nullable().optional(),
  salary_expectation: z.number().positive().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (20 applications per day)
    const rateLimit = await checkRateLimit(user.id, 'organisation:recruitment:apply');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimit),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt)
        }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = ApplicationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      organisation_id,
      organisation_name,
      expertise,
      subjects,
      why_join,
      availability,
      tuition_fee_expectation,
      salary_expectation,
    } = validation.data;

    // Verify organisation exists and get owner profile_id
    const { data: organisation, error: orgError } = await supabase
      .from('organisations')
      .select('id, profile_id, name')
      .eq('id', organisation_id)
      .single();

    if (orgError || !organisation) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    // Check if user is trying to apply to their own organisation
    if (user.id === organisation.profile_id) {
      return NextResponse.json(
        { error: 'You cannot apply to your own organisation' },
        { status: 400 }
      );
    }

    // Check for existing application
    const { data: existingApplication } = await supabase
      .from('profile_graph')
      .select('id, status')
      .eq('source_profile_id', user.id)
      .eq('target_profile_id', organisation.profile_id)
      .eq('relationship_type', 'ORGANISATION_RECRUITMENT')
      .maybeSingle();

    if (existingApplication) {
      if (existingApplication.status === 'PENDING') {
        return NextResponse.json(
          { error: 'You already have a pending application to this organisation' },
          { status: 400 }
        );
      } else if (existingApplication.status === 'ACTIVE') {
        return NextResponse.json(
          { error: 'Your application was already approved. Check if you\'re in the team.' },
          { status: 400 }
        );
      }
    }

    // Get applicant profile for email
    const { data: applicantProfile } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('id', user.id)
      .single();

    // Create recruitment application in profile_graph
    const { data: application, error: insertError } = await supabase
      .from('profile_graph')
      .insert({
        source_profile_id: user.id,
        target_profile_id: organisation.profile_id,
        relationship_type: 'ORGANISATION_RECRUITMENT',
        status: 'PENDING',
        metadata: {
          organisation_id,
          organisation_name,
          expertise,
          subjects,
          why_join,
          availability,
          tuition_fee_expectation,
          salary_expectation,
          applicant_name: applicantProfile?.full_name || 'Unknown',
          applied_at: new Date().toISOString(),
        },
      })
      .select(`
        id,
        source_profile_id,
        target_profile_id,
        status,
        metadata,
        created_at
      `)
      .single();

    if (insertError) {
      console.error('[recruitment/apply] Error creating application:', insertError);
      throw insertError;
    }

    // Send email notification to organisation owner (non-blocking)
    if (applicantProfile && organisation) {
      const recruitmentUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/organisation?tab=recruitments`;

      Promise.resolve().then(async () => {
        try {
          // Get organisation owner's email
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', organisation.profile_id)
            .single();

          if (ownerProfile?.email) {
            // TODO: Implement email notification
            // await sendRecruitmentApplicationEmail({
            //   to: ownerProfile.email,
            //   applicantName: applicantProfile.full_name,
            //   organisationName: organisation.name,
            //   recruitmentUrl,
            // });
            console.log('[recruitment/apply] Email notification queued for:', ownerProfile.email);
          }
        } catch (emailError) {
          console.error('[recruitment/apply] Email error:', emailError);
          // Non-blocking error
        }
      }).catch(err => console.error('[recruitment/apply] Email batch error:', err));
    }

    // Log analytics event (non-blocking)
    Promise.resolve().then(async () => {
      try {
        await supabase.from('network_analytics').insert({
          profile_id: user.id,
          event_type: 'recruitment_application_submitted',
          event_data: {
            organisation_id,
            organisation_name,
            application_id: application.id,
          },
        });
      } catch (analyticsError) {
        console.error('[recruitment/apply] Analytics error:', analyticsError);
      }
    }).catch(err => console.error('[recruitment/apply] Analytics batch error:', err));

    return NextResponse.json(
      {
        success: true,
        application: {
          id: application.id,
          status: application.status,
          created_at: application.created_at,
        },
      },
      {
        headers: rateLimitHeaders(rateLimit.remaining - 1, rateLimit.resetAt)
      }
    );

  } catch (error) {
    console.error('[recruitment/apply] Error:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('already')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
