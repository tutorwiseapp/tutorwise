/**
 * Migration Runner: 007 & 008 - Listing Templates on Profile Creation
 *
 * This script runs two migrations:
 * 1. Creates trigger to auto-generate listing templates for new tutor profiles
 * 2. Backfills templates for existing tutors who don't have listings yet
 *
 * Usage:
 *   node apps/api/migrations/run-migrations-007-008.js
 *
 * Or via npm:
 *   npm run migrate:listing-templates
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filename) {
  const filepath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  console.log(`\n📄 Running migration: ${filename}`);
  console.log('━'.repeat(60));

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      throw error;
    }

    console.log(`✅ Migration ${filename} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`);
    console.error(error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    return false;
  }
}

async function main() {
  console.log('\n🚀 Starting Listing Templates Migration');
  console.log('═'.repeat(60));

  // Run migration 007: Create trigger
  const migration007Success = await runMigration('007_create_listing_templates_on_profile_creation.sql');

  if (!migration007Success) {
    console.error('\n❌ Migration 007 failed. Aborting.');
    process.exit(1);
  }

  // Run migration 008: Backfill existing tutors
  const migration008Success = await runMigration('008_backfill_listing_templates_for_existing_tutors.sql');

  if (!migration008Success) {
    console.error('\n❌ Migration 008 failed. However, the trigger (007) is in place.');
    console.error('   New tutors will still get templates automatically.');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ All migrations completed successfully!');
  console.log('\n📋 What happened:');
  console.log('  1. ✅ Created database trigger for automatic template generation');
  console.log('  2. ✅ Backfilled templates for existing tutors');
  console.log('\n🎯 Impact:');
  console.log('  • New tutor profiles will automatically get 3 listing templates');
  console.log('  • Existing tutors now have templates ready to customize');
  console.log('  • Eliminates "Loading..." race condition in listing wizard');
  console.log('═'.repeat(60));
}

main();
