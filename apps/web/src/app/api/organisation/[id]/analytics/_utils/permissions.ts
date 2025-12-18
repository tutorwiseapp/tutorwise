/**
 * Filename: src/app/api/organisation/[id]/analytics/_utils/permissions.ts
 * Purpose: Shared permission checking utilities for organisation analytics endpoints
 * Created: 2025-12-17
 * Updated: 2025-12-17 - Added admin role support
 * Version: v7.2 - Admin role support
 */

import { createClient } from '@/utils/supabase/server';

export interface OrganisationPermissions {
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  memberProfileId: string | null;
}

/**
 * Verifies user access to organisation and determines their role
 * Returns permission info if authorized, throws error if not
 */
export async function verifyOrganisationAccess(
  organisationId: string,
  userId: string
): Promise<OrganisationPermissions> {
  const supabase = await createClient();

  // Verify organisation exists and get owner
  const { data: org, error: orgError } = await supabase
    .from('connection_groups')
    .select('profile_id')
    .eq('id', organisationId)
    .eq('type', 'organisation')
    .single();

  if (orgError || !org) {
    throw new Error('Organisation not found');
  }

  // Check if user is owner
  const isOwner = org.profile_id === userId;

  // Check if user is admin
  const { data: isAdminData } = await supabase
    .rpc('is_organisation_admin', {
      org_id: organisationId,
      user_profile_id: userId
    });

  const isAdmin = (isAdminData as boolean) || false;

  // Owners and admins see full org data
  if (isOwner || isAdmin) {
    return {
      isOwner,
      isAdmin,
      isMember: true,
      memberProfileId: null, // Owners and admins see full org data
    };
  }

  // Check if user is a member of this organisation
  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('connection_id')
    .eq('group_id', organisationId);

  if (memberError || !memberships || memberships.length === 0) {
    throw new Error('You do not have access to this organisation');
  }

  // Check each membership to find if user is connected
  for (const membership of memberships) {
    const { data: connection, error: connError } = await supabase
      .from('profile_graph')
      .select('source_profile_id, target_profile_id')
      .eq('id', membership.connection_id)
      .single();

    if (!connError && connection) {
      // Check if user is part of this connection
      if (connection.source_profile_id === userId || connection.target_profile_id === userId) {
        return {
          isOwner: false,
          isAdmin: false,
          isMember: true,
          memberProfileId: userId, // Regular members see filtered data
        };
      }
    }
  }

  // User is not owner or member
  throw new Error('You are not a member of this organisation');
}
