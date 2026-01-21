#!/usr/bin/env node

/**
 * Migration Runner for 091 - Add error handling to handle_new_user trigger
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Missing Supabase credentials in apps/web/.env.local');
  console.log('Required vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  const filename = '091_add_error_handling_to_trigger.sql';
  console.log(`\n========================================`);
  console.log(`Running Migration: ${filename}`);
  console.log(`========================================\n`);

  const filePath = path.join(__dirname, 'apps/api/migrations', filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  console.log('Executing SQL...\n');

  try {
    // Use direct pg connection
    const pg = require('pg');
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('No database connection string found (need POSTGRES_URL_NON_POOLING or DATABASE_URL)');
    }

    // Connect with proper SSL config
    const client = new pg.Client({
      connectionString
    });

    await client.connect();
    console.log('✅ Connected to database');

    try {
      const result = await client.query(sql);
      console.log('✅ Migration executed successfully!');
      console.log('Result:', result.command || 'Success');
    } catch (queryError) {
      console.error('Query execution error:', queryError);
      throw queryError;
    } finally {
      await client.end();
    }

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

runMigration().then(() => {
  console.log('\n✅ Migration 091 completed successfully!');
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ Migration runner failed:', err);
  process.exit(1);
});
