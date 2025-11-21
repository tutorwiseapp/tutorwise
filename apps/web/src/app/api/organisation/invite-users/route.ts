/**
 * Filename: apps/web/src/app/api/organisation/invite-users/route.ts
 * Purpose: Bulk invite existing network users to join an organisation
 * Created: 2025-11-21
 *
 * Flow:
 * - Accept array of user_ids (existing users only)
 * - Send connection requests with organisation metadata
 * - Return count of successful invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

const InviteUsersSchema = z.object({
  organisationId: z.string().uuid(),
  user_ids: z.array(z.string().uuid()),
  message: z.string().optional(),
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
    const validation = InviteUsersSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { organisationId, user_ids, message } = validation.data;

    if (user_ids.length === 0) {
      return NextResponse.json(
        { error: 'No users selected' },
        { status: 400 }
      );
    }

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
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 400 }
      );
    }

    // Send connection requests to all users
    let successCount = 0;
    const errors: string[] = [];

    for (const target_user_id of user_ids) {
      try {
        // Skip if trying to invite self
        if (target_user_id === user.id) {
          errors.push('Cannot invite yourself');
          continue;
        }

        // Check if they're already connected
        const { data: existingConnection } = await supabase
          .from('profile_graph')
          .select('id, status')
          .eq('relationship_type', 'SOCIAL')
          .or(`and(source_profile_id.eq.${user.id},target_profile_id.eq.${target_user_id}),and(source_profile_id.eq.${target_user_id},target_profile_id.eq.${user.id})`)
          .maybeSingle();

        if (existingConnection) {
          if (existingConnection.status === 'ACTIVE') {
            // Already connected - this is actually okay, just skip
            successCount++;
            continue;
          } else if (existingConnection.status === 'PENDING') {
            // Pending request exists - skip
            continue;
          }
        }

        // Send connection request via profile_graph
        const metadata: any = {
          type: 'organisation_invite',
          organisation_id: organisationId,
          organisation_name: organisation.name,
        };

        if (message) {
          metadata.message = message;
        }

        const { error: insertError } = await supabase.from('profile_graph').insert({
          source_profile_id: user.id,
          target_profile_id: target_user_id,
          relationship_type: 'SOCIAL',
          status: 'PENDING',
          metadata,
        });

        if (insertError) {
          console.error(`[invite-users] Failed to send request to ${target_user_id}:`, insertError);
          errors.push(`Failed to invite user ${target_user_id}`);
        } else {
          successCount++;
        }

      } catch (error) {
        console.error(`[invite-users] Error inviting ${target_user_id}:`, error);
        errors.push(`Error inviting user ${target_user_id}`);
      }
    }

    // Log analytics
    try {
      await supabase.from('network_analytics').insert({
        profile_id: user.id,
        event_type: 'organisation_bulk_invite_sent',
        event_data: {
          organisation_id: organisationId,
          organisation_name: organisation.name,
          invited_count: successCount,
          total_selected: user_ids.length,
          via: 'invite_modal',
        },
      });
    } catch (analyticsError) {
      console.error('[invite-users] Analytics error:', analyticsError);
      // Non-blocking
    }

    if (successCount === 0) {
      return NextResponse.json(
        { error: 'Failed to send any invitations', details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: successCount,
      total: user_ids.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('[invite-users] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
