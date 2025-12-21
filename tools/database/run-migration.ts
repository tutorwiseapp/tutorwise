/**
 * Script to run database migration via Supabase client
 * Usage: npx tsx tools/database/run-migration.ts <migration-file>
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationFile: string) {
  console.log(`Running migration: ${migrationFile}`);

  const migrationPath = path.join(process.cwd(), 'tools/database/migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct execution via SQL statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

      for (const statement of statements) {
        if (!statement) continue;

        const { error: execError } = await supabase.rpc('exec', {
          query: statement
        });

        if (execError) {
          console.error('Error executing statement:', execError);
          console.error('Statement:', statement.substring(0, 200));
        } else {
          console.log('✓ Executed statement');
        }
      }
    } else {
      console.log('✓ Migration completed successfully');
    }

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

const migrationFile = process.argv[2] || '094_create_help_support_snapshots.sql';
runMigration(migrationFile);
