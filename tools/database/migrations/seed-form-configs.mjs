#!/usr/bin/env node

/**
 * Seed Form Configs for Organisation and Account Contexts
 * Run with: node seed-form-configs.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get data from onboarding contexts to replicate
async function getOnboardingData(context) {
  const { data, error } = await supabase
    .from('form_config')
    .select('*')
    .eq('context', context)
    .eq('is_active', true);

  if (error) throw error;
  return data;
}

// Insert data with new context
async function insertWithNewContext(rows, newContext) {
  const newRows = rows.map(row => {
    const { id, created_at, updated_at, ...rest } = row;
    return { ...rest, context: newContext };
  });

  const { data, error } = await supabase
    .from('form_config')
    .insert(newRows);

  if (error) throw error;
  return data;
}

async function seedOrganisationContexts() {
  console.log('🚀 Seeding Organisation Contexts...\n');

  const contexts = [
    { from: 'onboarding.tutor', to: 'organisation.tutor' },
    { from: 'onboarding.agent', to: 'organisation.agent' },
    { from: 'onboarding.client', to: 'organisation.client' }
  ];

  for (const { from, to } of contexts) {
    try {
      console.log(`  Copying ${from} → ${to}...`);
      const data = await getOnboardingData(from);
      await insertWithNewContext(data, to);
      console.log(`  ✅ ${to}: ${data.length} rows copied\n`);
    } catch (error) {
      console.error(`  ❌ Error seeding ${to}:`, error.message);
    }
  }
}

async function seedAccountContexts() {
  console.log('🚀 Seeding Account Role-Specific Contexts...\n');

  // Copy from onboarding contexts
  const contexts = [
    { from: 'onboarding.tutor', to: 'account.tutor' },
    { from: 'onboarding.agent', to: 'account.agent' },
    { from: 'onboarding.client', to: 'account.client' }
  ];

  for (const { from, to } of contexts) {
    try {
      console.log(`  Copying ${from} → ${to}...`);
      const data = await getOnboardingData(from);

      // Filter to get only relevant fields for account forms
      const filteredData = data.filter(row => {
        const relevantFields = [
          'gender', 'status', 'academicQualifications', 'keyStages',
          'teachingProfessionalQualifications', 'subjects', 'teachingExperience',
          'sessionType', 'tutoringExperience', 'deliveryMode', 'proofOfAddressType',
          'educationLevel', 'learningGoals', 'learningPreferences', 'specialNeeds',
          'sessionsPerWeek', 'sessionDuration'
        ];
        return relevantFields.includes(row.field_name);
      });

      await insertWithNewContext(filteredData, to);
      console.log(`  ✅ ${to}: ${filteredData.length} rows copied\n`);
    } catch (error) {
      console.error(`  ❌ Error seeding ${to}:`, error.message);
    }
  }
}

async function verifyContexts() {
  console.log('🔍 Verifying all contexts...\n');

  const { data, error } = await supabase
    .from('form_config')
    .select('context')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error verifying:', error.message);
    return;
  }

  const contexts = [...new Set(data.map(r => r.context))].sort();
  console.log('Active contexts:');
  contexts.forEach(ctx => console.log(`  - ${ctx}`));

  const counts = {};
  for (const ctx of contexts) {
    const count = data.filter(r => r.context === ctx).length;
    counts[ctx] = count;
  }

  console.log('\nRow counts by context:');
  Object.entries(counts).forEach(([ctx, count]) => {
    console.log(`  ${ctx}: ${count} rows`);
  });
}

async function main() {
  try {
    await seedOrganisationContexts();
    await seedAccountContexts();
    await verifyContexts();

    console.log('\n✅ All migrations completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Navigate to /admin/forms');
    console.log('  2. Verify all 9 contexts are visible');
    console.log('  3. Test field configurations\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
