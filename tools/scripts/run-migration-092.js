#!/usr/bin/env node

/**
 * Migration Runner for 092 - Fix function schema paths
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

async function runMigration() {
  const filename = '092_fix_function_schema_paths.sql';
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
  console.log('\n✅ Migration 092 completed successfully!');
  console.log('\n📝 This migration fixed the schema path issue.');
  console.log('The trigger now uses:');
  console.log('  - public.generate_secure_referral_code()');
  console.log('  - public.generate_slug()');
  console.log('\nThis ensures the functions are found even when');
  console.log('supabase_auth_admin role doesn\'t have "public" in search_path.');
  console.log('\n✅ Signup should now work!');
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ Migration runner failed:', err);
  process.exit(1);
});
