/**
 * Profiles API utilities
 * Handles fetching profile data from Supabase
 */

import { createClient } from '@/utils/supabase/client';

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  bio?: string;
  location?: string;
  phone_number?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get a profile by user ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data as Profile;
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  return getProfile(user.id);
}

/**
 * Update profile data
 * Note: This updates the profiles table only. For role-specific professional data,
 * use updateRoleDetails() instead.
 */
export async function updateProfile(updates: Partial<Profile>): Promise<Profile> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data as Profile;
}

/**
 * Role Details data structure
 */
export interface RoleDetailsUpdate {
  role_type: 'tutor' | 'client' | 'agent';
  // Common fields
  subjects?: string[];
  hourly_rate?: number;
  availability?: any;

  // Tutor-specific fields
  status?: string;
  academic_qualifications?: string[];
  key_stages?: string[];
  teaching_professional_qualifications?: string[];
  teaching_experience?: string;
  session_types?: string[];
  tutoring_experience?: string;
  one_on_one_rate?: number;
  group_session_rate?: number;
  delivery_mode?: string[];
  qualifications?: any;
  teaching_methods?: string[];
  professional_background?: string;

  // Client-specific fields
  education_level?: string;
  learning_goals?: string[];
  learning_preferences?: string[];
  budget_range?: string;
  sessions_per_week?: string;
  session_duration?: string;
  special_needs?: string[];
  additional_info?: string;
  skill_levels?: any;
  goals?: string[];
  learning_style?: string;
  schedule_preferences?: any;
  previous_experience?: boolean;

  // Agent-specific fields
  agency_name?: string;
  agency_size?: string;
  years_in_business?: string;
  description?: string;
  services?: string[];
  commission_rate?: string;
  service_areas?: string[];
  student_capacity?: string;
  subject_specializations?: string[];
  education_levels?: string[];
  coverage_areas?: string[];
  number_of_tutors?: string;
  certifications?: string[];
  website?: string;
  commission_preferences?: any;
  specializations?: string[];
}

/**
 * Update role-specific professional details
 * This upserts data into the role_details table
 */
export async function updateRoleDetails(
  roleType: 'tutor' | 'client' | 'agent',
  updates: Partial<RoleDetailsUpdate>
): Promise<void> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Prepare the upsert data
  const roleDetailsData = {
    profile_id: user.id,
    role_type: roleType,
    updated_at: new Date().toISOString(),
    ...updates,
  };

  // Upsert to role_details table
  const { error } = await supabase
    .from('role_details')
    .upsert(roleDetailsData, {
      onConflict: 'profile_id,role_type'
    });

  if (error) {
    console.error('Error updating role details:', error);
    throw error;
  }
}
