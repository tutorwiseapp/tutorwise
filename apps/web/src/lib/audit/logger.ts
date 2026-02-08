/**
 * Filename: apps/web/src/lib/audit/logger.ts
 * Purpose: Audit logging utility for compliance and security tracking
 * Created: 2026-02-08
 * Students Audit Fix #5: Implement audit logging for all student operations
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

export interface AuditLogEntry {
  profile_id: string;
  action_type: string;  // e.g., 'student.invitation_sent', 'student.link_created'
  module: string;       // e.g., 'students', 'bookings', 'network'
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log an audit event to the audit_log table
 * Uses service role client to bypass RLS (audit logs are write-only)
 *
 * @param entry - Audit log entry data
 * @returns Promise<void>
 *
 * @example
 * await logAuditEvent({
 *   profile_id: user.id,
 *   action_type: 'student.invitation_sent',
 *   module: 'students',
 *   details: {
 *     student_email: 'student@example.com',
 *     invitation_id: 'uuid'
 *   }
 * });
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Use service role client to bypass RLS
    // Audit logs are write-only to prevent tampering
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from('audit_log').insert({
      profile_id: entry.profile_id,
      action_type: entry.action_type,
      module: entry.module,
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Log error but don't fail the request
      console.error('[audit-log] Failed to log event:', {
        action_type: entry.action_type,
        error: error.message,
      });
    }
  } catch (error) {
    // Don't fail the request if audit logging fails
    // But log it for monitoring
    console.error('[audit-log] Exception in logAuditEvent:', error);
  }
}

/**
 * Extract IP address from Next.js request
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 *
 * @param request - NextRequest object
 * @returns IP address string or undefined
 */
export function getClientIP(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  // Priority: Cloudflare > X-Real-IP > X-Forwarded-For
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();

  return undefined;
}

/**
 * Get user agent from request
 *
 * @param request - NextRequest object
 * @returns User agent string or undefined
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Student-specific audit actions
 * Provides type-safe action names for student operations
 */
export const StudentAuditActions = {
  INVITATION_SENT: 'student.invitation_sent',
  INVITATION_ACCEPTED: 'student.invitation_accepted',
  INVITATION_EXPIRED: 'student.invitation_expired',
  INVITATION_REVOKED: 'student.invitation_revoked',
  LINK_CREATED: 'student.link_created',
  LINK_REMOVED: 'student.link_removed',
  LINK_REMOVED_BLOCKED: 'student.link_removed_blocked', // Blocked by active bookings
  STUDENT_ASSIGNED: 'student.booking_assigned',
  STUDENT_UNASSIGNED: 'student.booking_unassigned',
} as const;

/**
 * Helper function to log student invitation sent
 */
export async function logStudentInvitationSent(
  guardianId: string,
  studentEmail: string,
  invitationId: string,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    profile_id: guardianId,
    action_type: StudentAuditActions.INVITATION_SENT,
    module: 'students',
    details: {
      student_email: studentEmail,
      invitation_id: invitationId,
    },
    ip_address: request ? getClientIP(request) : undefined,
    user_agent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper function to log guardian link created
 */
export async function logGuardianLinkCreated(
  guardianId: string,
  studentId: string,
  linkId: string,
  createdVia: 'direct_link' | 'invitation',
  request?: Request
): Promise<void> {
  await logAuditEvent({
    profile_id: guardianId,
    action_type: StudentAuditActions.LINK_CREATED,
    module: 'students',
    details: {
      student_id: studentId,
      link_id: linkId,
      created_via: createdVia,
    },
    ip_address: request ? getClientIP(request) : undefined,
    user_agent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper function to log guardian link removed
 */
export async function logGuardianLinkRemoved(
  guardianId: string,
  studentId: string,
  linkId: string,
  activeBookingsChecked: boolean,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    profile_id: guardianId,
    action_type: StudentAuditActions.LINK_REMOVED,
    module: 'students',
    details: {
      student_id: studentId,
      link_id: linkId,
      active_bookings_checked: activeBookingsChecked,
    },
    ip_address: request ? getClientIP(request) : undefined,
    user_agent: request ? getUserAgent(request) : undefined,
  });
}

/**
 * Helper function to log student assigned to booking
 */
export async function logStudentAssigned(
  clientId: string,
  bookingId: string,
  studentId: string,
  request?: Request
): Promise<void> {
  await logAuditEvent({
    profile_id: clientId,
    action_type: StudentAuditActions.STUDENT_ASSIGNED,
    module: 'students',
    details: {
      booking_id: bookingId,
      student_id: studentId,
    },
    ip_address: request ? getClientIP(request) : undefined,
    user_agent: request ? getUserAgent(request) : undefined,
  });
}
