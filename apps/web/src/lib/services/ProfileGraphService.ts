/**
 * Filename: apps/web/src/lib/services/ProfileGraphService.ts
 * Purpose: Business logic for profile_graph operations (v4.6)
 * Created: 2025-11-14
 * Pattern: Service Layer (API Solution Design v5.1)
 */

import { createClient } from '@/utils/supabase/server';
import { sendConnectionRequestNotification, sendConnectionInvitation } from '@/lib/email';

/**
 * Profile Graph relationship types
 */
export type RelationshipType = 'SOCIAL' | 'GUARDIAN' | 'AGENT_CLIENT';

/**
 * Profile Graph status values
 */
export type ProfileGraphStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED';

/**
 * Connection data interface (for SOCIAL relationships)
 */
export interface ConnectionData {
  id: string;
  source_profile_id: string;
  target_profile_id: string;
  status: ProfileGraphStatus;
  metadata?: {
    message?: string;
  } | null;
  created_at: string;
  source?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    bio?: string;
  };
  target?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    bio?: string;
  };
}

/**
 * Guardian link data interface (for GUARDIAN relationships)
 */
export interface GuardianLinkData {
  id: string;
  source_profile_id: string;
  target_profile_id: string;
  status: ProfileGraphStatus;
  metadata?: {
    invite_token?: string;
    invite_expires_at?: string;
  } | null;
  created_at: string;
  guardian?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  student?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

/**
 * ProfileGraphService
 * Encapsulates all business logic for profile_graph operations
 */
export class ProfileGraphService {
  /**
   * Get all connections for a user (SOCIAL relationships)
   */
  static async getConnections(userId: string): Promise<ConnectionData[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profile_graph')
      .select(`
        id,
        source_profile_id,
        target_profile_id,
        status,
        metadata,
        created_at,
        source:source_profile_id(id, full_name, email, avatar_url, bio),
        target:target_profile_id(id, full_name, email, avatar_url, bio)
      `)
      .eq('relationship_type', 'SOCIAL')
      .or(`source_profile_id.eq.${userId},target_profile_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data as ConnectionData[];
  }

  /**
   * Create connection request(s) to one or more users
   */
  static async createConnectionRequests({
    requesterId,
    receiverIds,
    message,
  }: {
    requesterId: string;
    receiverIds: string[];
    message?: string;
  }): Promise<ConnectionData[]> {
    const supabase = await createClient();

    // Check for existing connections
    const { data: existingConnections } = await supabase
      .from('profile_graph')
      .select('target_profile_id, status')
      .eq('source_profile_id', requesterId)
      .eq('relationship_type', 'SOCIAL')
      .in('target_profile_id', receiverIds);

    const existingMap = new Map(
      existingConnections?.map(c => [c.target_profile_id, c.status]) || []
    );

    // Filter out users who are already connected or have pending requests
    const newReceiverIds = receiverIds.filter(id => !existingMap.has(id));

    if (newReceiverIds.length === 0) {
      throw new Error('All users are already connected or have pending requests');
    }

    // Check for self-connection attempts
    if (newReceiverIds.includes(requesterId)) {
      throw new Error('Cannot send connection request to yourself');
    }

    // Verify receiver profiles exist
    const { data: receiverProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', newReceiverIds);

    if (profileError || !receiverProfiles || receiverProfiles.length !== newReceiverIds.length) {
      throw new Error('One or more users not found');
    }

    // Create connection requests
    const connections = newReceiverIds.map(receiverId => ({
      source_profile_id: requesterId,
      target_profile_id: receiverId,
      relationship_type: 'SOCIAL',
      status: 'PENDING',
      metadata: message ? { message } : null,
    }));

    const { data, error } = await supabase
      .from('profile_graph')
      .insert(connections)
      .select(`
        id,
        target_profile_id,
        status,
        created_at,
        target:target_profile_id(id, full_name, email, avatar_url)
      `);

    if (error) throw error;

    return data as ConnectionData[];
  }

  /**
   * Accept a connection request (update status to ACTIVE)
   */
  static async acceptConnection(connectionId: string, userId: string): Promise<void> {
    const supabase = await createClient();

    // Verify user is the target (receiver) of the connection
    const { data: connection, error: fetchError } = await supabase
      .from('profile_graph')
      .select('target_profile_id')
      .eq('id', connectionId)
      .eq('relationship_type', 'SOCIAL')
      .single();

    if (fetchError) throw fetchError;
    if (connection.target_profile_id !== userId) {
      throw new Error('Unauthorized: You can only accept requests sent to you');
    }

    const { error } = await supabase
      .from('profile_graph')
      .update({ status: 'ACTIVE' })
      .eq('id', connectionId)
      .eq('relationship_type', 'SOCIAL');

    if (error) throw error;
  }

  /**
   * Reject a connection request (update status to BLOCKED)
   */
  static async rejectConnection(connectionId: string, userId: string): Promise<void> {
    const supabase = await createClient();

    // Verify user is the target (receiver) of the connection
    const { data: connection, error: fetchError } = await supabase
      .from('profile_graph')
      .select('target_profile_id')
      .eq('id', connectionId)
      .eq('relationship_type', 'SOCIAL')
      .single();

    if (fetchError) throw fetchError;
    if (connection.target_profile_id !== userId) {
      throw new Error('Unauthorized: You can only reject requests sent to you');
    }

    const { error } = await supabase
      .from('profile_graph')
      .update({ status: 'BLOCKED' })
      .eq('id', connectionId)
      .eq('relationship_type', 'SOCIAL');

    if (error) throw error;
  }

  /**
   * Remove a connection (delete from profile_graph)
   */
  static async removeConnection(connectionId: string, userId: string): Promise<void> {
    const supabase = await createClient();

    // Verify user is either source or target of the connection
    const { data: connection, error: fetchError } = await supabase
      .from('profile_graph')
      .select('source_profile_id, target_profile_id')
      .eq('id', connectionId)
      .eq('relationship_type', 'SOCIAL')
      .single();

    if (fetchError) throw fetchError;
    if (connection.source_profile_id !== userId && connection.target_profile_id !== userId) {
      throw new Error('Unauthorized: You can only remove your own connections');
    }

    const { error } = await supabase
      .from('profile_graph')
      .delete()
      .eq('id', connectionId)
      .eq('relationship_type', 'SOCIAL');

    if (error) throw error;
  }

  /**
   * Get linked students for a guardian (GUARDIAN relationships)
   */
  static async getLinkedStudents(guardianId: string): Promise<GuardianLinkData[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profile_graph')
      .select(`
        id,
        source_profile_id,
        target_profile_id,
        status,
        metadata,
        created_at,
        guardian:source_profile_id(id, full_name, email, avatar_url),
        student:target_profile_id(id, full_name, email, avatar_url)
      `)
      .eq('relationship_type', 'GUARDIAN')
      .eq('source_profile_id', guardianId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data as GuardianLinkData[];
  }

  /**
   * Create guardian-student link invitation
   */
  static async createGuardianInvite({
    guardianId,
    studentEmail,
    inviteToken,
    expiresAt,
  }: {
    guardianId: string;
    studentEmail: string;
    inviteToken: string;
    expiresAt: Date;
  }): Promise<GuardianLinkData> {
    const supabase = await createClient();

    // Check if student exists
    const { data: existingStudent } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', studentEmail)
      .single();

    if (existingStudent) {
      // Student already exists - create PENDING link
      const { data, error } = await supabase
        .from('profile_graph')
        .insert({
          source_profile_id: guardianId,
          target_profile_id: existingStudent.id,
          relationship_type: 'GUARDIAN',
          status: 'PENDING',
          metadata: {
            invite_token: inviteToken,
            invite_expires_at: expiresAt.toISOString(),
          },
        })
        .select(`
          id,
          source_profile_id,
          target_profile_id,
          status,
          metadata,
          created_at,
          guardian:source_profile_id(id, full_name, email, avatar_url),
          student:target_profile_id(id, full_name, email, avatar_url)
        `)
        .single();

      if (error) throw error;

      return data as GuardianLinkData;
    } else {
      // Student doesn't exist - store invite metadata for when they sign up
      // For now, we'll create a placeholder record that will be updated when student signs up
      throw new Error('Student not found - invite email flow not yet implemented');
    }
  }

  /**
   * Validate a guardian-student link
   */
  static async validateLink(guardianId: string, studentId: string): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profile_graph')
      .select('id, status')
      .eq('relationship_type', 'GUARDIAN')
      .eq('source_profile_id', guardianId)
      .eq('target_profile_id', studentId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error) throw error;

    return !!data;
  }

  /**
   * Send email notification for connection request
   */
  static async sendConnectionRequestEmail({
    senderName,
    senderEmail,
    receiverEmail,
    message,
    networkUrl,
  }: {
    senderName: string;
    senderEmail: string;
    receiverEmail: string;
    message?: string;
    networkUrl: string;
  }): Promise<void> {
    await sendConnectionRequestNotification({
      to: receiverEmail,
      senderName,
      senderEmail,
      message,
      networkUrl,
    });
  }

  /**
   * Send invitation email to new user
   */
  static async sendInvitationEmail({
    senderName,
    receiverEmail,
    referralUrl,
  }: {
    senderName: string;
    receiverEmail: string;
    referralUrl: string;
  }): Promise<void> {
    await sendConnectionInvitation({
      to: receiverEmail,
      senderName,
      referralUrl,
    });
  }
}
