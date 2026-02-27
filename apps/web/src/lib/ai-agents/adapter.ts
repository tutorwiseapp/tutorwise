/**
 * AI Agent API Adapter
 *
 * Provides backward-compatible API for existing AI Tutor code to work
 * with the new unified ai_agents table.
 *
 * Migration Path:
 * - Old: ai_tutors table
 * - New: ai_agents table (supports multiple agent types)
 * - This adapter bridges the gap during transition
 *
 * @module lib/ai-agents
 */

import { createClient } from '@/utils/supabase/server';
import type { AIAgent, AIAgentType, CreateAIAgentInput, UpdateAIAgentInput } from '@sage/agents/base/types';

// --- Type Mapping (for backward compatibility) ---

export interface AITutor extends AIAgent {
  // Backward compatibility: all existing AI Tutors are marketplace tutors
  agent_type: 'tutor';
  agent_context: 'marketplace';
}

export interface Skill {
  name: string;
  is_custom: boolean;
}

export interface AITutorCreateInput extends Omit<CreateAIAgentInput, 'agent_type' | 'agent_context' | 'skills'> {
  skills?: Skill[];
}

export interface AITutorUpdateInput extends Omit<UpdateAIAgentInput, 'skills'> {
  skills?: Skill[];
}

// --- Agent CRUD Operations ---

/**
 * List all AI agents owned by a user.
 * Can filter by agent_type to get specific types (tutors, coursework, etc.)
 */
export async function listUserAIAgents(
  userId: string,
  options?: {
    agentType?: AIAgentType;
    agentContext?: 'platform' | 'marketplace';
  }
): Promise<AIAgent[]> {
  const supabase = await createClient();

  let query = supabase
    .from('ai_agents')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  // Filter by agent type if specified
  if (options?.agentType) {
    query = query.eq('agent_type', options.agentType);
  }

  // Filter by agent context if specified
  if (options?.agentContext) {
    query = query.eq('agent_context', options.agentContext);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

/**
 * List AI Tutors (marketplace tutors only) - backward compatible
 */
export async function listUserAITutors(userId: string): Promise<AITutor[]> {
  const agents = await listUserAIAgents(userId, {
    agentType: 'tutor',
    agentContext: 'marketplace',
  });

  return agents as AITutor[];
}

/**
 * Get AI agent by ID
 */
export async function getAIAgent(
  id: string,
  userId?: string
): Promise<AIAgent | null> {
  const supabase = await createClient();

  let query = supabase.from('ai_agents').select('*').eq('id', id);

  // If userId provided, ensure they own it or it's published
  if (userId) {
    query = query.or(`owner_id.eq.${userId},status.eq.published`);
  } else {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Get AI Tutor by ID (backward compatible)
 */
export async function getAITutor(
  id: string,
  userId?: string
): Promise<AITutor | null> {
  const agent = await getAIAgent(id, userId);

  // Verify it's a marketplace tutor
  if (agent && agent.agent_type === 'tutor' && agent.agent_context === 'marketplace') {
    return agent as AITutor;
  }

  return null;
}

/**
 * Create new AI agent
 */
export async function createAIAgent(
  input: CreateAIAgentInput,
  userId: string,
  activeRole?: string,
  isPlatformOwned: boolean = false
): Promise<AIAgent> {
  const supabase = await createClient();

  // Skip limit check for platform-owned AI agents
  if (!isPlatformOwned) {
    const { data: canCreate, error: limitError } = await supabase
      .rpc('check_ai_tutor_limit', { p_user_id: userId })
      .single();

    if (limitError) {
      console.error('Error checking AI agent limit:', limitError);
      throw new Error('Failed to check AI agent creation limit');
    }

    if (!canCreate) {
      throw new Error('AI agent creation limit reached. Increase your CaaS score to create more.');
    }
  }

  // Create AI agent
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .insert({
      owner_id: userId,
      name: input.name,
      display_name: input.display_name,
      description: input.description,
      avatar_url: input.avatar_url,
      agent_type: input.agent_type,
      agent_context: input.agent_context,
      subject: input.subject,
      level: input.level,
      price_per_hour: input.price_per_hour,
      status: 'draft',
      is_platform_owned: isPlatformOwned,
      created_as_role: activeRole || 'tutor',
    })
    .select()
    .single();

  if (error) throw error;

  // Insert skills if provided
  if (input.skills && input.skills.length > 0) {
    const { error: skillsError } = await supabase.from('ai_tutor_skills').insert(
      input.skills.map((skill: string) => ({
        agent_id: agent.id,
        skill_name: skill,
        is_custom: false,
      }))
    );

    if (skillsError) {
      console.error('Error inserting skills:', skillsError);
    }
  }

  return agent;
}

/**
 * Create AI Tutor (backward compatible)
 */
export async function createAITutor(
  input: AITutorCreateInput,
  userId: string,
  activeRole?: string,
  isPlatformOwned: boolean = false
): Promise<AITutor> {
  // Convert Skill[] to string[]
  const agentInput: CreateAIAgentInput = {
    ...input,
    agent_type: 'tutor',
    agent_context: 'marketplace',
    skills: input.skills?.map(skill => skill.name),
  };

  const agent = await createAIAgent(agentInput, userId, activeRole, isPlatformOwned);
  return agent as AITutor;
}

/**
 * Update AI agent
 */
export async function updateAIAgent(
  id: string,
  input: UpdateAIAgentInput,
  userId: string
): Promise<AIAgent> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_agents')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Update AI Tutor (backward compatible)
 */
export async function updateAITutor(
  id: string,
  input: AITutorUpdateInput,
  userId: string
): Promise<AITutor> {
  // Exclude skills from agent input (skills are stored separately in ai_tutor_skills table)
  const { skills, ...agentInput } = input;

  const agent = await updateAIAgent(id, agentInput, userId);

  // TODO: Handle skills update separately if needed
  // Skills are stored in ai_tutor_skills table and need separate logic

  return agent as AITutor;
}

/**
 * Delete AI agent
 */
export async function deleteAIAgent(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) throw error;
}

/**
 * Delete AI Tutor (backward compatible)
 */
export async function deleteAITutor(id: string, userId: string): Promise<void> {
  return deleteAIAgent(id, userId);
}

/**
 * Publish AI agent
 */
export async function publishAIAgent(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Check subscription status for marketplace agents
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('subscription_status, agent_context')
    .eq('id', id)
    .eq('owner_id', userId)
    .single();

  if (!agent) {
    throw new Error('AI agent not found');
  }

  // Only check subscription for marketplace agents
  if (agent.agent_context === 'marketplace' && agent.subscription_status !== 'active') {
    throw new Error('Active subscription required to publish AI agent');
  }

  // Publish
  const { error } = await supabase
    .from('ai_agents')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) throw error;
}

/**
 * Publish AI Tutor (backward compatible)
 */
export async function publishAITutor(id: string, userId: string): Promise<void> {
  return publishAIAgent(id, userId);
}

/**
 * Unpublish AI agent
 */
export async function unpublishAIAgent(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('ai_agents')
    .update({
      status: 'unpublished',
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) throw error;
}

/**
 * Unpublish AI Tutor (backward compatible)
 */
export async function unpublishAITutor(id: string, userId: string): Promise<void> {
  return unpublishAIAgent(id, userId);
}

/**
 * Get AI agent limits for user
 */
export async function getAIAgentLimits(userId: string): Promise<{
  current: number;
  limit: number;
  caas_score: number;
}> {
  const supabase = await createClient();

  // Get CaaS score
  const { data: profile } = await supabase
    .from('profiles')
    .select('caas_score')
    .eq('id', userId)
    .single();

  const caasScore = profile?.caas_score || 0;

  // Calculate limit: 1-50 based on score
  const limit = Math.max(1, Math.min(50, Math.floor(caasScore / 20) + 1));

  // Count active AI agents (marketplace only)
  const { data: agents } = await supabase
    .from('ai_agents')
    .select('id')
    .eq('owner_id', userId)
    .eq('agent_context', 'marketplace')
    .neq('status', 'suspended');

  const current = agents?.length || 0;

  return {
    current,
    limit,
    caas_score: caasScore,
  };
}

/**
 * Get AI Tutor limits (backward compatible)
 */
export async function getAITutorLimits(userId: string) {
  return getAIAgentLimits(userId);
}

/**
 * Get AI agent skills
 */
export async function getAIAgentSkills(agentId: string): Promise<Skill[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_tutor_skills')
    .select('skill_name, is_custom')
    .eq('agent_id', agentId);

  if (error) throw error;

  return data?.map((s) => ({ name: s.skill_name, is_custom: s.is_custom })) || [];
}

/**
 * Get AI Tutor skills (backward compatible)
 */
export async function getAITutorSkills(aiTutorId: string): Promise<Skill[]> {
  return getAIAgentSkills(aiTutorId);
}

// --- Export aliases for backward compatibility ---

export { getAIAgent as getAIAgentById };
export { getAITutor as getAITutorById };
export { getAIAgentLimits as checkCreationLimit };
export { getAITutorLimits as checkAITutorCreationLimit };
