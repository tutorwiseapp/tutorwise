/**
 * Filename: route.ts
 * Purpose: Individual wiselist item API endpoints (v5.7)
 * Path: DELETE /api/wiselists/[id]/items/[itemId]
 * Created: 2025-11-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * DELETE /api/wiselists/[id]/items/[itemId]
 * Remove an item from a wiselist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const supabase = await createClient();
    const { id: wiselistId, itemId } = params;

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the item exists and belongs to the specified wiselist
    const { data: item, error: itemError } = await supabase
      .from('wiselist_items')
      .select('id, wiselist_id')
      .eq('id', itemId)
      .single();

    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      throw itemError;
    }

    // Verify the item belongs to the specified wiselist
    if (item.wiselist_id !== wiselistId) {
      return NextResponse.json(
        { error: 'Item does not belong to this wiselist' },
        { status: 400 }
      );
    }

    // Check if user has permission to remove items (owner or EDITOR collaborator)
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

    // Check if user is a collaborator with EDITOR or OWNER role
    let hasPermission = isOwner;
    if (!isOwner) {
      const { data: collaborator } = await supabase
        .from('wiselist_collaborators')
        .select('role')
        .eq('wiselist_id', wiselistId)
        .eq('profile_id', user.id)
        .single();

      hasPermission = !!(collaborator && ['OWNER', 'EDITOR'].includes(collaborator.role));
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this wiselist' },
        { status: 403 }
      );
    }

    // Delete the item
    const { error: deleteError } = await supabase
      .from('wiselist_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove wiselist item error:', error);
    return NextResponse.json(
      { error: 'Failed to remove item from wiselist' },
      { status: 500 }
    );
  }
}
