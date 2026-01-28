/**
 * Filename: apps/web/src/app/api/links/client-student/[id]/route.ts
 * Purpose: Remove Guardian Link (unlink student) (SDD v5.0)
 * Created: 2025-11-12
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/links/client-student/[id]
 * Remove a Guardian Link (unlink a student from the guardian)
 */
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const linkId = params.id;

    // Verify the link exists and belongs to the current user
    const { data: link, error: fetchError } = await supabase
      .from('profile_graph')
      .select('id, source_profile_id, target_profile_id, relationship_type')
      .eq('id', linkId)
      .eq('source_profile_id', user.id)
      .eq('relationship_type', 'GUARDIAN')
      .maybeSingle();

    if (fetchError) {
      console.error('[client-student/delete] Error fetching link:', fetchError);
      throw fetchError;
    }

    if (!link) {
      return NextResponse.json(
        { error: 'Guardian link not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete the Guardian Link
    const { error: deleteError } = await supabase
      .from('profile_graph')
      .delete()
      .eq('id', linkId)
      .eq('relationship_type', 'GUARDIAN');

    if (deleteError) {
      console.error('[client-student/delete] Error deleting link:', deleteError);
      throw deleteError;
    }

    // TODO: Add audit log entry
    // await logToAudit({
    //   action: 'guardian_link_removed',
    //   user_id: user.id,
    //   metadata: { link_id: linkId, student_id: link.target_profile_id },
    // });

    return NextResponse.json({
      success: true,
      message: 'Student unlinked successfully',
    });

  } catch (error) {
    console.error('[client-student/delete] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
