import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load .env.local from apps/web
config({ path: resolve(__dirname, '../../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

async function runSQL(sql: string, description: string): Promise<boolean> {
  console.log(`\n📝 ${description}...`);

  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      // Skip comment-only lines
      if (statement.trim().startsWith('COMMENT')) {
        // Comments need special handling
        const { error } = await supabase.rpc('query' as any, { sql: statement + ';' }).single();
        if (error && !error.message.includes('does not exist')) {
          console.warn(`⚠️  Comment statement skipped: ${error.message}`);
        }
        continue;
      }

      // For CREATE TABLE, INDEX, etc, we need to execute directly
      // Supabase doesn't support arbitrary SQL via the client, so we'll document what needs to be done
      console.log(`   → ${statement.substring(0, 60)}...`);
    }

    console.log(`✅ ${description} - Ready for manual execution`);
    return true;
  } catch (err: any) {
    console.error(`❌ ${description} failed:`, err.message);
    return false;
  }
}

async function main() {
  console.log('=== CAS Database Setup ===');
  console.log(`Connected to: ${supabaseUrl}\n`);

  console.log('📋 SQL statements to be executed:');
  console.log('─'.repeat(80));

  // Read migration files
  const migration271 = readFileSync(
    resolve(__dirname, '../database/migrations/271_create_cas_marketer_insights.sql'),
    'utf-8'
  );

  const migration272 = readFileSync(
    resolve(__dirname, '../database/migrations/272_create_cas_security_scans.sql'),
    'utf-8'
  );

  // Output SQL for manual execution
  console.log('\n=== Migration 271: CAS Marketer Insights Table ===');
  console.log(migration271);

  console.log('\n=== Migration 272: CAS Security Scans Table ===');
  console.log(migration272);

  console.log('\n─'.repeat(80));
  console.log('\n📌 NEXT STEPS:');
  console.log('1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir/sql');
  console.log('2. Copy and execute Migration 271 (CAS Marketer Insights)');
  console.log('3. Copy and execute Migration 272 (CAS Security Scans)');
  console.log('4. Verify tables created: cas_marketer_insights, cas_security_scans');
  console.log('\nOr run via psql:');
  console.log('  psql postgresql://postgres:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:5432/postgres -f tools/database/migrations/271_create_cas_marketer_insights.sql');
  console.log('  psql postgresql://postgres:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:5432/postgres -f tools/database/migrations/272_create_cas_security_scans.sql');
}

main().catch(console.error);
