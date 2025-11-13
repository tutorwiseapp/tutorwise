#!/usr/bin/env node

/**
 * Migration Runner - Node.js version
 * Runs migrations 061-064 directly via Supabase client
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  '061_add_profile_graph_v4_6.sql',
  '062_migrate_connections_to_profile_graph.sql',
  '063_add_student_role_and_bookings_link.sql',
  '064_create_integration_links_table.sql',
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

  // Execute the SQL via Supabase RPC
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
    // If RPC doesn't exist, try direct query
    return await supabase.from('_migrations').insert({ sql }).select();
  }).catch(async () => {
    // Fallback: Execute via REST API's sql endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
      // Try splitting into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.match(/^\/\*/));

      for (const statement of statements) {
        if (statement) {
          const { error: stmtError } = await supabase.rpc('exec', { query: statement });
          if (stmtError) {
            // One more fallback - use PostgREST directly
            const postgrestResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/sql',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=minimal',
              },
              body: statement,
            });

            if (!postgrestResponse.ok) {
              throw new Error(`SQL execution failed: ${await postgrestResponse.text()}`);
            }
          }
        }
      }
      return { data: null, error: null };
    }

    return await response.json();
  });

  if (error) {
    throw error;
  }

  console.log(`✅ SUCCESS: ${filename} completed`);
}

async function main() {
  console.log('========================================');
  console.log('Running Pending Migrations (v4.6 + v5.0)');
  console.log('========================================\n');

  try {
    console.log(`Step 1/4: Creating profile_graph table (v4.6 core)`);
    await runMigration(migrations[0]);

    console.log(`\nStep 2/4: Migrating connections to profile_graph`);
    await runMigration(migrations[1]);

    console.log(`\nStep 3/4: Adding Student role and bookings link (v5.0)`);
    await runMigration(migrations[2]);

    console.log(`\nStep 4/4: Creating integration links table (v5.0)`);
    await runMigration(migrations[3]);

    console.log('\n========================================');
    console.log('✅ All migrations completed successfully!');
    console.log('========================================\n');
    console.log('Next steps:');
    console.log('1. Refresh your browser to see the My Students page working');
    console.log('2. The profile_graph table error should now be resolved\n');
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();
