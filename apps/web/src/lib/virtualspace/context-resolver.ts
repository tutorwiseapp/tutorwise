/**
 * VirtualSpace Context Resolver (v5.9)
 *
 * Resolves session context from the database and transforms it into
 * the VirtualSpaceSession interface used by components.
 *
 * Handles all three modes:
 * - Standalone: Ad-hoc rooms with invite links
 * - Booking: Linked to bookings with CaaS integration
 * - Free Help: Instant whiteboard for free help sessions
 */

import { createClient } from '@/utils/supabase/server';
import type {
  VirtualSpaceSession,
  VirtualSpaceParticipantRow,
  VirtualSpaceParticipant,
  VirtualSpaceCapabilities,
  VirtualSpaceBookingContext,
  VirtualSpaceSessionWithRelations,
} from './types';

/**
 * Error thrown when session access is denied
 */
export class VirtualSpaceAccessError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'FORBIDDEN' | 'EXPIRED' | 'INVALID'
  ) {
    super(message);
    this.name = 'VirtualSpaceAccessError';
  }
}

/**
 * Main context resolver class
 */
export class VirtualSpaceContextResolver {
  private supabase: Awaited<ReturnType<typeof createClient>>;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
  }

  /**
   * Resolve full context for a session + user combination
   */
  async resolve(sessionId: string, userId: string): Promise<VirtualSpaceSession> {
    // 1. Fetch session with participants and optional booking
    const session = await this.fetchSession(sessionId);

    if (!session) {
      throw new VirtualSpaceAccessError('Session not found', 'NOT_FOUND');
    }

    // 2. Check session status
    if (session.status === 'expired') {
      throw new VirtualSpaceAccessError('Session has expired', 'EXPIRED');
    }

    // 3. Validate user access
    const hasAccess = await this.validateAccess(session, userId);
    if (!hasAccess) {
      throw new VirtualSpaceAccessError('Access denied', 'FORBIDDEN');
    }

    // 4. Fetch participants
    const participants = await this.fetchParticipants(sessionId);

    // 5. Fetch owner profile
    const ownerProfile = await this.fetchProfile(session.owner_id);

    // 6. Determine current user's role
    const currentUserRole = this.resolveUserRole(session, participants, userId);

    // 7. Build capabilities based on mode and role
    const capabilities = this.resolveCapabilities(session, userId, currentUserRole);

    // 8. Build booking context if applicable
    const bookingContext = session.booking
      ? this.mapBookingContext(session.booking)
      : undefined;

    // 9. Build invite URL for standalone sessions
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const inviteUrl =
      session.session_type === 'standalone' && session.invite_token
        ? `${baseUrl}/virtualspace/join/${session.invite_token}`
        : undefined;

    // 10. Map participants to UI format
    const participantProfiles = await this.fetchParticipantProfiles(participants);

    return {
      sessionId: session.id,
      mode: session.session_type,
      title: session.title,
      description: session.description || undefined,
      status: session.status,
      ownerId: session.owner_id,
      ownerName: ownerProfile?.full_name || 'Unknown',
      ownerAvatarUrl: ownerProfile?.avatar_url || undefined,
      booking: bookingContext,
      participants: participantProfiles,
      currentUserId: userId,
      currentUserRole,
      capabilities,
      channelName: `virtualspace:${session.id}`,
      inviteUrl,
      inviteExpiresAt: session.invite_expires_at || undefined,
      createdAt: session.created_at,
      lastActivityAt: session.last_activity_at,
    };
  }

  /**
   * Resolve context for a booking (finds or creates session)
   */
  async resolveForBooking(
    bookingId: string,
    userId: string
  ): Promise<VirtualSpaceSession> {
    // Check if session already exists for this booking
    const { data: existingSession } = await this.supabase
      .from('virtualspace_sessions')
      .select('id')
      .eq('booking_id', bookingId)
      .single();

    if (existingSession) {
      return this.resolve(existingSession.id, userId);
    }

    // Fetch booking to validate access and get details
    const { data: booking, error: bookingError } = await this.supabase
      .from('bookings')
      .select(
        'id, tutor_id, student_id, client_id, service_name, status, booking_type'
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new VirtualSpaceAccessError('Booking not found', 'NOT_FOUND');
    }

    // Validate user is participant in booking
    if (booking.tutor_id !== userId && booking.student_id !== userId) {
      throw new VirtualSpaceAccessError(
        'You are not a participant in this booking',
        'FORBIDDEN'
      );
    }

    // Determine session type based on booking type
    const sessionType = booking.booking_type === 'free_help' ? 'free_help' : 'booking';

    // Create new session for this booking
    const { data: newSession, error: createError } = await this.supabase
      .from('virtualspace_sessions')
      .insert({
        session_type: sessionType,
        booking_id: bookingId,
        title: booking.service_name || 'Tutoring Session',
        owner_id: booking.tutor_id, // Tutor is always the owner
        status: 'active',
      })
      .select()
      .single();

    if (createError || !newSession) {
      throw new VirtualSpaceAccessError(
        'Failed to create session',
        'INVALID'
      );
    }

    // Add both tutor and student as participants
    const participantsToAdd = [
      { session_id: newSession.id, user_id: booking.tutor_id, role: 'owner' },
      { session_id: newSession.id, user_id: booking.student_id, role: 'collaborator' },
    ];

    await this.supabase.from('virtualspace_participants').insert(participantsToAdd);

    return this.resolve(newSession.id, userId);
  }

  /**
   * Create a standalone session
   */
  async createStandaloneSession(
    userId: string,
    title?: string,
    description?: string
  ): Promise<{ sessionId: string; inviteToken: string }> {
    const inviteToken = this.generateInviteToken();

    const { data: session, error } = await this.supabase
      .from('virtualspace_sessions')
      .insert({
        session_type: 'standalone',
        title: title || 'Untitled Session',
        description,
        owner_id: userId,
        status: 'active',
        invite_token: inviteToken,
        invite_expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(), // 24 hours
      })
      .select()
      .single();

    if (error || !session) {
      throw new VirtualSpaceAccessError('Failed to create session', 'INVALID');
    }

    // Add creator as owner participant
    await this.supabase.from('virtualspace_participants').insert({
      session_id: session.id,
      user_id: userId,
      role: 'owner',
    });

    return {
      sessionId: session.id,
      inviteToken,
    };
  }

  /**
   * Join a session via invite token
   */
  async joinSession(
    inviteToken: string,
    userId: string
  ): Promise<{ sessionId: string }> {
    const { data: session, error } = await this.supabase
      .from('virtualspace_sessions')
      .select('id, status, session_type, invite_expires_at, max_participants')
      .eq('invite_token', inviteToken)
      .single();

    if (error || !session) {
      throw new VirtualSpaceAccessError('Invalid invite link', 'NOT_FOUND');
    }

    if (session.status !== 'active') {
      throw new VirtualSpaceAccessError('Session is no longer active', 'EXPIRED');
    }

    if (
      session.invite_expires_at &&
      new Date(session.invite_expires_at) < new Date()
    ) {
      throw new VirtualSpaceAccessError('Invite link has expired', 'EXPIRED');
    }

    // Check if already a participant
    const { data: existingParticipant } = await this.supabase
      .from('virtualspace_participants')
      .select('id')
      .eq('session_id', session.id)
      .eq('user_id', userId)
      .single();

    if (!existingParticipant) {
      // Check participant limit
      const { count } = await this.supabase
        .from('virtualspace_participants')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id);

      if (count && count >= session.max_participants) {
        throw new VirtualSpaceAccessError(
          'Session has reached maximum participants',
          'FORBIDDEN'
        );
      }

      // Add as collaborator
      await this.supabase.from('virtualspace_participants').insert({
        session_id: session.id,
        user_id: userId,
        role: 'collaborator',
      });
    }

    return { sessionId: session.id };
  }

  /**
   * Update last activity timestamp (for expiration tracking)
   */
  async updateActivity(sessionId: string): Promise<void> {
    await this.supabase
      .from('virtualspace_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async fetchSession(
    sessionId: string
  ): Promise<VirtualSpaceSessionWithRelations | null> {
    const { data, error } = await this.supabase
      .from('virtualspace_sessions')
      .select(
        `
        *,
        booking:booking_id (
          id,
          tutor_id,
          student_id,
          client_id,
          service_name,
          session_start_time,
          session_duration,
          status,
          booking_type
        )
      `
      )
      .eq('id', sessionId)
      .single();

    if (error) return null;
    return data as VirtualSpaceSessionWithRelations;
  }

  private async fetchParticipants(
    sessionId: string
  ): Promise<VirtualSpaceParticipantRow[]> {
    const { data, error } = await this.supabase
      .from('virtualspace_participants')
      .select('*')
      .eq('session_id', sessionId)
      .is('left_at', null);

    if (error) return [];
    return data;
  }

  private async fetchProfile(
    userId: string
  ): Promise<{ full_name: string; avatar_url: string } | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  }

  private async fetchParticipantProfiles(
    participants: VirtualSpaceParticipantRow[]
  ): Promise<VirtualSpaceParticipant[]> {
    if (participants.length === 0) return [];

    const userIds = participants.map((p) => p.user_id);
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return participants.map((p) => {
      const profile = profileMap.get(p.user_id);
      return {
        id: p.id,
        userId: p.user_id,
        displayName: p.display_name || profile?.full_name || 'Unknown',
        role: p.role,
        avatarUrl: profile?.avatar_url || undefined,
      };
    });
  }

  private async validateAccess(
    session: VirtualSpaceSessionWithRelations,
    userId: string
  ): Promise<boolean> {
    // Owner always has access
    if (session.owner_id === userId) return true;

    // Check if user is a participant
    const { data: participant } = await this.supabase
      .from('virtualspace_participants')
      .select('id')
      .eq('session_id', session.id)
      .eq('user_id', userId)
      .is('left_at', null)
      .single();

    if (participant) return true;

    // For booking/free_help modes, check booking participant
    if (
      (session.session_type === 'booking' ||
        session.session_type === 'free_help') &&
      session.booking
    ) {
      return (
        session.booking.tutor_id === userId ||
        session.booking.student_id === userId
      );
    }

    return false;
  }

  private resolveUserRole(
    session: VirtualSpaceSessionWithRelations,
    participants: VirtualSpaceParticipantRow[],
    userId: string
  ): VirtualSpaceParticipant['role'] {
    // Owner is always 'owner'
    if (session.owner_id === userId) return 'owner';

    // Check participant record
    const participant = participants.find((p) => p.user_id === userId);
    if (participant) return participant.role;

    // Default to collaborator for booking participants
    return 'collaborator';
  }

  private resolveCapabilities(
    session: VirtualSpaceSessionWithRelations,
    userId: string,
    role: VirtualSpaceParticipant['role']
  ): VirtualSpaceCapabilities {
    const isOwner = role === 'owner';
    const isBookingMode = session.session_type === 'booking';
    const isFreeHelpMode = session.session_type === 'free_help';
    const isStandaloneMode = session.session_type === 'standalone';
    const isTutor = session.booking?.tutor_id === userId;

    return {
      // Only tutor can mark booking sessions as complete
      canComplete: isBookingMode && isTutor,

      // All authenticated participants can save snapshots
      canSaveSnapshot: true,

      // Only standalone owners can invite
      canInvite: isStandaloneMode && isOwner,

      // Only owners can kick participants
      canKickParticipants: isOwner,

      // CaaS only triggers for paid bookings, not free_help
      triggersCaaS: isBookingMode && !isFreeHelpMode,

      // Only owners can edit session details
      canEditSession: isOwner,

      // Only owners can end/delete session
      canEndSession: isOwner,
    };
  }

  private mapBookingContext(booking: NonNullable<VirtualSpaceSessionWithRelations['booking']>): VirtualSpaceBookingContext {
    return {
      id: booking.id,
      tutorId: booking.tutor_id,
      studentId: booking.student_id,
      clientId: booking.client_id,
      serviceName: booking.service_name,
      sessionStartTime: booking.session_start_time,
      sessionDuration: booking.session_duration,
      status: booking.status,
      isFreeHelp: booking.booking_type === 'free_help',
    };
  }

  private generateInviteToken(): string {
    // Generate a URL-safe random token (similar to nanoid)
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    for (let i = 0; i < 12; i++) {
      token += chars[array[i] % chars.length];
    }
    return token;
  }
}

/**
 * Factory function to create a resolver instance
 */
export async function createVirtualSpaceResolver(): Promise<VirtualSpaceContextResolver> {
  const supabase = await createClient();
  return new VirtualSpaceContextResolver(supabase);
}
