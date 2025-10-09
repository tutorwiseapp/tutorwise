/**
 * Account API utilities
 * Handles professional info (template) management
 */

import { createClient } from '@/utils/supabase/client';

export interface ProfessionalInfoTemplate {
  role_type: 'seeker' | 'provider' | 'agent';
  // Provider fields
  subjects?: string[];
  teaching_experience?: string;
  hourly_rate?: number;
  hourly_rate_range?: { min: number; max: number };
  qualifications?: string[];
  teaching_methods?: string[];
  availability?: any;
  specializations?: string[];
  // Agent fields
  agency_name?: string;
  services?: string[];
  subject_specializations?: string[];
  education_levels?: string[];
  coverage_areas?: string[];
  years_in_business?: string;
  number_of_tutors?: string;
  commission_rate?: number;
  certifications?: string[];
  website_url?: string;
  description?: string;
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

  // Add optional provider fields
  if (template.subjects) upsertData.subjects = template.subjects;
  if (template.teaching_experience) upsertData.teaching_experience = template.teaching_experience;
  if (template.hourly_rate) upsertData.hourly_rate = template.hourly_rate;
  if (template.qualifications) upsertData.qualifications = template.qualifications;
  if (template.teaching_methods) upsertData.teaching_methods = template.teaching_methods;
  if (template.availability) upsertData.availability = template.availability;
  if (template.specializations) upsertData.specializations = template.specializations;

  // Add optional agent fields
  if (template.agency_name) upsertData.agency_name = template.agency_name;
  if (template.services) upsertData.services = template.services;
  if (template.subject_specializations) upsertData.subject_specializations = template.subject_specializations;
  if (template.education_levels) upsertData.education_levels = template.education_levels;
  if (template.coverage_areas) upsertData.coverage_areas = template.coverage_areas;
  if (template.years_in_business) upsertData.years_in_business = template.years_in_business;
  if (template.number_of_tutors) upsertData.number_of_tutors = template.number_of_tutors;
  if (template.commission_rate !== undefined) upsertData.commission_rate = template.commission_rate;
  if (template.certifications) upsertData.certifications = template.certifications;
  if (template.website_url) upsertData.website_url = template.website_url;
  if (template.description) upsertData.description = template.description;

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
