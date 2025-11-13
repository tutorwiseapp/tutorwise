/**
 * Students API utilities
 * Handles Guardian Link (student) fetching and management (v5.0)
 */

import { createClient } from '@/utils/supabase/client';
import type { StudentLink } from '@/types';

/**
 * Get all students (Guardian Links) for the current user
 * v5.0: Queries profile_graph table with relationship_type='GUARDIAN'
 */
export async function getMyStudents(): Promise<StudentLink[]> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Query profile_graph for GUARDIAN relationships
  const { data, error } = await supabase
    .from('profile_graph')
    .select(`
      id,
      source_profile_id,
      target_profile_id,
      status,
      metadata,
      created_at,
      student:target_profile_id(id, full_name, email, avatar_url, date_of_birth)
    `)
    .eq('relationship_type', 'GUARDIAN')
    .eq('source_profile_id', user.id)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map profile_graph records to StudentLink format
  const mappedStudents: StudentLink[] = (data || []).map((link: any) => ({
    id: link.id,
    guardian_id: link.source_profile_id,
    student_id: link.target_profile_id,
    status: 'active' as const,
    created_at: link.created_at,
    student: Array.isArray(link.student) ? link.student[0] : link.student,
  }));

  return mappedStudents;
}

/**
 * Invite a student to create a Guardian Link
 * v5.0: Sends invitation email or creates immediate link if student exists
 */
export async function inviteStudent(
  studentEmail: string,
  is13Plus: boolean
): Promise<{ success: boolean; message: string; student_existed?: boolean }> {
  const response = await fetch('/api/links/client-student', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      student_email: studentEmail,
      is_13_plus: is13Plus,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to invite student');
  }

  return response.json();
}

/**
 * Remove a Guardian Link (unlink a student)
 * v5.0: Deletes from profile_graph
 */
export async function removeStudent(linkId: string): Promise<void> {
  const response = await fetch(`/api/links/client-student/${linkId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove student');
  }
}
