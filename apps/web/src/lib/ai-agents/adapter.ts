/**
 * AI Agent API Adapter
 *
 * Provides the primary API for AI agent CRUD operations.
 * Works with the unified ai_agents table supporting multiple agent types.
 *
 * @module lib/ai-agents
 */

import { createClient } from '@/utils/supabase/server';
import type { AIAgent, AIAgentType, CreateAIAgentInput, UpdateAIAgentInput } from '@sage/agents/base/types';

// --- Types ---

export interface AIAgentRecord extends AIAgent {
  agent_type: 'tutor';
  agent_context: 'marketplace';
}

/** @deprecated Use AIAgentRecord instead */
export type AITutor = AIAgentRecord;

export interface Skill {
  name: string;
  is_custom: boolean;
}

export interface AIAgentCreateInput extends Omit<CreateAIAgentInput, 'agent_type' | 'agent_context' | 'skills'> {
  skills?: Skill[];
}

export interface AIAgentUpdateInput extends Omit<UpdateAIAgentInput, 'skills'> {
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

  if (options?.agentType) {
    query = query.eq('agent_type', options.agentType);
  }

  if (options?.agentContext) {
    query = query.eq('agent_context', options.agentContext);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
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

  if (userId) {
    query = query.or(`owner_id.eq.${userId},status.eq.published`);
  } else {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
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
 * Publish AI agent
 */
export async function publishAIAgent(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from('ai_agents')
    .select('subscription_status, agent_context')
    .eq('id', id)
    .eq('owner_id', userId)
    .single();

  if (!agent) {
    throw new Error('AI agent not found');
  }

  if (agent.agent_context === 'marketplace' && agent.subscription_status !== 'active') {
    throw new Error('Active subscription required to publish AI agent');
  }

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
 * Get AI agent limits for user
 */
export async function getAIAgentLimits(userId: string): Promise<{
  current: number;
  limit: number;
  caas_score: number;
}> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('caas_score')
    .eq('id', userId)
    .single();

  const caasScore = profile?.caas_score || 0;
  const limit = Math.max(1, Math.min(50, Math.floor(caasScore / 20) + 1));

  const { data: agents } = await supabase
    .from('ai_agents')
    .select('id')
    .eq('owner_id', userId)
    .eq('agent_context', 'marketplace')
    .neq('status', 'suspended');

  const current = agents?.length || 0;

  return { current, limit, caas_score: caasScore };
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

// --- Export aliases ---

export { getAIAgent as getAIAgentById };
export { getAIAgentLimits as checkCreationLimit };
export { getAIAgentLimits as checkAIAgentCreationLimit };
