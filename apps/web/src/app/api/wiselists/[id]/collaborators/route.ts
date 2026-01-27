/**
 * Filename: route.ts
 * Purpose: Wiselist collaborators API endpoints (v5.7)
 * Path: POST /api/wiselists/[id]/collaborators
 * Created: 2025-11-15
 *
 * Integration: v4.3 Referral System
 * - Inviting new users via email creates PENDING profile_graph link
 * - When invited user signs up, they are credited to inviter's referral stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/wiselists/[id]/collaborators
 * Add a collaborator to a wiselist
 *
 * Supports two modes:
 * 1. Existing user: profileId provided
 * 2. New user invite: email provided (creates profile_graph PENDING link for v4.3)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id: wiselistId } = params;

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { profileId, email, role } = body;

    // Validate that either profileId or email is provided
    if (!profileId && !email) {
      return NextResponse.json(
        { error: 'Must provide either profileId or email' },
        { status: 400 }
      );
    }

    if (profileId && email) {
      return NextResponse.json(
        { error: 'Cannot provide both profileId and email' },
        { status: 400 }
      );
    }

    // Validate role if provided
    const validRoles = ['OWNER', 'EDITOR', 'VIEWER'];
    const collaboratorRole = role || 'EDITOR';
    if (!validRoles.includes(collaboratorRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be OWNER, EDITOR, or VIEWER' },
        { status: 400 }
      );
    }

    // Check if user owns the wiselist
    const { data: wiselist, error: wiselistError } = await supabase
      .from('wiselists')
      .select('id, profile_id, name')
      .eq('id', wiselistId)
      .single();

    if (wiselistError) {
      if (wiselistError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Wiselist not found' }, { status: 404 });
      }
      throw wiselistError;
    }

    if (wiselist.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the wiselist owner can add collaborators' },
        { status: 403 }
      );
    }

    // MODE 1: Existing user by profileId
    if (profileId) {
      // Verify the profile exists
      const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', profileId)
        .single();

      if (profileError || !targetProfile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      // Cannot add yourself as collaborator
      if (profileId === user.id) {
        return NextResponse.json(
          { error: 'Cannot add yourself as a collaborator' },
          { status: 400 }
        );
      }

      // Check if already a collaborator
      const { data: existingCollab } = await supabase
        .from('wiselist_collaborators')
        .select('id')
        .eq('wiselist_id', wiselistId)
        .eq('profile_id', profileId)
        .single();

      if (existingCollab) {
        return NextResponse.json(
          { error: 'User is already a collaborator' },
          { status: 409 }
        );
      }

      // Add collaborator
      const { data: collaborator, error: insertError } = await supabase
        .from('wiselist_collaborators')
        .insert({
          wiselist_id: wiselistId,
          profile_id: profileId,
          role: collaboratorRole,
          invited_by_profile_id: user.id,
        })
        .select(`
          *,
          profile:profiles!profile_id(id, full_name, avatar_url, email),
          invited_by:profiles!invited_by_profile_id(id, full_name, avatar_url)
        `)
        .single();

      if (insertError) {
        throw insertError;
      }

      // Create SOCIAL link in profile_graph (v4.6)
      // This establishes a connection for the growth loop
      await supabase
        .from('profile_graph')
        .insert({
          source_profile_id: user.id,
          target_profile_id: profileId,
          relationship_type: 'SOCIAL',
          status: 'ACTIVE',
          metadata: {
            source: 'wiselist_collaboration',
            wiselist_id: wiselistId,
            wiselist_name: wiselist.name,
          },
        })
        .select()
        .single();

      return NextResponse.json({ collaborator }, { status: 201 });
    }

    // MODE 2: New user invite by email (v4.3 Referral Integration)
    if (email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }

      // Check if user with this email already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase())
        .single();

      if (existingProfile) {
        return NextResponse.json(
          {
            error: 'User with this email already exists',
            suggestion: 'Use profileId instead to add existing user',
            profileId: existingProfile.id,
          },
          { status: 400 }
        );
      }

      // Get inviter's referral code (v4.3)
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('id, referral_code, full_name')
        .eq('id', user.id)
        .single();

      if (!inviterProfile?.referral_code) {
        return NextResponse.json(
          { error: 'Unable to send invitation. Please contact support.' },
          { status: 500 }
        );
      }

      // Gap 2 (v5.7.1): Create invitation with referral code integration
      // The referral record in the 'referrals' table will be created automatically
      // by the handle_new_user trigger when they sign up via the referral link
      const inviteToken = crypto.randomUUID();

      const { data: invitation, error: inviteError } = await supabase
        .from('wiselist_invitations')
        .insert({
          wiselist_id: wiselistId,
          invited_email: email.toLowerCase(),
          invited_by_profile_id: user.id,
          role: collaboratorRole,
          invite_token: inviteToken,
          referral_code: inviterProfile.referral_code,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single();

      if (inviteError) {
        // Check for duplicate invitation
        if (inviteError.code === '23505') {
          return NextResponse.json(
            { error: 'An invitation has already been sent to this email' },
            { status: 409 }
          );
        }
        throw inviteError;
      }

      // TODO Gap 2: Send invitation email with referral link
      // This will be implemented when we add the email service (Resend)
      // Email template should contain:
      // - Subject: "{inviter_name} invited you to collaborate on Tutorwise"
      // - Body: "{inviter_name} invited you to collaborate on '{wiselist_name}'"
      // - CTA Link: https://tutorwise.com/a/{referral_code}?invite={inviteToken}
      // - When they sign up, the referral attribution happens automatically:
      //   1. handle_new_user trigger creates profile with referred_by_profile_id
      //   2. handle_new_user trigger creates referral record with status='Signed Up'
      //   3. Middleware reads invite token and auto-adds them as collaborator

      return NextResponse.json({
        invitation: {
          id: invitation.id,
          email: email.toLowerCase(),
          role: collaboratorRole,
          referral_link: `https://tutorwise.com/a/${inviterProfile.referral_code}?invite=${inviteToken}`,
          referral_code: inviterProfile.referral_code,
          wiselist_name: wiselist.name,
          inviter_name: inviterProfile.full_name,
          status: 'pending',
          message: 'Invitation created successfully. Referral tracking will be activated when user signs up.',
        },
      }, { status: 201 });
    }

    // Should never reach here
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Add collaborator error:', error);
    return NextResponse.json(
      { error: 'Failed to add collaborator' },
      { status: 500 }
    );
  }
}
