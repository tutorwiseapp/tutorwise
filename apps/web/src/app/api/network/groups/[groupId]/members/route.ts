/**
 * Filename: apps/web/src/app/api/network/groups/[groupId]/members/route.ts
 * Purpose: API endpoint for managing group members
 * Created: 2025-11-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * GET /api/network/groups/[groupId]/members
 * Get all members of a group with their connection details
 */
export async function GET(request: NextRequest, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = params;

    // Verify user owns this group
    const { data: group, error: groupError } = await supabase
      .from('connection_groups')
      .select('id')
      .eq('id', groupId)
      .eq('profile_id', user.id)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Fetch group members with connection details
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select(`
        added_at,
        connection:connection_id (
          id,
          requester_id,
          receiver_id,
          status,
          requester:requester_id(id, full_name, email, avatar_url),
          receiver:receiver_id(id, full_name, email, avatar_url)
        )
      `)
      .eq('group_id', groupId)
      .order('added_at', { ascending: false });

    if (membersError) {
      console.error('[groups/members/GET] Fetch error:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch group members' },
        { status: 500 }
      );
    }

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error('[groups/members/GET] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/network/groups/[groupId]/members
 * Add connections to a group
 */
export async function POST(request: NextRequest, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = params;

    // Parse request body
    const body = await request.json();
    const { connection_ids } = body;

    if (!Array.isArray(connection_ids) || connection_ids.length === 0) {
      return NextResponse.json(
        { error: 'connection_ids array is required' },
        { status: 400 }
      );
    }

    // Verify user owns this group
    const { data: group, error: groupError } = await supabase
      .from('connection_groups')
      .select('id')
      .eq('id', groupId)
      .eq('profile_id', user.id)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Verify all connections belong to the user
    const { data: connections, error: connectionsError } = await supabase
      .from('profile_graph')
      .select('id')
      .in('id', connection_ids)
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (connectionsError) {
      console.error('[groups/members/POST] Verify error:', connectionsError);
      return NextResponse.json(
        { error: 'Failed to verify connections' },
        { status: 500 }
      );
    }

    if (connections.length !== connection_ids.length) {
      return NextResponse.json(
        {
          error:
            'Some connections are invalid or not accepted. You can only add accepted connections.',
        },
        { status: 400 }
      );
    }

    // Add connections to group
    const membersToAdd = connection_ids.map((connectionId) => ({
      group_id: groupId,
      connection_id: connectionId,
    }));

    const { data: members, error: addError } = await supabase
      .from('group_members')
      .insert(membersToAdd)
      .select();

    if (addError) {
      console.error('[groups/members/POST] Add error:', addError);

      // Handle duplicate entries
      if (addError.code === '23505') {
        return NextResponse.json(
          {
            error:
              'Some connections are already in this group. Try removing duplicates.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to add members to group' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, added: members.length },
      { status: 201 }
    );
  } catch (error) {
    console.error('[groups/members/POST] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/network/groups/[groupId]/members
 * Remove connections from a group
 */
export async function DELETE(request: NextRequest, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = params;

    // Parse request body
    const body = await request.json();
    const { connection_ids } = body;

    if (!Array.isArray(connection_ids) || connection_ids.length === 0) {
      return NextResponse.json(
        { error: 'connection_ids array is required' },
        { status: 400 }
      );
    }

    // Verify user owns this group
    const { data: group, error: groupError } = await supabase
      .from('connection_groups')
      .select('id')
      .eq('id', groupId)
      .eq('profile_id', user.id)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Remove connections from group
    const { error: removeError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .in('connection_id', connection_ids);

    if (removeError) {
      console.error('[groups/members/DELETE] Remove error:', removeError);
      return NextResponse.json(
        { error: 'Failed to remove members from group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[groups/members/DELETE] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
