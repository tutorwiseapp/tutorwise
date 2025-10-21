/**
 * Listing Template Generator
 * Generates personalized listing templates for new tutors after onboarding
 */

import templateDefinitions from '../data/listingTemplates.json';
import { createClient } from '@/utils/supabase/client';

export interface ListingTemplateData {
  template_id: string;
  title: string;
  description: string;
  subjects: string[];
  levels: string[];
  learning_outcomes: string[];
  session_duration: number;
  session_type: string;
  hourly_rate: number;
  currency: string;
  location_type: 'online' | 'in_person' | 'hybrid';
  location_country?: string;
  location_city?: string;
  timezone: string;
  availability: Record<string, string[]>;
  languages: string[];
  teaching_methods: string[];
  specializations?: string[];
  tags: string[];
}

/**
 * Generate listing templates for a tutor after onboarding
 *
 * @param userId - The user's UUID
 * @param tutorName - The tutor's full name to personalize templates
 * @returns Array of created listing IDs
 */
export async function generateListingTemplates(
  userId: string,
  tutorName: string
): Promise<string[]> {
  const supabase = createClient();
  const createdIds: string[] = [];

  console.log('[TemplateGenerator] Generating templates for:', tutorName);

  try {
    // Load templates
    const templates = templateDefinitions as ListingTemplateData[];

    for (const template of templates) {
      console.log(`[TemplateGenerator] Creating template: ${template.title}`);

      // Personalize the description by replacing "Dr. Emily Chen" or tutor names
      let personalizedDescription = template.description;

      // Replace AI Tutor supervision name
      if (template.template_id === 'ai-tutor-study-support') {
        personalizedDescription = personalizedDescription.replace(
          'Supervised by Dr. Emily Chen',
          `Supervised by ${tutorName}`
        );
      }

      // Build the listing record
      const listing = {
        profile_id: userId,
        title: template.title,
        description: personalizedDescription,
        status: 'draft',

        // Template flags
        is_template: true,
        is_deletable: false,
        template_id: template.template_id,

        // Teaching details
        subjects: template.subjects,
        levels: template.levels,
        languages: template.languages,
        teaching_methods: template.teaching_methods,
        specializations: template.specializations || [],

        // Pricing
        hourly_rate: template.hourly_rate,
        currency: template.currency,

        // Location
        location_type: template.location_type,
        location_city: template.location_city || null,
        location_country: template.location_country,
        timezone: template.timezone,

        // Availability
        availability: template.availability,

        // SEO
        tags: template.tags,

        // Add learning outcomes and session info to description or as metadata
        // (Note: If you want to store these separately, add columns to the table)
        teaching_experience: [
          `**Learning Outcomes:**`,
          ...template.learning_outcomes.map(outcome => `• ${outcome}`),
          ``,
          `**Session Duration:** ${template.session_duration} minutes`,
          `**Session Type:** ${template.session_type}`,
        ].join('\n'),
      };

      // Insert the template listing
      const { data, error } = await supabase
        .from('listings')
        .insert(listing)
        .select('id')
        .single();

      if (error) {
        console.error(`[TemplateGenerator] Error creating template ${template.template_id}:`, error);
        throw error;
      }

      if (data) {
        createdIds.push(data.id);
        console.log(`[TemplateGenerator] ✓ Created template: ${template.title} (${data.id})`);
      }
    }

    console.log(`[TemplateGenerator] ✓ Generated ${createdIds.length} templates for ${tutorName}`);
    return createdIds;

  } catch (error) {
    console.error('[TemplateGenerator] Failed to generate templates:', error);
    throw error;
  }
}

/**
 * Check if templates already exist for a user
 */
export async function hasExistingTemplates(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('listings')
    .select('id')
    .eq('profile_id', userId)
    .eq('is_template', true)
    .limit(1);

  if (error) {
    console.error('[TemplateGenerator] Error checking existing templates:', error);
    return false;
  }

  return (data && data.length > 0);
}

/**
 * Duplicate a template for editing
 * Creates a copy that is deletable and not marked as a template
 */
export async function duplicateTemplate(
  templateId: string,
  userId: string
): Promise<string | null> {
  const supabase = createClient();

  try {
    // Get the template
    const { data: template, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', templateId)
      .eq('profile_id', userId)
      .eq('is_template', true)
      .single();

    if (fetchError || !template) {
      console.error('[TemplateGenerator] Template not found:', fetchError);
      return null;
    }

    // Create a duplicate without template flags
    const duplicate = {
      ...template,
      id: undefined, // Let DB generate new ID
      title: `${template.title} (Copy)`,
      is_template: false,
      is_deletable: true,
      template_id: null,
      created_at: undefined,
      updated_at: undefined,
      slug: null, // Force new slug generation
    };

    const { data: newListing, error: createError } = await supabase
      .from('listings')
      .insert(duplicate)
      .select('id')
      .single();

    if (createError || !newListing) {
      console.error('[TemplateGenerator] Error duplicating template:', createError);
      return null;
    }

    console.log(`[TemplateGenerator] ✓ Duplicated template ${templateId} -> ${newListing.id}`);
    return newListing.id;

  } catch (error) {
    console.error('[TemplateGenerator] Error in duplicateTemplate:', error);
    return null;
  }
}
