/**
 * Filename: links-manager.ts
 * Purpose: AI Tutor Links Manager - Manage URL references
 * Created: 2026-02-23
 * Version: v1.0
 */

import { createClient } from '@/utils/supabase/server';

export interface AIAgentLink {
  id: string;
  agent_id: string;
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

export interface AIAgentLinkCreateInput {
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
export async function listAIAgentLinks(aiAgentId: string): Promise<AIAgentLink[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_agent_links')
    .select('*')
    .eq('agent_id', aiAgentId)
    .eq('status', 'active')
    .order('priority', { ascending: true })
    .order('added_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Create new link for AI tutor
 */
export async function createAIAgentLink(
  aiAgentId: string,
  input: AIAgentLinkCreateInput,
  userId: string
): Promise<AIAgentLink> {
  const supabase = await createClient();

  // Verify ownership
  const { data: tutor } = await supabase
    .from('ai_tutors')
    .select('owner_id')
    .eq('id', aiAgentId)
    .eq('owner_id', userId)
    .single();

  if (!tutor) {
    throw new Error('AI tutor not found or access denied');
  }

  // Create link
  const { data, error } = await supabase
    .from('ai_agent_links')
    .insert({
      agent_id: aiAgentId,
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
export async function updateAIAgentLink(
  linkId: string,
  input: Partial<AIAgentLinkCreateInput>,
  userId: string
): Promise<AIAgentLink> {
  const supabase = await createClient();

  // Verify ownership via AI tutor
  const { data: link } = await supabase
    .from('ai_agent_links')
    .select('agent_id, ai_tutors!inner(owner_id)')
    .eq('id', linkId)
    .single();

  if (!link || (link as any).ai_tutors.owner_id !== userId) {
    throw new Error('Link not found or access denied');
  }

  // Update link
  const { data, error } = await supabase
    .from('ai_agent_links')
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
export async function deleteAIAgentLink(linkId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Verify ownership via AI tutor
  const { data: link } = await supabase
    .from('ai_agent_links')
    .select('agent_id, ai_tutors!inner(owner_id)')
    .eq('id', linkId)
    .single();

  if (!link || (link as any).ai_tutors.owner_id !== userId) {
    throw new Error('Link not found or access denied');
  }

  // Soft delete (mark as removed)
  const { error } = await supabase
    .from('ai_agent_links')
    .update({ status: 'removed' })
    .eq('id', linkId);

  if (error) throw error;
}

// Export aliases for backward compatibility
export { listAIAgentLinks as listLinks };
export { createAIAgentLink as addLink };
export { updateAIAgentLink as updateLink };
export { deleteAIAgentLink as deleteLink };
