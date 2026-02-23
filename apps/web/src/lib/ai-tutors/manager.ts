/**
 * Filename: manager.ts
 * Purpose: AI Tutor Manager - Core CRUD operations
 * Created: 2026-02-23
 * Version: v1.0
 */

import { createClient } from '@/utils/supabase/server';

export interface AITutor {
  id: string;
  owner_id: string;
  organisation_id?: string;
  name: string;
  display_name: string;
  description?: string;
  avatar_url?: string;
  subject: string;
  price_per_hour: number;
  currency: string;
  status: 'draft' | 'published' | 'unpublished' | 'suspended';
  subscription_status: 'active' | 'inactive' | 'past_due' | 'canceled';
  storage_used_mb: number;
  storage_limit_mb: number;
  total_sessions: number;
  total_revenue: number;
  avg_rating: number | null;
  total_reviews: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  last_session_at?: string;
}

export interface AITutorCreateInput {
  name: string;
  display_name: string;
  description?: string;
  avatar_url?: string;
  subject: string;
  skills: string[];
  price_per_hour: number;
}

export interface AITutorUpdateInput {
  display_name?: string;
  description?: string;
  avatar_url?: string;
  subject?: string;
  price_per_hour?: number;
}

/**
 * List all AI tutors owned by a user
 */
export async function listUserAITutors(userId: string): Promise<AITutor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_tutors')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Get AI tutor by ID
 */
export async function getAITutor(id: string, userId?: string): Promise<AITutor | null> {
  const supabase = await createClient();

  let query = supabase.from('ai_tutors').select('*').eq('id', id);

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
 * Create new AI tutor (draft status)
 * Checks graduated limits before creation
 */
export async function createAITutor(
  input: AITutorCreateInput,
  userId: string
): Promise<AITutor> {
  const supabase = await createClient();

  // Check creation limit
  const { data: canCreate, error: limitError } = await supabase
    .rpc('check_ai_tutor_limit', { p_user_id: userId })
    .single();

  if (limitError) {
    console.error('Error checking AI tutor limit:', limitError);
    throw new Error('Failed to check AI tutor creation limit');
  }

  if (!canCreate) {
    throw new Error('AI tutor creation limit reached. Increase your CaaS score to create more.');
  }

  // Create AI tutor
  const { data: tutor, error } = await supabase
    .from('ai_tutors')
    .insert({
      owner_id: userId,
      name: input.name,
      display_name: input.display_name,
      description: input.description,
      avatar_url: input.avatar_url,
      subject: input.subject,
      price_per_hour: input.price_per_hour,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  // Insert skills
  if (input.skills && input.skills.length > 0) {
    const { error: skillsError } = await supabase.from('ai_tutor_skills').insert(
      input.skills.map((skill) => ({
        ai_tutor_id: tutor.id,
        skill_name: skill,
      }))
    );

    if (skillsError) {
      console.error('Error inserting skills:', skillsError);
      // Don't fail the whole operation if skills fail
    }
  }

  return tutor;
}

/**
 * Update AI tutor
 */
export async function updateAITutor(
  id: string,
  input: AITutorUpdateInput,
  userId: string
): Promise<AITutor> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_tutors')
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
 * Delete AI tutor
 */
export async function deleteAITutor(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('ai_tutors')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) throw error;
}

/**
 * Publish AI tutor
 * Requires active subscription
 */
export async function publishAITutor(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Check subscription status
  const { data: tutor } = await supabase
    .from('ai_tutors')
    .select('subscription_status')
    .eq('id', id)
    .eq('owner_id', userId)
    .single();

  if (!tutor) {
    throw new Error('AI tutor not found');
  }

  if (tutor.subscription_status !== 'active') {
    throw new Error('Active subscription required to publish AI tutor');
  }

  // Publish
  const { error } = await supabase
    .from('ai_tutors')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) throw error;
}

/**
 * Unpublish AI tutor
 */
export async function unpublishAITutor(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('ai_tutors')
    .update({
      status: 'unpublished',
    })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) throw error;
}

/**
 * Get AI tutor limits for user
 */
export async function getAITutorLimits(userId: string): Promise<{
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

  // Count active AI tutors
  const { data: tutors } = await supabase
    .from('ai_tutors')
    .select('id')
    .eq('owner_id', userId)
    .neq('status', 'suspended');

  const current = tutors?.length || 0;

  return {
    current,
    limit,
    caas_score: caasScore,
  };
}

/**
 * Get AI tutor skills
 */
export async function getAITutorSkills(aiTutorId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ai_tutor_skills')
    .select('skill_name')
    .eq('ai_tutor_id', aiTutorId);

  if (error) throw error;

  return data?.map((s) => s.skill_name) || [];
}

// Export aliases for backward compatibility
export { getAITutor as getAITutorById };
export { getAITutorLimits as checkCreationLimit };
