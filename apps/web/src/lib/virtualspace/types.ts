/**
 * VirtualSpace Types (v5.9)
 *
 * Defines the core types for the VirtualSpace dual-mode feature:
 * - Standalone: Ad-hoc whiteboard rooms with invite links
 * - Booking: Linked to bookings with CaaS integration
 * - Free Help: Instant whiteboard sessions for free help
 */

// ============================================================================
// Database Types (match Supabase schema)
// ============================================================================

export type VirtualSpaceSessionType = 'standalone' | 'booking' | 'free_help';

export type VirtualSpaceSessionStatus = 'active' | 'completed' | 'expired';

export type VirtualSpaceParticipantRole = 'owner' | 'collaborator' | 'viewer';

/**
 * Database row type for virtualspace_sessions table
 */
export interface VirtualSpaceSessionRow {
  id: string;
  session_type: VirtualSpaceSessionType;
  booking_id: string | null;
  title: string;
  description: string | null;
  owner_id: string;
  status: VirtualSpaceSessionStatus;
  invite_token: string | null;
  invite_expires_at: string | null;
  max_participants: number;
  artifacts: VirtualSpaceArtifacts;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
  last_activity_at: string;
}

/**
 * Database row type for virtualspace_participants table
 */
export interface VirtualSpaceParticipantRow {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string | null;
  role: VirtualSpaceParticipantRole;
  joined_at: string;
  left_at: string | null;
}

/**
 * Artifacts stored in the session (whiteboard snapshots, etc.)
 */
export interface VirtualSpaceArtifacts {
  whiteboard_snapshot_url?: string;
  saved_at?: string;
  [key: string]: unknown;
}

// ============================================================================
// Context Types (used by components)
// ============================================================================

/**
 * Participant information for UI display
 */
export interface VirtualSpaceParticipant {
  id: string;
  userId: string;
  displayName: string;
  role: VirtualSpaceParticipantRole;
  avatarUrl?: string;
  isOnline?: boolean;
}

/**
 * Booking context when session is linked to a booking
 */
export interface VirtualSpaceBookingContext {
  id: string;
  tutorId: string;
  studentId: string;
  clientId?: string;
  serviceName: string;
  sessionStartTime?: string;
  sessionDuration?: number;
  status: string;
  isFreeHelp: boolean;
}

/**
 * Capabilities based on session mode and user role
 */
export interface VirtualSpaceCapabilities {
  /** Can mark session as complete (booking mode + tutor only) */
  canComplete: boolean;
  /** Can save whiteboard snapshot (all authenticated users) */
  canSaveSnapshot: boolean;
  /** Can invite others via link (standalone + owner only) */
  canInvite: boolean;
  /** Can remove participants (owner only) */
  canKickParticipants: boolean;
  /** Session completion triggers CaaS recalculation (booking mode only, not free_help) */
  triggersCaaS: boolean;
  /** Can edit session title/description (owner only) */
  canEditSession: boolean;
  /** Can end/delete session (owner only) */
  canEndSession: boolean;
}

/**
 * Main context object passed to VirtualSpace components
 */
export interface VirtualSpaceSession {
  /** Session ID (UUID) */
  sessionId: string;

  /** Session mode determines behavior and capabilities */
  mode: VirtualSpaceSessionType;

  /** Session title */
  title: string;

  /** Session description */
  description?: string;

  /** Session status */
  status: VirtualSpaceSessionStatus;

  /** Session owner info */
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl?: string;

  /** Booking context (only for booking and free_help modes) */
  booking?: VirtualSpaceBookingContext;

  /** All participants in the session */
  participants: VirtualSpaceParticipant[];

  /** Current user info */
  currentUserId: string;
  currentUserRole: VirtualSpaceParticipantRole;

  /** What the current user can do */
  capabilities: VirtualSpaceCapabilities;

  /** Ably channel name for real-time sync */
  channelName: string;

  /** Invite link (standalone mode only) */
  inviteUrl?: string;
  inviteExpiresAt?: string;

  /** Session timestamps */
  createdAt: string;
  lastActivityAt: string;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to create a standalone session
 */
export interface CreateSessionRequest {
  title?: string;
  description?: string;
}

/**
 * Response from creating a session
 */
export interface CreateSessionResponse {
  sessionId: string;
  inviteUrl: string;
  inviteToken: string;
}

/**
 * Request to join a session via invite token
 */
export interface JoinSessionRequest {
  inviteToken: string;
}

/**
 * Response from joining a session
 */
export interface JoinSessionResponse {
  sessionId: string;
  success: boolean;
}

/**
 * Request to save a whiteboard snapshot
 */
export interface SaveSnapshotRequest {
  snapshotData: string; // JSON string of tldraw store
}

/**
 * Response from saving a snapshot
 */
export interface SaveSnapshotResponse {
  snapshotUrl: string;
  savedAt: string;
}

/**
 * Session list item for dashboard/sidebar
 */
export interface VirtualSpaceSessionListItem {
  id: string;
  title: string;
  mode: VirtualSpaceSessionType;
  status: VirtualSpaceSessionStatus;
  participantCount: number;
  createdAt: string;
  lastActivityAt: string;
  isOwner: boolean;
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for VirtualSpaceClient component
 */
export interface VirtualSpaceClientProps {
  context: VirtualSpaceSession;
}

/**
 * Props for VirtualSpaceHeader component
 */
export interface VirtualSpaceHeaderProps {
  context: VirtualSpaceSession;
  onSaveSnapshot: () => Promise<void>;
  onMarkComplete?: () => Promise<void>;
  onInvite?: () => void;
  onLeave?: () => void;
}

/**
 * Props for EmbeddedWhiteboard component
 */
export interface EmbeddedWhiteboardProps {
  channelName: string;
  readOnly?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generate invite token (nanoid format)
 */
export type InviteToken = string;

/**
 * Session with joined relations (from Supabase query)
 */
export interface VirtualSpaceSessionWithRelations extends VirtualSpaceSessionRow {
  participants?: VirtualSpaceParticipantRow[];
  booking?: {
    id: string;
    tutor_id: string;
    student_id: string;
    client_id?: string;
    service_name: string;
    session_start_time?: string;
    session_duration?: number;
    status: string;
    booking_type?: string;
  };
}
