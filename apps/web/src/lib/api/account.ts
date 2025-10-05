/**
 * Account API utilities
 * Handles professional info (template) management
 */

import { createClient } from '@/utils/supabase/client';

export interface ProfessionalInfoTemplate {
  role_type: 'seeker' | 'provider' | 'agent';
  subjects?: string[];
  teaching_experience?: string;
  hourly_rate?: number;
  hourly_rate_range?: { min: number; max: number };
  qualifications?: string[];
  teaching_methods?: string[];
  availability?: any;
  specializations?: string[];
}

/**
 * Get professional info template for a role
 */
export async function getProfessionalInfo(roleType: 'seeker' | 'provider' | 'agent') {
  const supabase = createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Fetch role_details
  const { data, error } = await supabase
    .from('role_details')
    .select('*')
    .eq('profile_id', user.id)
    .eq('role_type', roleType)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (which is OK for new users)
    throw error;
  }

  return data || null;
}

/**
 * Update professional info template
 */
export async function updateProfessionalInfo(template: ProfessionalInfoTemplate) {
  const supabase = createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Prepare upsert data
  const upsertData: any = {
    profile_id: user.id,
    role_type: template.role_type,
    updated_at: new Date().toISOString(),
  };

  // Add optional fields
  if (template.subjects) upsertData.subjects = template.subjects;
  if (template.teaching_experience) upsertData.teaching_experience = template.teaching_experience;
  if (template.hourly_rate) upsertData.hourly_rate = template.hourly_rate;
  if (template.qualifications) upsertData.qualifications = template.qualifications;
  if (template.teaching_methods) upsertData.teaching_methods = template.teaching_methods;
  if (template.availability) upsertData.availability = template.availability;
  if (template.specializations) upsertData.specializations = template.specializations;

  // Upsert (update or insert)
  const { data, error } = await supabase
    .from('role_details')
    .upsert(upsertData, {
      onConflict: 'profile_id,role_type',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
