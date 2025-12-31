/**
 * Script to check platform_statistics_daily table schema
 * Usage: npx tsx scripts/check-stats-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase URL:', supabaseUrl ? 'Loaded' : 'Missing');
console.log('Service Key:', supabaseKey ? 'Loaded' : 'Missing');
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking platform_statistics_daily table schema...\n');

  // Query information_schema to get column names
  const { data, error } = await supabase
    .from('platform_statistics_daily')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Current columns:');
    const columns = Object.keys(data[0]);
    columns.forEach((col) => {
      console.log(`  - ${col}: ${typeof data[0][col]}`);
    });
  } else {
    console.log('No data found in table');
  }
}

checkSchema();
