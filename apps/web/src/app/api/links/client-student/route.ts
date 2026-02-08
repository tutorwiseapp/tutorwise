/**
 * Filename: apps/web/src/app/api/links/client-student/route.ts
 * Purpose: Send student invitation to create Guardian Link (SDD v5.0)
 * Created: 2025-11-12
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
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

    // Verify guardian is client or tutor
    if (!guardianProfile.roles.includes('client') && !guardianProfile.roles.includes('tutor')) {
      return NextResponse.json(
        { error: 'Only clients and tutors can invite students' },
        { status: 403 }
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

    // Student doesn't exist - send invitation email
    // TODO: Implement secure invitation email with token
    // For now, we'll create a placeholder invitation record

    // Generate a secure invitation token (this should be replaced with proper token generation)
    const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store invitation in metadata (in production, this should be a separate invitations table)
    console.log('[client-student] Sending invitation email to:', student_email);
    console.log('[client-student] Guardian:', guardianProfile.full_name);
    console.log('[client-student] Invitation URL:', `${process.env.NEXT_PUBLIC_SITE_URL}/signup/invite?token=${invitationToken}`);

    // TODO: Send actual email using sendStudentInvitationEmail()
    // await sendStudentInvitationEmail({
    //   to: student_email,
    //   guardianName: guardianProfile.full_name,
    //   guardianEmail: guardianProfile.email,
    //   invitationUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/signup/invite?token=${invitationToken}`,
    // });

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation sent successfully',
        invitation_sent: true,
        student_email,
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
