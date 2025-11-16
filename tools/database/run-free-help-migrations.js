#!/usr/bin/env node

/**
 * Migration Runner - Free Help Now v5.9
 * Runs migrations 086-088 for Free Help Now feature
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase credentials in .env.local');
  console.error('Expected: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const migrations = [
  '086_add_free_help_columns.sql',
  '087_add_free_help_booking_type.sql',
  '088_update_booking_triggers_for_caas_v5_9.sql',
];

async function runMigration(filename) {
  console.log(`\n-----------------------------------`);
  console.log(`Running: ${filename}`);
  console.log(`-----------------------------------`);

  const migrationsDir = path.join(__dirname, '../../apps/api/migrations');
  const filePath = path.join(migrationsDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  // Split SQL into statements (skip comments and empty lines)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      // Keep statement if it's not empty and not just a comment
      if (!s) return false;
      const lines = s.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('--');
      });
      return lines.length > 0;
    });

  console.log(`Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement) {
      try {
        // Use Supabase's SQL execution
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // Try alternative method: direct REST API call
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ sql: statement + ';' })
          });

          if (!response.ok) {
            const errorText = await response.text();
            // If it's an "already exists" error, just warn and continue
            if (errorText.includes('already exists') || errorText.includes('IF NOT EXISTS')) {
              console.log(`  ⚠️  Statement ${i + 1}: Already exists, skipping...`);
              continue;
            }
            throw new Error(`Statement ${i + 1} failed: ${errorText}`);
          }
        }

        process.stdout.write('.');
      } catch (err) {
        // Check if it's a benign "already exists" error
        if (err.message && (err.message.includes('already exists') || err.message.includes('IF NOT EXISTS'))) {
          console.log(`\n  ⚠️  Statement ${i + 1}: Already exists, skipping...`);
          continue;
        }
        throw err;
      }
    }
  }

  console.log('');
  console.log(`✅ SUCCESS: ${filename} completed`);
}

async function main() {
  console.log('========================================');
  console.log('Running Free Help Now Migrations (v5.9)');
  console.log('========================================\n');

  try {
    console.log(`Step 1/3: Adding available_free_help columns`);
    await runMigration(migrations[0]);

    console.log(`\nStep 2/3: Adding booking type and duration support`);
    await runMigration(migrations[1]);

    console.log(`\nStep 3/3: Adding CaaS integration trigger`);
    await runMigration(migrations[2]);

    console.log('\n========================================');
    console.log('✅ All migrations completed successfully!');
    console.log('========================================\n');
    console.log('Database changes:');
    console.log('  ✓ profiles.available_free_help column added');
    console.log('  ✓ caas_scores.available_free_help column added');
    console.log('  ✓ bookings.type column added');
    console.log('  ✓ bookings.duration_minutes column added');
    console.log('  ✓ CaaS trigger for free help sessions installed\n');
    console.log('Next steps:');
    console.log('  1. Test the Free Help Now feature');
    console.log('  2. Verify Redis connection (Upstash)');
    console.log('  3. Run the test flow (tutor toggle → student book → session created)\n');
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();
