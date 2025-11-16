/**
 * Filename: route.ts
 * Purpose: Individual wiselist collaborator API endpoints (v5.7)
 * Path: DELETE /api/wiselists/[id]/collaborators/[collabId]
 * Created: 2025-11-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * DELETE /api/wiselists/[id]/collaborators/[collabId]
 * Remove a collaborator from a wiselist
 *
 * Permissions:
 * - Wiselist owner can remove any collaborator
 * - Collaborators can remove themselves
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; collabId: string } }
) {
  try {
    const supabase = await createClient();
    const { id: wiselistId, collabId } = params;

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the collaborator record
    const { data: collaborator, error: collabError } = await supabase
      .from('wiselist_collaborators')
      .select('id, wiselist_id, profile_id, role')
      .eq('id', collabId)
      .single();

    if (collabError) {
      if (collabError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
      }
      throw collabError;
    }

    // Verify the collaborator belongs to the specified wiselist
    if (collaborator.wiselist_id !== wiselistId) {
      return NextResponse.json(
        { error: 'Collaborator does not belong to this wiselist' },
        { status: 400 }
      );
    }

    // Check if user has permission to remove this collaborator
    const { data: wiselist, error: wiselistError } = await supabase
      .from('wiselists')
      .select('id, profile_id')
      .eq('id', wiselistId)
      .single();

    if (wiselistError) {
      if (wiselistError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Wiselist not found' }, { status: 404 });
      }
      throw wiselistError;
    }

    const isOwner = wiselist.profile_id === user.id;
    const isRemovingSelf = collaborator.profile_id === user.id;

    // Permission check: owner can remove anyone, collaborators can only remove themselves
    if (!isOwner && !isRemovingSelf) {
      return NextResponse.json(
        { error: 'You do not have permission to remove this collaborator' },
        { status: 403 }
      );
    }

    // Prevent owner from removing themselves if they're listed as a collaborator
    // (Owner is already defined by wiselist.profile_id, shouldn't be in collaborators table)
    if (isOwner && isRemovingSelf) {
      return NextResponse.json(
        { error: 'Cannot remove yourself as owner. Delete the wiselist instead.' },
        { status: 400 }
      );
    }

    // Delete the collaborator
    const { error: deleteError } = await supabase
      .from('wiselist_collaborators')
      .delete()
      .eq('id', collabId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    return NextResponse.json(
      { error: 'Failed to remove collaborator' },
      { status: 500 }
    );
  }
}
