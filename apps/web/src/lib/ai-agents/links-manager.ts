/**
 * Filename: links-manager.ts
 * Purpose: AI Tutor Links Manager - Manage URL references
 * Created: 2026-02-23
 * Version: v1.0
 */

import { createClient } from '@/utils/supabase/server';

export interface AITutorLink {
  id: string;
  ai_tutor_id: string;
  url: string;
  title?: string;
  description?: string;
  link_type?: string;
  skills?: string[];
  priority: number;
  status: 'active' | 'broken' | 'removed';
  added_at: string;
  last_accessed_at?: string;
}

export interface AITutorLinkCreateInput {
  url: string;
  title?: string;
  description?: string;
  link_type?: string;
  skills?: string[];
  priority?: number;
}

/**
 * List all links for an AI tutor
 */
export async function listAITutorLinks(aiTutorId: string): Promise<AITutorLink[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_tutor_links')
    .select('*')
    .eq('ai_tutor_id', aiTutorId)
    .eq('status', 'active')
    .order('priority', { ascending: true })
    .order('added_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Create new link for AI tutor
 */
export async function createAITutorLink(
  aiTutorId: string,
  input: AITutorLinkCreateInput,
  userId: string
): Promise<AITutorLink> {
  const supabase = await createClient();

  // Verify ownership
  const { data: tutor } = await supabase
    .from('ai_tutors')
    .select('owner_id')
    .eq('id', aiTutorId)
    .eq('owner_id', userId)
    .single();

  if (!tutor) {
    throw new Error('AI tutor not found or access denied');
  }

  // Create link
  const { data, error } = await supabase
    .from('ai_tutor_links')
    .insert({
      ai_tutor_id: aiTutorId,
      url: input.url,
      title: input.title,
      description: input.description,
      link_type: input.link_type,
      skills: input.skills || [],
      priority: input.priority || 2,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Update link
 */
export async function updateAITutorLink(
  linkId: string,
  input: Partial<AITutorLinkCreateInput>,
  userId: string
): Promise<AITutorLink> {
  const supabase = await createClient();

  // Verify ownership via AI tutor
  const { data: link } = await supabase
    .from('ai_tutor_links')
    .select('ai_tutor_id, ai_tutors!inner(owner_id)')
    .eq('id', linkId)
    .single();

  if (!link || (link as any).ai_tutors.owner_id !== userId) {
    throw new Error('Link not found or access denied');
  }

  // Update link
  const { data, error } = await supabase
    .from('ai_tutor_links')
    .update(input)
    .eq('id', linkId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Delete link
 */
export async function deleteAITutorLink(linkId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Verify ownership via AI tutor
  const { data: link } = await supabase
    .from('ai_tutor_links')
    .select('ai_tutor_id, ai_tutors!inner(owner_id)')
    .eq('id', linkId)
    .single();

  if (!link || (link as any).ai_tutors.owner_id !== userId) {
    throw new Error('Link not found or access denied');
  }

  // Soft delete (mark as removed)
  const { error } = await supabase
    .from('ai_tutor_links')
    .update({ status: 'removed' })
    .eq('id', linkId);

  if (error) throw error;
}

// Export aliases for backward compatibility
export { listAITutorLinks as listLinks };
export { createAITutorLink as addLink };
export { updateAITutorLink as updateLink };
export { deleteAITutorLink as deleteLink };
