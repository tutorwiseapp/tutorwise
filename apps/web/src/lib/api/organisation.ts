/**
 * Organisation API utilities
 * Handles organisation/agency management (v6.1)
 * Reference: organisation-solution-design-v6.md
 */

import { createClient } from '@/utils/supabase/client';

export interface Organisation {
  id: string;
  profile_id: string;
  name: string;
  slug: string | null;
  type: 'personal' | 'organisation';
  avatar_url: string | null;
  description: string | null;
  website: string | null;
  color: string;
  icon: string;
  is_favorite: boolean;
  member_count: number;
  settings: Record<string, any>;
  // Contact fields
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  // Address fields
  address_line1?: string | null;
  address_town?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  address_country?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganisationMember {
  id: string;
  connection_id: string; // The profile_graph relationship ID (composite key)
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  location: string | null;
  active_students_count?: number;
  added_at: string;
  // Agency management fields (v6.3)
  commission_rate: number | null; // Individual override rate (%). If null, uses org default
  internal_notes: string | null; // Private notes for agency owner
  is_verified: boolean; // Internal verification flag
}

export interface OrganisationStats {
  team_size: number;
  total_clients: number;
  monthly_revenue: number;
}

/**
 * Get the current user's organisation (if they have one)
 * Returns the first organisation-type group owned by the user
 */
export async function getMyOrganisation(): Promise<Organisation | null> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('connection_groups')
    .select('*')
    .eq('profile_id', user.id)
    .eq('type', 'organisation')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - user doesn't have an organisation yet
      return null;
    }
    throw error;
  }

  return data as Organisation;
}

/**
 * Get all members of an organisation
 * Joins group_members with profiles to get full member details
 */
export async function getOrganisationMembers(organisationId: string): Promise<OrganisationMember[]> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // First verify the user owns this organisation
  const { data: org, error: orgError } = await supabase
    .from('connection_groups')
    .select('profile_id')
    .eq('id', organisationId)
    .single();

  if (orgError || !org || org.profile_id !== user.id) {
    throw new Error('Unauthorized: You do not own this organisation');
  }

  // Get members via join table
  // Note: group_members connects to profile_graph (migrated from connections in v092)
  // We need to query through the profile_graph to get the profile
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      added_at,
      connection_id,
      commission_rate,
      internal_notes,
      is_verified,
      profile_graph!inner(
        id,
        source:source_profile_id(
          id,
          full_name,
          email,
          avatar_url,
          bio
        ),
        target:target_profile_id(
          id,
          full_name,
          email,
          avatar_url,
          bio
        )
      )
    `)
    .eq('group_id', organisationId);

  if (error) throw error;

  // Map to OrganisationMember format
  // We need to determine which profile is NOT the current user
  const members: OrganisationMember[] = (data || []).map((item: any) => {
    const connection = item.profile_graph;
    const source = Array.isArray(connection.source) ? connection.source[0] : connection.source;
    const target = Array.isArray(connection.target) ? connection.target[0] : connection.target;

    // The member is whichever profile is NOT the current user
    const memberProfile = source.id === user.id ? target : source;

    return {
      id: memberProfile.id,
      connection_id: item.connection_id,
      full_name: memberProfile.full_name,
      email: memberProfile.email,
      avatar_url: memberProfile.avatar_url,
      bio: memberProfile.bio,
      role: null, // TODO: Extract from profile metadata
      location: null, // TODO: Extract from profile metadata
      added_at: item.added_at,
      // Agency management fields
      commission_rate: item.commission_rate,
      internal_notes: item.internal_notes,
      is_verified: item.is_verified || false,
    };
  });

  return members;
}

/**
 * Get organisation statistics
 * Returns team size, total clients, and monthly revenue
 */
export async function getOrganisationStats(organisationId: string): Promise<OrganisationStats> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Verify ownership
  const { data: org, error: orgError } = await supabase
    .from('connection_groups')
    .select('member_count')
    .eq('id', organisationId)
    .eq('profile_id', user.id)
    .single();

  if (orgError || !org) {
    throw new Error('Unauthorized or organisation not found');
  }

  // Team size comes from the denormalized member_count
  const teamSize = org.member_count || 0;

  // TODO: Calculate total clients by querying profile_graph
  // For all members, count their GUARDIAN relationships (students)
  const totalClients = 0; // Placeholder

  // TODO: Calculate monthly revenue from bookings
  const monthlyRevenue = 0; // Placeholder

  return {
    team_size: teamSize,
    total_clients: totalClients,
    monthly_revenue: monthlyRevenue,
  };
}

/**
 * Create a new organisation
 */
export async function createOrganisation(data: {
  name: string;
  description?: string;
  website?: string;
  avatar_url?: string;
}): Promise<Organisation> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data: newOrg, error } = await supabase
    .from('connection_groups')
    .insert({
      profile_id: user.id,
      name: data.name,
      type: 'organisation',
      description: data.description || null,
      website: data.website || null,
      avatar_url: data.avatar_url || null,
      // slug will be auto-generated by trigger
    })
    .select()
    .single();

  if (error) throw error;

  return newOrg as Organisation;
}

/**
 * Update organisation details
 */
export async function updateOrganisation(
  organisationId: string,
  updates: {
    name?: string;
    slug?: string;
    description?: string;
    website?: string;
    avatar_url?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    address_line1?: string;
    address_town?: string;
    address_city?: string;
    address_postcode?: string;
    address_country?: string;
  }
): Promise<Organisation> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('connection_groups')
    .update(updates)
    .eq('id', organisationId)
    .eq('profile_id', user.id)
    .select()
    .single();

  if (error) throw error;

  return data as Organisation;
}

/**
 * Remove a member from the organisation
 * This removes them from the group_members table
 */
export async function removeMember(organisationId: string, connectionId: string): Promise<void> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Verify ownership
  const { data: org, error: orgError } = await supabase
    .from('connection_groups')
    .select('profile_id')
    .eq('id', organisationId)
    .single();

  if (orgError || !org || org.profile_id !== user.id) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', organisationId)
    .eq('connection_id', connectionId);

  if (error) throw error;
}

/**
 * Update member settings (commission rate, verification status, notes)
 * Only the organisation owner can call this function
 */
export async function updateMemberSettings(
  organisationId: string,
  connectionId: string,
  updates: {
    commission_rate?: number | null;
    internal_notes?: string | null;
    is_verified?: boolean;
  }
): Promise<OrganisationMember> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Verify ownership (only owner can manage member settings)
  const { data: org, error: orgError } = await supabase
    .from('connection_groups')
    .select('profile_id')
    .eq('id', organisationId)
    .single();

  if (orgError || !org || org.profile_id !== user.id) {
    throw new Error('Unauthorized: Only the agency owner can manage member settings.');
  }

  // Validate commission_rate if provided
  if (updates.commission_rate !== undefined && updates.commission_rate !== null) {
    if (updates.commission_rate < 0 || updates.commission_rate > 100) {
      throw new Error('Commission rate must be between 0 and 100');
    }
  }

  // Perform update
  const { data, error } = await supabase
    .from('group_members')
    .update(updates)
    .eq('group_id', organisationId)
    .eq('connection_id', connectionId)
    .select(`
      added_at,
      connection_id,
      commission_rate,
      internal_notes,
      is_verified,
      profile_graph!inner(
        id,
        source:source_profile_id(
          id,
          full_name,
          email,
          avatar_url,
          bio
        ),
        target:target_profile_id(
          id,
          full_name,
          email,
          avatar_url,
          bio
        )
      )
    `)
    .single();

  if (error) throw error;

  // Map to OrganisationMember format (same logic as getOrganisationMembers)
  const connection = data.profile_graph as any;
  const source = Array.isArray(connection.source) ? connection.source[0] : connection.source;
  const target = Array.isArray(connection.target) ? connection.target[0] : connection.target;
  const memberProfile = source.id === user.id ? target : source;

  return {
    id: memberProfile.id,
    connection_id: data.connection_id,
    full_name: memberProfile.full_name,
    email: memberProfile.email,
    avatar_url: memberProfile.avatar_url,
    bio: memberProfile.bio,
    role: null,
    location: null,
    added_at: data.added_at,
    commission_rate: data.commission_rate,
    internal_notes: data.internal_notes,
    is_verified: data.is_verified || false,
  };
}

/**
 * Get all students (clients) connected to organisation members
 * This aggregates students from all tutors in the organisation
 */
export async function getOrganisationClients(organisationId: string): Promise<any[]> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // First get all member IDs
  const members = await getOrganisationMembers(organisationId);
  const memberIds = members.map((m) => m.id);

  if (memberIds.length === 0) {
    return [];
  }

  // Query profile_graph for GUARDIAN relationships
  const { data, error } = await supabase
    .from('profile_graph')
    .select(`
      id,
      source_profile_id,
      target_profile_id,
      created_at,
      source:source_profile_id(id, full_name, email, avatar_url),
      target:target_profile_id(id, full_name, email, avatar_url)
    `)
    .eq('relationship_type', 'GUARDIAN')
    .in('source_profile_id', memberIds);

  if (error) throw error;

  // Map to client format
  const clients = (data || []).map((link: any) => {
    const tutor = link.source;
    const student = link.target;

    return {
      id: student.id,
      full_name: student.full_name,
      email: student.email,
      avatar_url: student.avatar_url,
      tutor_name: tutor.full_name,
      tutor_id: tutor.id,
      since: link.created_at,
    };
  });

  return clients;
}
