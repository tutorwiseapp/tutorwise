/**
 * Filename: apps/web/src/app/api/links/client-student/route.ts
 * Purpose: Send student invitation to create Guardian Link (SDD v5.0)
 * Created: 2025-11-12
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { logGuardianLinkCreated, logStudentInvitationSent } from '@/lib/audit/logger';
import { sendStudentInvitation } from '@/lib/email';
import { z } from 'zod';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

const InviteSchema = z.object({
  student_email: z.string().email('Invalid email address'),
  is_13_plus: z.boolean().refine((val) => val === true, {
    message: 'Student must be 13 years or older',
  }),
});

/**
 * POST /api/links/client-student
 * Send a student invitation email to create a Guardian Link
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (50 invitations per day to prevent spam)
    const rateLimit = await checkRateLimit(user.id, 'student:invite');
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
    const validation = InviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { student_email } = validation.data;

    // Get guardian profile
    const { data: guardianProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, roles')
      .eq('id', user.id)
      .single();

    if (profileError || !guardianProfile) {
      return NextResponse.json(
        { error: 'Guardian profile not found' },
        { status: 404 }
      );
    }

    // Verify guardian is client, tutor, or agent
    if (!guardianProfile.roles.includes('client') && !guardianProfile.roles.includes('tutor') && !guardianProfile.roles.includes('agent')) {
      return NextResponse.json(
        { error: 'Only clients, tutors, and agents can invite students' },
        { status: 403 }
      );
    }

    // Check maximum student limit (50 per guardian)
    // Count active guardian links
    const { count: activeLinksCount, error: linksCountError } = await supabase
      .from('profile_graph')
      .select('id', { count: 'exact', head: true })
      .eq('source_profile_id', user.id)
      .eq('relationship_type', 'GUARDIAN')
      .eq('status', 'ACTIVE');

    if (linksCountError) {
      console.error('[client-student] Error counting active links:', linksCountError);
      throw linksCountError;
    }

    // Count pending invitations
    const { count: pendingInvitationsCount, error: invitationsCountError } = await supabase
      .from('guardian_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('guardian_id', user.id)
      .eq('status', 'pending');

    if (invitationsCountError) {
      console.error('[client-student] Error counting pending invitations:', invitationsCountError);
      throw invitationsCountError;
    }

    const totalStudents = (activeLinksCount || 0) + (pendingInvitationsCount || 0);
    const maxStudents = 50;

    if (totalStudents >= maxStudents) {
      return NextResponse.json(
        {
          error: 'Maximum student limit reached',
          details: {
            current_students: activeLinksCount || 0,
            pending_invitations: pendingInvitationsCount || 0,
            total: totalStudents,
            limit: maxStudents,
            message: `You can have a maximum of ${maxStudents} students. You currently have ${activeLinksCount || 0} linked students and ${pendingInvitationsCount || 0} pending invitations.`
          }
        },
        { status: 400 }
      );
    }

    // Check if student email already exists in system
    const { data: existingStudent } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', student_email)
      .maybeSingle();

    if (existingStudent) {
      // Prevent self-linking (Fix #3: Guardian cannot add themselves as student)
      if (existingStudent.id === user.id) {
        return NextResponse.json(
          {
            error: 'You cannot add yourself as a student',
            details: 'Please use a different email address for the student'
          },
          { status: 400 }
        );
      }

      // Check if guardian link already exists
      const { data: existingLink } = await supabase
        .from('profile_graph')
        .select('id')
        .eq('source_profile_id', user.id)
        .eq('target_profile_id', existingStudent.id)
        .eq('relationship_type', 'GUARDIAN')
        .maybeSingle();

      if (existingLink) {
        return NextResponse.json(
          { error: 'Student is already linked to your account' },
          { status: 400 }
        );
      }

      // Student exists but not linked - create guardian link immediately
      const { data: newLink, error: linkError } = await supabase
        .from('profile_graph')
        .insert({
          source_profile_id: user.id,
          target_profile_id: existingStudent.id,
          relationship_type: 'GUARDIAN',
          status: 'ACTIVE',
          metadata: {
            invited_at: new Date().toISOString(),
            invited_by_email: guardianProfile.email,
          },
        })
        .select()
        .single();

      if (linkError) {
        console.error('[client-student] Error creating guardian link:', linkError);
        throw linkError;
      }

      // Log guardian link creation
      await logGuardianLinkCreated(
        user.id,
        existingStudent.id,
        newLink.id,
        'direct_link',
        request
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Student linked successfully',
          link_id: newLink.id,
          student_existed: true,
        },
        {
          headers: rateLimitHeaders(rateLimit.remaining - 1, rateLimit.resetAt)
        }
      );
    }

    // Student doesn't exist - create secure invitation token
    // Check if pending invitation already exists
    const { data: existingInvitation } = await supabase
      .from('guardian_invitations')
      .select('id, token, expires_at, status')
      .eq('guardian_id', user.id)
      .eq('student_email', student_email)
      .eq('status', 'pending')
      .maybeSingle();

    let invitationToken: string;
    let invitationId: string;

    if (existingInvitation) {
      // Check if invitation is still valid (not expired)
      const expiresAt = new Date(existingInvitation.expires_at);
      const now = new Date();

      if (expiresAt > now) {
        // Reuse existing valid invitation
        invitationToken = existingInvitation.token;
        invitationId = existingInvitation.id;
        console.log('[client-student] Reusing existing invitation:', invitationId);
      } else {
        // Expired - mark as expired and create new one
        await supabase
          .from('guardian_invitations')
          .update({ status: 'expired' })
          .eq('id', existingInvitation.id);

        // Create new invitation
        const { data: newInvitation, error: inviteError } = await supabase
          .from('guardian_invitations')
          .insert({
            guardian_id: user.id,
            student_email,
            token: crypto.randomUUID(), // Cryptographically secure UUID
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          })
          .select('id, token')
          .single();

        if (inviteError || !newInvitation) {
          console.error('[client-student] Error creating invitation:', inviteError);
          throw inviteError || new Error('Failed to create invitation');
        }

        invitationToken = newInvitation.token;
        invitationId = newInvitation.id;
      }
    } else {
      // No existing invitation - create new one
      const { data: newInvitation, error: inviteError } = await supabase
        .from('guardian_invitations')
        .insert({
          guardian_id: user.id,
          student_email,
          token: crypto.randomUUID(), // Cryptographically secure UUID
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select('id, token')
        .single();

      if (inviteError || !newInvitation) {
        console.error('[client-student] Error creating invitation:', inviteError);
        throw inviteError || new Error('Failed to create invitation');
      }

      invitationToken = newInvitation.token;
      invitationId = newInvitation.id;
    }

    // Build invitation URL
    const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/signup/invite?token=${invitationToken}`;

    console.log('[client-student] Sending invitation email to:', student_email);
    console.log('[client-student] Guardian:', guardianProfile.full_name);
    console.log('[client-student] Invitation URL:', invitationUrl);
    console.log('[client-student] Expires in: 7 days');

    // Send invitation email via Resend
    try {
      await sendStudentInvitation({
        to: student_email,
        guardianName: guardianProfile.full_name,
        guardianEmail: guardianProfile.email,
        invitationUrl,
      });
      console.log('[client-student] Invitation email sent successfully');
    } catch (emailError) {
      console.error('[client-student] Failed to send invitation email:', emailError);
      // Don't fail the request if email fails - invitation is still created
      // Guardian can resend or share the link manually
    }

    // Log student invitation sent
    await logStudentInvitationSent(
      user.id,
      student_email,
      invitationId,
      request
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation sent successfully',
        invitation_sent: true,
        student_email,
        expires_in_days: 7,
      },
      {
        headers: rateLimitHeaders(rateLimit.remaining - 1, rateLimit.resetAt)
      }
    );

  } catch (error) {
    console.error('[client-student] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/links/client-student
 * Get all students (Guardian Links) for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query profile_graph for GUARDIAN relationships
    const { data, error } = await supabase
      .from('profile_graph')
      .select(`
        id,
        source_profile_id,
        target_profile_id,
        status,
        metadata,
        created_at,
        student:target_profile_id(id, full_name, email, avatar_url, date_of_birth)
      `)
      .eq('relationship_type', 'GUARDIAN')
      .eq('source_profile_id', user.id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[client-student] Error fetching students:', error);
      throw error;
    }

    // Map to StudentLink format
    const students = (data || []).map((link: any) => ({
      id: link.id,
      guardian_id: link.source_profile_id,
      student_id: link.target_profile_id,
      status: 'active' as const,
      created_at: link.created_at,
      student: Array.isArray(link.student) ? link.student[0] : link.student,
    }));

    return NextResponse.json({
      success: true,
      students,
    });

  } catch (error) {
    console.error('[client-student] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
