#!/usr/bin/env node

/**
 * Execute Migration 160 using Supabase Management API
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL
const projectRef = supabaseUrl.split('//')[1].split('.')[0];

async function executeMigration() {
  try {
    console.log('🚀 Executing Migration 160\n');

    const migrationPath = join(dirname(fileURLToPath(import.meta.url)), '160_add_task_comments_and_attachments.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    // Try using PostgREST's query endpoint
    const endpoint = `${supabaseUrl}/rest/v1/`;

    // Execute via SQL query
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      console.log('✅ Migration executed successfully!\n');
      console.log('Created:');
      console.log('  ✓ org_task_comments table');
      console.log('  ✓ org_task_attachments table');
      console.log('  ✓ RLS policies');
      console.log('  ✓ Indexes');
      console.log('  ✓ Triggers\n');
    } else {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

  } catch (error) {
    console.log('⚠️  Automated execution not available\n');
    console.log('Please run the migration manually:');
    console.log(`1. Open: https://lvsmtgmpoysjygdwcrir.supabase.co/project/_/sql/new`);
    console.log('2. Copy the SQL from tools/database/migrations/160_add_task_comments_and_attachments.sql');
    console.log('3. Paste and click "RUN"\n');
    console.log('Or use psql:');
    console.log(`   psql <connection-string> -f 160_add_task_comments_and_attachments.sql\n`);
  }
}

executeMigration();
