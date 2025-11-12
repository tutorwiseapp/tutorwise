/**
 * Filename: apps/web/src/lib/api/profile-graph.ts
 * Purpose: ProfileGraphService - Unified Relationship Management (v4.6)
 * Created: 2025-11-12
 *
 * This service provides a clean API for managing all user-to-user relationships
 * in the new profile_graph table. It replaces the old connections table and
 * provides the foundation for:
 * - Social Links (Network v4.4)
 * - Guardian Links (Student Onboarding v5.0)
 * - Booking Links (Reviews v4.5)
 * - Agent relationships (Referrals v4.3)
 */

import { createClient } from '@/utils/supabase/client';

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

export type RelationshipType =
  | 'GUARDIAN'         // Parent -> Student
  | 'SOCIAL'           // User <-> User (mutual connection)
  | 'BOOKING'          // Client -> Tutor (completed booking)
  | 'AGENT_DELEGATION' // Tutor -> Agent (commission delegation)
  | 'AGENT_REFERRAL';  // Agent -> Client (referral attribution)

export type RelationshipStatus =
  | 'PENDING'   // Awaiting acceptance
  | 'ACTIVE'    // Currently valid
  | 'BLOCKED'   // User blocked
  | 'COMPLETED'; // Past event (e.g., booking)

export interface ProfileGraphLink {
  id: string;
  source_profile_id: string;
  target_profile_id: string;
  relationship_type: RelationshipType;
  status: RelationshipStatus;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateLinkParams {
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  status?: RelationshipStatus;
  metadata?: Record<string, any>;
}

export interface UpdateLinkParams {
  linkId: string;
  status?: RelationshipStatus;
  metadata?: Record<string, any>;
}

// ===================================================================
// PROFILE GRAPH SERVICE
// ===================================================================

export class ProfileGraphService {
  /**
   * Create a new relationship link
   *
   * @example
   * // Create a pending social connection request
   * await ProfileGraphService.createLink({
   *   sourceId: userId,
   *   targetId: friendId,
   *   type: 'SOCIAL',
   *   status: 'PENDING'
   * });
   *
   * // Create an active guardian link
   * await ProfileGraphService.createLink({
   *   sourceId: parentId,
   *   targetId: studentId,
   *   type: 'GUARDIAN',
   *   status: 'ACTIVE',
   *   metadata: { student_email: 'student@example.com' }
   * });
   */
  static async createLink(params: CreateLinkParams): Promise<ProfileGraphLink | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('profile_graph')
      .insert({
        source_profile_id: params.sourceId,
        target_profile_id: params.targetId,
        relationship_type: params.type,
        status: params.status || 'ACTIVE',
        metadata: params.metadata || null
      })
      .select()
      .single();

    if (error) {
      console.error('[ProfileGraphService] Error creating link:', error);
      throw new Error(`Failed to create ${params.type} link: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all relationships for a user
   *
   * @example
   * // Get all social links for a user
   * const socialLinks = await ProfileGraphService.getUserLinks(userId, 'SOCIAL', 'ACTIVE');
   *
   * // Get all guardian links
   * const students = await ProfileGraphService.getUserLinks(parentId, 'GUARDIAN');
   */
  static async getUserLinks(
    profileId: string,
    type?: RelationshipType,
    status?: RelationshipStatus
  ): Promise<ProfileGraphLink[]> {
    const supabase = createClient();

    let query = supabase
      .from('profile_graph')
      .select('*')
      .or(`source_profile_id.eq.${profileId},target_profile_id.eq.${profileId}`);

    if (type) query = query.eq('relationship_type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[ProfileGraphService] Error fetching links:', error);
      throw new Error(`Failed to fetch relationships: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get links where the user is the source
   *
   * @example
   * // Get all pending connection requests I sent
   * const sentRequests = await ProfileGraphService.getOutgoingLinks(userId, 'SOCIAL', 'PENDING');
   */
  static async getOutgoingLinks(
    profileId: string,
    type?: RelationshipType,
    status?: RelationshipStatus
  ): Promise<ProfileGraphLink[]> {
    const supabase = createClient();

    let query = supabase
      .from('profile_graph')
      .select('*')
      .eq('source_profile_id', profileId);

    if (type) query = query.eq('relationship_type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[ProfileGraphService] Error fetching outgoing links:', error);
      throw new Error(`Failed to fetch outgoing relationships: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get links where the user is the target
   *
   * @example
   * // Get all pending connection requests I received
   * const receivedRequests = await ProfileGraphService.getIncomingLinks(userId, 'SOCIAL', 'PENDING');
   */
  static async getIncomingLinks(
    profileId: string,
    type?: RelationshipType,
    status?: RelationshipStatus
  ): Promise<ProfileGraphLink[]> {
    const supabase = createClient();

    let query = supabase
      .from('profile_graph')
      .select('*')
      .eq('target_profile_id', profileId);

    if (type) query = query.eq('relationship_type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[ProfileGraphService] Error fetching incoming links:', error);
      throw new Error(`Failed to fetch incoming relationships: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update a relationship's status or metadata
   *
   * @example
   * // Accept a connection request
   * await ProfileGraphService.updateLink({
   *   linkId: requestId,
   *   status: 'ACTIVE'
   * });
   *
   * // Block a user
   * await ProfileGraphService.updateLink({
   *   linkId: linkId,
   *   status: 'BLOCKED'
   * });
   */
  static async updateLink(params: UpdateLinkParams): Promise<ProfileGraphLink | null> {
    const supabase = createClient();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (params.status) updateData.status = params.status;
    if (params.metadata) updateData.metadata = params.metadata;

    const { data, error } = await supabase
      .from('profile_graph')
      .update(updateData)
      .eq('id', params.linkId)
      .select()
      .single();

    if (error) {
      console.error('[ProfileGraphService] Error updating link:', error);
      throw new Error(`Failed to update relationship: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a relationship
   *
   * @example
   * // Remove a connection
   * await ProfileGraphService.deleteLink(linkId);
   */
  static async deleteLink(linkId: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
      .from('profile_graph')
      .delete()
      .eq('id', linkId);

    if (error) {
      console.error('[ProfileGraphService] Error deleting link:', error);
      throw new Error(`Failed to delete relationship: ${error.message}`);
    }

    return true;
  }

  /**
   * Check if a relationship exists between two users
   *
   * @example
   * // Check if users are connected
   * const areConnected = await ProfileGraphService.linkExists(userId, friendId, 'SOCIAL');
   */
  static async linkExists(
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    status?: RelationshipStatus
  ): Promise<boolean> {
    const supabase = createClient();

    let query = supabase
      .from('profile_graph')
      .select('id')
      .eq('source_profile_id', sourceId)
      .eq('target_profile_id', targetId)
      .eq('relationship_type', type);

    if (status) query = query.eq('status', status);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('[ProfileGraphService] Error checking link existence:', error);
      return false;
    }

    return data !== null;
  }

  // ===================================================================
  // DOMAIN-SPECIFIC HELPERS
  // ===================================================================

  /**
   * Get all guardian links (Parent -> Student relationships)
   *
   * @example
   * // Get all my students
   * const myStudents = await ProfileGraphService.getGuardianLinks(parentId);
   */
  static async getGuardianLinks(parentId: string): Promise<ProfileGraphLink[]> {
    return this.getOutgoingLinks(parentId, 'GUARDIAN', 'ACTIVE');
  }

  /**
   * Get all social connections (mutual connections)
   *
   * @example
   * // Get all my active social connections
   * const connections = await ProfileGraphService.getSocialLinks(userId);
   */
  static async getSocialLinks(
    profileId: string,
    status: RelationshipStatus = 'ACTIVE'
  ): Promise<ProfileGraphLink[]> {
    return this.getUserLinks(profileId, 'SOCIAL', status);
  }

  /**
   * Get pending social connection requests
   *
   * @example
   * // Get connection requests I received
   * const requests = await ProfileGraphService.getPendingSocialRequests(userId);
   */
  static async getPendingSocialRequests(profileId: string): Promise<ProfileGraphLink[]> {
    return this.getIncomingLinks(profileId, 'SOCIAL', 'PENDING');
  }

  /**
   * Get booking history
   *
   * @example
   * // Get all my completed bookings
   * const bookings = await ProfileGraphService.getBookingLinks(userId);
   */
  static async getBookingLinks(profileId: string): Promise<ProfileGraphLink[]> {
    return this.getUserLinks(profileId, 'BOOKING', 'COMPLETED');
  }

  /**
   * Create a social connection request
   *
   * @example
   * // Send a connection request
   * await ProfileGraphService.sendConnectionRequest(myId, friendId);
   */
  static async sendConnectionRequest(
    requesterId: string,
    receiverId: string
  ): Promise<ProfileGraphLink | null> {
    // Check if connection already exists
    const exists = await this.linkExists(requesterId, receiverId, 'SOCIAL');
    const reverseExists = await this.linkExists(receiverId, requesterId, 'SOCIAL');

    if (exists || reverseExists) {
      throw new Error('Connection already exists or is pending');
    }

    return this.createLink({
      sourceId: requesterId,
      targetId: receiverId,
      type: 'SOCIAL',
      status: 'PENDING'
    });
  }

  /**
   * Accept a social connection request
   *
   * @example
   * // Accept a connection request
   * await ProfileGraphService.acceptConnectionRequest(requestId);
   */
  static async acceptConnectionRequest(linkId: string): Promise<ProfileGraphLink | null> {
    return this.updateLink({
      linkId,
      status: 'ACTIVE'
    });
  }

  /**
   * Block a user
   *
   * @example
   * // Block a user
   * await ProfileGraphService.blockUser(linkId);
   */
  static async blockUser(linkId: string): Promise<ProfileGraphLink | null> {
    return this.updateLink({
      linkId,
      status: 'BLOCKED'
    });
  }
}
