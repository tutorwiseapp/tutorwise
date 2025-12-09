#!/usr/bin/env node

/**
 * Script to run migration 098 on Supabase
 * Usage: node run-migration-098.js
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
  console.log('Running migration 098: Create saved_listings table...\n');

  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, '098_create_saved_listings_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split SQL into individual statements and execute each one
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);

      const { error } = await supabase.rpc('exec', { sql: statement + ';' });

      if (error) {
        console.error(`Statement ${i + 1} failed:`, error);
        console.error('Statement was:', statement);
        process.exit(1);
      }
    }

    console.log('\n✅ Migration 098 completed successfully!');
    console.log('\nCreated:');
    console.log('- saved_listings table');
    console.log('- Indexes for performance');
    console.log('- RLS policies for security');

  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
