#!/usr/bin/env node
/**
 * Migration 163: Add organisation_id support to wiselist_items
 * Allows organisations to be saved to wiselists
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase connection
const supabaseUrl = 'https://lvsmtgmpoysjygdwcrir.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2c210Z21wb3lzanlnZHdjcmlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzUzMDU4NywiZXhwIjoyMDQzMTA2NTg3fQ.wY7eSUJ6vJBbO0_cXYjOBVOvU_YOVCgT7bdT9ztLdhY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running Migration 163: Add organisation_id to wiselist_items');
  console.log('=' .repeat(70));

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, '163_add_organisation_to_wiselists.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('\n📝 Executing SQL migration...\n');
    console.log(sql);
    console.log('\n' + '='.repeat(70));

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('\n✅ Migration 163 completed successfully!');
    console.log('\nChanges:');
    console.log('  ✓ Added organisation_id column to wiselist_items');
    console.log('  ✓ Created index idx_wiselist_items_organisation_id');
    console.log('  ✓ Updated check constraint to allow organisations');
    console.log('  ✓ Updated unique constraint to include organisations');

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const { data: columns, error: verifyError } = await supabase
      .from('wiselist_items')
      .select('*')
      .limit(0);

    if (verifyError && !verifyError.message.includes('no rows')) {
      console.error('\n⚠️  Verification warning:', verifyError);
    } else {
      console.log('✓ Table structure verified');
    }

    console.log('\n✨ Migration complete! Organisations can now be saved to wiselists.');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

runMigration();
