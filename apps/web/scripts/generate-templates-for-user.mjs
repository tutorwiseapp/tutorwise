#!/usr/bin/env node
/**
 * Manual Template Generator Script
 *
 * Generates listing templates for a specific user
 * Usage: node apps/web/scripts/generate-templates-for-user.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateTemplatesForUser() {
  console.log('🚀 Listing Template Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // Get the current user (you'll need to provide user ID or email)
    const userEmail = 'michaelquan88@gmail.com'; // Update this with your email

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userEmail);
      console.error('Error:', userError);
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.full_name} (${user.email})`);
    console.log('');

    // Check for existing templates
    const { data: existingTemplates, error: checkError } = await supabase
      .from('listings')
      .select('id, title')
      .eq('profile_id', user.id)
      .eq('is_template', true);

    if (checkError) {
      console.error('❌ Error checking existing templates:', checkError);
      process.exit(1);
    }

    if (existingTemplates && existingTemplates.length > 0) {
      console.log(`⚠️  Found ${existingTemplates.length} existing templates:`);
      existingTemplates.forEach(t => console.log(`   - ${t.title}`));
      console.log('');
      console.log('Do you want to regenerate templates? (This will keep existing ones)');
      console.log('Press Ctrl+C to cancel, or continue to add more templates.');
      console.log('');
    }

    // Load template definitions
    const templatesPath = join(__dirname, '../src/lib/data/listingTemplates.json');
    const templateDefinitions = JSON.parse(readFileSync(templatesPath, 'utf8'));

    console.log(`📝 Generating ${templateDefinitions.length} templates...`);
    console.log('');

    const createdIds = [];

    for (const template of templateDefinitions) {
      // Check if this template already exists
      const existing = existingTemplates?.find(t => t.title === template.title);
      if (existing) {
        console.log(`⏭️  Skipping "${template.title}" (already exists)`);
        continue;
      }

      console.log(`📄 Creating: ${template.title}`);

      // Personalize description
      let personalizedDescription = template.description;
      if (template.template_id === 'ai-tutor-study-support') {
        personalizedDescription = personalizedDescription.replace(
          'Supervised by Dr. Emily Chen',
          `Supervised by ${user.full_name}`
        );
      }

      // Build listing record
      const listing = {
        profile_id: user.id,
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
        tags: template.tags,

        // Pricing
        hourly_rate: template.hourly_rate,
        currency: template.currency,
        free_trial: false,

        // Location
        location_type: template.location_type,
        location_country: template.location_country || 'United Kingdom',
        location_city: template.location_city,
        timezone: template.timezone,

        // Availability (empty for templates)
        availability: {},

        // Media
        images: [],
        video_url: null,
      };

      // Insert template
      const { data, error } = await supabase
        .from('listings')
        .insert(listing)
        .select('id')
        .single();

      if (error) {
        console.error(`   ❌ Failed to create template:`, error.message);
      } else {
        console.log(`   ✓ Created template (ID: ${data.id})`);
        createdIds.push(data.id);
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Template generation complete!`);
    console.log('');
    console.log(`📊 Summary:`);
    console.log(`   • Created: ${createdIds.length} new templates`);
    console.log(`   • Skipped: ${templateDefinitions.length - createdIds.length} existing templates`);
    console.log(`   • Total: ${(existingTemplates?.length || 0) + createdIds.length} templates`);
    console.log('');
    console.log(`🔗 View templates at: https://www.tutorwise.io/listings?filter=templates`);

  } catch (error) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Template generation failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generateTemplatesForUser();
