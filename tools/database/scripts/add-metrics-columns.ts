/**
 * Script to add referral, transaction, payout, and dispute metrics to platform_statistics_daily
 * Usage: npx tsx tools/database/scripts/add-metrics-columns.ts
 * Location: tools/database/scripts/add-metrics-columns.ts
 * SQL File: tools/database/migrations/add-metrics-columns.sql
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from apps/web/.env.local
const envPath = path.resolve(__dirname, '../../../apps/web/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function addMetrics() {
  console.log('📊 Adding new metrics to platform_statistics_daily table\n');
  console.log('Reading SQL migration file...');

  try {
    // Read the SQL migration file
    const sqlPath = path.resolve(__dirname, '../migrations/add-metrics-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolon and filter out comments
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Extract column name for better logging
      const alterMatch = statement.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
      const commentMatch = statement.match(/COMMENT ON COLUMN .*\.(\w+)/);
      const columnName = alterMatch?.[1] || commentMatch?.[1] || `statement-${i + 1}`;

      const isComment = statement.toUpperCase().startsWith('COMMENT');
      const action = isComment ? 'Adding comment for' : 'Adding column';

      process.stdout.write(`${action} ${columnName}... `);

      try {
        // For ALTER TABLE and COMMENT statements, we need to use direct SQL execution
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // Check if error is about RPC function not existing
          if (error.message.includes('function') && error.message.includes('does not exist')) {
            console.log('⚠️  exec_sql RPC not available');
            console.log('\n❌ Cannot execute SQL directly via Supabase client.');
            console.log('\n📝 Please run the SQL manually in Supabase SQL Editor:');
            console.log(`   File: ${sqlPath}\n`);
            return;
          }

          console.log(`❌ ${error.message}`);
          errorCount++;
        } else {
          console.log('✅');
          successCount++;
        }
      } catch (error: any) {
        console.log(`❌ ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✅ All metrics added successfully!');
    } else {
      console.log(`\n⚠️  ${errorCount} statements failed. Please review errors above.`);
    }

  } catch (error: any) {
    console.error('\n❌ Error reading or executing migration:');
    console.error(`  ${error.message}`);
    console.error('\n📝 SQL file location: tools/database/migrations/add-metrics-columns.sql');
    console.error('   You may need to run this SQL manually in Supabase SQL Editor.');
  }
}

addMetrics();
