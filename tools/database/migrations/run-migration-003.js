#!/usr/bin/env node

/**
 * Script to run migration 003 on Supabase
 * Usage: node run-migration-003.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration 003: Add tutor detail fields to listings...\n');

  const migrations = [
    {
      name: 'Add specializations column',
      sql: `ALTER TABLE listings ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}'`
    },
    {
      name: 'Add teaching_methods column',
      sql: `ALTER TABLE listings ADD COLUMN IF NOT EXISTS teaching_methods TEXT[] DEFAULT '{}'`
    },
    {
      name: 'Add qualifications column',
      sql: `ALTER TABLE listings ADD COLUMN IF NOT EXISTS qualifications TEXT[] DEFAULT '{}'`
    },
    {
      name: 'Add teaching_experience column',
      sql: `ALTER TABLE listings ADD COLUMN IF NOT EXISTS teaching_experience TEXT`
    },
    {
      name: 'Add response_time column',
      sql: `ALTER TABLE listings ADD COLUMN IF NOT EXISTS response_time VARCHAR(50)`
    },
    {
      name: 'Create index on specializations',
      sql: `CREATE INDEX IF NOT EXISTS idx_listings_specializations ON listings USING GIN(specializations)`
    },
    {
      name: 'Create index on teaching_methods',
      sql: `CREATE INDEX IF NOT EXISTS idx_listings_teaching_methods ON listings USING GIN(teaching_methods)`
    },
    {
      name: 'Create index on qualifications',
      sql: `CREATE INDEX IF NOT EXISTS idx_listings_qualifications ON listings USING GIN(qualifications)`
    }
  ];

  for (const migration of migrations) {
    try {
      console.log(`Executing: ${migration.name}...`);
      const { data, error } = await supabase.rpc('exec_sql', { query: migration.sql });

      if (error) {
        // Try direct query if RPC doesn't exist
        const result = await supabase.from('_sqlx_migrations').select('*').limit(1);
        console.log(`  ⚠️  Could not execute via RPC (${error.message})`);
        console.log(`  → SQL: ${migration.sql}`);
        console.log(`  → This migration needs to be run manually via Supabase Dashboard`);
      } else {
        console.log(`  ✓ ${migration.name} completed`);
      }
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  console.log('\n⚠️  Note: If migrations failed, please run the SQL manually via Supabase Dashboard:');
  console.log('https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir/sql/new');
  console.log('\nCopy the contents of 003_add_tutor_detail_fields_to_listings.sql');
}

runMigration()
  .then(() => {
    console.log('\nMigration script completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nMigration failed:', err);
    process.exit(1);
  });
