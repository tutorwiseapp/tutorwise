/**
 * Organisation API utilities
 * Handles organisation/agency management (v6.1)
 * Reference: organisation-solution-design-v6.md
 */

import { createClient } from '@/utils/supabase/client';
import type { OrganisationSubscription } from '@/lib/stripe/subscription-utils';

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
  timezone?: string | null; // v8.1: Organisation timezone setting
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
  added_at: string;
  // Agency management fields (v6.3)
  commission_rate: number | null; // Individual override rate (%). If null, uses org default
  internal_notes: string | null; // Private notes for agency owner
  is_verified: boolean; // Internal verification flag
  member_role?: 'member' | 'admin'; // v7.2: Admin role (different from job role above) - optional until migration runs
  // Analytics fields (v6.4)
  total_revenue: number; // Total revenue from referral commissions
  last_session_at: string | null; // Most recent session date
  active_students_count: number; // Count of distinct students with confirmed/completed bookings
  // Verification documents (v6.4)
  dbs_certificate_url: string | null;
  identity_verification_document_url: string | null;
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
 * v6.4: Added analytics and verification document fields
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
  console.log('[getOrganisationMembers] Fetching members for organisation:', organisationId);

  // First, get all group_members records for this organisation
  // Try to fetch with role column (v7.2), fallback to without if column doesn't exist yet
  let groupMembersData: any[] | null = null;
  let groupMembersError: any = null;

  const result = await supabase
    .from('group_members')
    .select('added_at, connection_id, commission_rate, internal_notes, is_verified, role')
    .eq('group_id', organisationId);

  groupMembersData = result.data;
  groupMembersError = result.error;

  // If role column doesn't exist yet (before migration 128), try without it
  if (groupMembersError && groupMembersError.message?.includes('column') && groupMembersError.message?.includes('role')) {
    console.log('[getOrganisationMembers] Role column not found, fetching without it (pre-migration)');
    const fallbackResult = await supabase
      .from('group_members')
      .select('added_at, connection_id, commission_rate, internal_notes, is_verified')
      .eq('group_id', organisationId);

    groupMembersData = fallbackResult.data;
    groupMembersError = fallbackResult.error;
  }

  if (groupMembersError) {
    console.error('[getOrganisationMembers] ❌ Failed to fetch group_members:', groupMembersError);
    throw groupMembersError;
  }

  console.log('[getOrganisationMembers] Found group_members:', groupMembersData?.length || 0);

  if (!groupMembersData || groupMembersData.length === 0) {
    return [];
  }

  // Now fetch the profile_graph connections for these connection_ids
  const connectionIds = groupMembersData.map(gm => gm.connection_id);
  const { data: connectionsData, error: connectionsError } = await supabase
    .from('profile_graph')
    .select(`
      id,
      source_profile_id,
      target_profile_id
    `)
    .in('id', connectionIds);

  if (connectionsError) {
    console.error('[getOrganisationMembers] ❌ Failed to fetch connections:', connectionsError);
    throw connectionsError;
  }

  console.log('[getOrganisationMembers] Found connections:', connectionsData?.length || 0);

  // Get all unique profile IDs (excluding the current user)
  const profileIds = new Set<string>();
  (connectionsData || []).forEach((conn: any) => {
    if (conn.source_profile_id !== user.id) profileIds.add(conn.source_profile_id);
    if (conn.target_profile_id !== user.id) profileIds.add(conn.target_profile_id);
  });

  console.log('[getOrganisationMembers] Fetching profiles:', profileIds.size);

  // Fetch all profiles in one query
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      avatar_url,
      bio,
      city,
      dbs_certificate_url,
      identity_verification_document_url
    `)
    .in('id', Array.from(profileIds));

  if (profilesError) {
    console.error('[getOrganisationMembers] ❌ Failed to fetch profiles:', profilesError);
    throw profilesError;
  }

  console.log('[getOrganisationMembers] Found profiles:', profilesData?.length || 0);

  // Create a map of profile_id -> profile data
  const profilesMap = new Map(
    (profilesData || []).map((p: any) => [p.id, p])
  );

  // Create a map of connection_id -> connection data
  const connectionsMap = new Map(
    (connectionsData || []).map((c: any) => [c.id, c])
  );

  const data = groupMembersData.map((groupMember: any) => {
    const connection = connectionsMap.get(groupMember.connection_id);
    if (!connection) {
      console.warn('[getOrganisationMembers] Connection not found for:', groupMember.connection_id);
      return null;
    }

    // Find the member profile (the one that's NOT the current user)
    const memberProfileId = connection.source_profile_id === user.id
      ? connection.target_profile_id
      : connection.source_profile_id;

    const memberProfile = profilesMap.get(memberProfileId);
    if (!memberProfile) {
      console.warn('[getOrganisationMembers] Profile not found for member:', memberProfileId);
      return null;
    }

    // Return the member profile directly - no need for complex source/target mapping
    return {
      ...groupMember,
      member_profile: memberProfile,
      connection_id: connection.id,
    };
  }).filter(Boolean);

  console.log('[getOrganisationMembers] Mapped members:', data?.length || 0);

  // Fetch analytics for all members using the database function
  const { data: analyticsData, error: analyticsError } = await supabase
    .rpc('get_agency_member_analytics', { org_id: organisationId });

  if (analyticsError) {
    console.error('[getOrganisationMembers] Analytics fetch error:', analyticsError);
  }

  // Create a map for quick analytics lookup
  const analyticsMap = new Map<string, {
    member_id: string;
    total_revenue: number;
    last_session_at: string | null;
    active_students: number;
  }>(
    (analyticsData || []).map((a: any) => [a.member_id, a])
  );

  // Map to OrganisationMember format
  let members: OrganisationMember[] = [];
  try {
    members = (data || []).map((item: any) => {
      const memberProfile = item.member_profile;

      // Get analytics for this member
      const analytics = analyticsMap.get(memberProfile.id) ?? {
        member_id: memberProfile.id,
        total_revenue: 0,
        last_session_at: null,
        active_students: 0,
      };

      return {
        id: memberProfile.id,
        connection_id: item.connection_id,
        full_name: memberProfile.full_name,
        email: memberProfile.email,
        avatar_url: memberProfile.avatar_url,
        bio: memberProfile.bio,
        role: 'Tutor', // Default to Tutor for organisation members
        location: memberProfile.city || null,
        added_at: item.added_at,
        // Agency management fields
        commission_rate: item.commission_rate,
        internal_notes: item.internal_notes,
        is_verified: item.is_verified || false,
        member_role: (item.role || 'member') as 'member' | 'admin', // v7.2: Admin role
        // Analytics fields
        total_revenue: Number(analytics.total_revenue) || 0,
        last_session_at: analytics.last_session_at,
        active_students_count: analytics.active_students || 0,
        // Verification documents
        dbs_certificate_url: memberProfile.dbs_certificate_url,
        identity_verification_document_url: memberProfile.identity_verification_document_url,
      };
    });
  } catch (mappingError) {
    console.error('[getOrganisationMembers] ❌ Error during final mapping:', mappingError);
    console.error('[getOrganisationMembers] Data that caused error:', {
      dataLength: data?.length,
      data: JSON.stringify(data, null, 2),
    });
    throw mappingError;
  }

  console.log('[getOrganisationMembers] 🔍 Final members array before return:', {
    length: members.length,
    memberIds: members.map(m => m.id),
    firstMember: members[0] ? {
      id: members[0].id,
      full_name: members[0].full_name,
      email: members[0].email,
      connection_id: members[0].connection_id,
    } : null,
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

  // All authenticated users can create organisations
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
 * Update member settings (commission rate, verification status, notes, admin role)
 * Only the organisation owner can call this function
 */
export async function updateMemberSettings(
  organisationId: string,
  connectionId: string,
  updates: {
    commission_rate?: number | null;
    internal_notes?: string | null;
    is_verified?: boolean;
    role?: 'member' | 'admin';
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
  // Try with role column first, fallback without if it doesn't exist
  let data: any = null;
  let error: any = null;

  const updateResult = await supabase
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
      role,
      profile_graph:connection_id!inner(
        id,
        source:source_profile_id(
          id,
          full_name,
          email,
          avatar_url,
          bio,
          city,
          dbs_certificate_url,
          identity_verification_document_url
        ),
        target:target_profile_id(
          id,
          full_name,
          email,
          avatar_url,
          bio,
          city,
          dbs_certificate_url,
          identity_verification_document_url
        )
      )
    `)
    .single();

  data = updateResult.data;
  error = updateResult.error;

  // If role column doesn't exist yet (before migration 128), try without it
  if (error && error.message?.includes('column') && error.message?.includes('role')) {
    console.log('[updateMemberSettings] Role column not found, updating without it (pre-migration)');

    // Remove role from updates if it exists
    const { role: _removedRole, ...updatesWithoutRole } = updates;

    const fallbackResult = await supabase
      .from('group_members')
      .update(updatesWithoutRole)
      .eq('group_id', organisationId)
      .eq('connection_id', connectionId)
      .select(`
        added_at,
        connection_id,
        commission_rate,
        internal_notes,
        is_verified,
        profile_graph:connection_id!inner(
          id,
          source:source_profile_id(
            id,
            full_name,
            email,
            avatar_url,
            bio,
            city,
            dbs_certificate_url,
            identity_verification_document_url
          ),
          target:target_profile_id(
            id,
            full_name,
            email,
            avatar_url,
            bio,
            city,
            dbs_certificate_url,
            identity_verification_document_url
          )
        )
      `)
      .single();

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

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
    role: 'Tutor',
    location: memberProfile.city || null,
    added_at: data.added_at,
    commission_rate: data.commission_rate,
    internal_notes: data.internal_notes,
    is_verified: data.is_verified || false,
    member_role: (data.role || 'member') as 'member' | 'admin', // v7.2: Admin role
    // Analytics fields - not fetched in update, set to defaults
    total_revenue: 0,
    last_session_at: null,
    active_students_count: 0,
    // Verification documents - not fetched in update
    dbs_certificate_url: memberProfile.dbs_certificate_url || null,
    identity_verification_document_url: memberProfile.identity_verification_document_url || null,
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

/**
 * Get organisation subscription status (client-safe)
 */
export async function getOrganisationSubscription(
  organisationId: string
): Promise<OrganisationSubscription | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('organisation_subscriptions')
    .select('*')
    .eq('organisation_id', organisationId)
    .single();

  if (error) {
    // No subscription exists (new organisation)
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching organisation subscription:', error);
    throw error;
  }

  return data as OrganisationSubscription;
}

/**
 * Recruitment Application interface
 */
export interface RecruitmentApplication {
  id: string;
  applicant_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_avatar_url: string | null;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  expertise: string;
  subjects: string[];
  why_join: string;
  availability: string[];
  tuition_fee_expectation: number | null;
  salary_expectation: number | null;
  applied_at: string;
  created_at: string;
}

/**
 * Get all recruitment applications for an organisation
 * Returns applications from profile_graph with relationship_type='ORGANISATION_RECRUITMENT'
 */
export async function getOrganisationRecruitments(
  organisationId: string
): Promise<RecruitmentApplication[]> {
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
    throw new Error('Unauthorized: You do not own this organisation');
  }

  // Query profile_graph for ORGANISATION_RECRUITMENT relationships
  // target_profile_id should be the organisation owner (user.id)
  const { data, error } = await supabase
    .from('profile_graph')
    .select(`
      id,
      source_profile_id,
      status,
      metadata,
      created_at,
      source:source_profile_id(
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('relationship_type', 'ORGANISATION_RECRUITMENT')
    .eq('target_profile_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    // Log but don't throw - recruitments are optional and RLS may block access
    console.warn('[getOrganisationRecruitments] Query error (returning empty):', error);
    return [];
  }

  // Map to RecruitmentApplication format
  const applications: RecruitmentApplication[] = (data || []).map((app: any) => {
    const applicant = app.source;
    const metadata = app.metadata || {};

    return {
      id: app.id,
      applicant_id: applicant.id,
      applicant_name: applicant.full_name || 'Unknown',
      applicant_email: applicant.email,
      applicant_avatar_url: applicant.avatar_url,
      status: app.status as 'PENDING' | 'ACTIVE' | 'REJECTED',
      expertise: metadata.expertise || '',
      subjects: metadata.subjects || [],
      why_join: metadata.why_join || '',
      availability: metadata.availability || [],
      tuition_fee_expectation: metadata.tuition_fee_expectation || null,
      salary_expectation: metadata.salary_expectation || null,
      applied_at: metadata.applied_at || app.created_at,
      created_at: app.created_at,
    };
  });

  return applications;
}

/**
 * ============================================================================
 * ORGANISATION SUBSCRIPTION PAYMENT METHODS
 * ============================================================================
 * Functions for managing payment methods (cards) for organisation subscriptions
 */

export interface OrganisationCard {
  id: string;
  brand: string | undefined;
  last4: string | undefined;
  exp_month: number | undefined;
  exp_year: number | undefined;
}

/**
 * Get saved payment methods for organisation subscription
 */
export async function getOrganisationCards(organisationId: string): Promise<{
  cards: OrganisationCard[];
  defaultPaymentMethodId: string | null;
}> {
  const response = await fetch('/api/stripe/organisation/get-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organisationId }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch organisation cards');
  }

  const data = await response.json();
  return {
    cards: data.cards || [],
    defaultPaymentMethodId: data.defaultPaymentMethodId || null,
  };
}

/**
 * Set default payment method for organisation subscription
 */
export async function setOrganisationDefaultCard(
  organisationId: string,
  paymentMethodId: string
): Promise<void> {
  const response = await fetch('/api/stripe/organisation/set-default-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organisationId, paymentMethodId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to set default card');
  }
}

/**
 * Remove a payment method from organisation subscription
 */
export async function removeOrganisationCard(
  organisationId: string,
  paymentMethodId: string
): Promise<void> {
  const response = await fetch('/api/stripe/organisation/remove-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organisationId, paymentMethodId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to remove card');
  }
}

/**
 * Create checkout session to add new payment method for organisation subscription
 */
export async function createOrganisationCardCheckoutSession(
  organisationId: string
): Promise<string> {
  const response = await fetch('/api/stripe/organisation/add-card-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organisationId }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create checkout session');
  }

  const { sessionId } = await response.json();

  if (!sessionId) {
    throw new Error('Invalid session ID received');
  }

  return sessionId;
}
