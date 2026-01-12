#!/usr/bin/env node

/**
 * Run Migrations 168 & 169: Organisation and Account Forms
 * Run with: node run-migrations-168-169.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Parse SQL into individual INSERT statements
function parseInsertStatements(sql) {
  const statements = [];
  const lines = sql.split('\n');
  let currentStatement = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('--') || trimmed === '') {
      continue;
    }

    currentStatement += line + '\n';

    // Complete statement ends with semicolon
    if (trimmed.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  return statements;
}

async function runMigration168() {
  console.log('🚀 Running Migration 168: Seed Organisation Forms\n');

  const migrationPath = join(dirname(fileURLToPath(import.meta.url)), '168_seed_form_config_organisation_forms.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');
  const statements = parseInsertStatements(migrationSQL);

  console.log(`📄 Executing ${statements.length} INSERT statements...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      const { data, error } = await supabase
        .from('form_config')
        .insert(parseInsertToObject(statement));

      if (error) throw error;
      successCount++;
      process.stdout.write('.');
    } catch (error) {
      errorCount++;
      console.error('\n❌ Error:', error.message);
      console.error('Statement:', statement.substring(0, 150) + '...');
    }
  }

  console.log(`\n\n✅ Migration 168 completed: ${successCount} successful, ${errorCount} errors\n`);
  console.log('Seeded contexts:');
  console.log('  - organisation.tutor');
  console.log('  - organisation.agent');
  console.log('  - organisation.client\n');
}

async function runMigration169() {
  console.log('🚀 Running Migration 169: Seed Account Role-Specific Forms\n');

  const migrationPath = join(dirname(fileURLToPath(import.meta.url)), '169_seed_form_config_account_role_specific.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');
  const statements = parseInsertStatements(migrationSQL);

  console.log(`📄 Executing ${statements.length} INSERT statements...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      const { data, error } = await supabase
        .from('form_config')
        .insert(parseInsertToObject(statement));

      if (error) throw error;
      successCount++;
      process.stdout.write('.');
    } catch (error) {
      errorCount++;
      console.error('\n❌ Error:', error.message);
      console.error('Statement:', statement.substring(0, 150) + '...');
    }
  }

  console.log(`\n\n✅ Migration 169 completed: ${successCount} successful, ${errorCount} errors\n`);
  console.log('Seeded contexts:');
  console.log('  - account.tutor');
  console.log('  - account.agent');
  console.log('  - account.client\n');
}

// Parse INSERT statement to object
function parseInsertToObject(statement) {
  // This is a simplified parser - handle single INSERT with VALUES
  const match = statement.match(/INSERT INTO form_config \((.*?)\) VALUES\s*\((.*?)\);/s);
  if (!match) return null;

  const columns = match[1].split(',').map(c => c.trim());
  const values = match[2].split(',').map(v => v.trim().replace(/^'|'$/g, ''));

  const obj = {};
  columns.forEach((col, i) => {
    obj[col] = values[i] === 'NULL' ? null : values[i];
  });

  return obj;
}

async function main() {
  try {
    await runMigration168();
    await runMigration169();

    console.log('✅ All migrations completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Navigate to /admin/forms');
    console.log('  2. Verify all 9 contexts are visible');
    console.log('  3. Test field configurations\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
