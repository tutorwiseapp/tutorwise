#!/usr/bin/env node

/**
 * Direct table drop using Supabase RPC
 * Drops saved_listings and saved_profiles tables
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function dropTables() {
  console.log('Dropping old saved tables...\n');

  try {
    // We need to use the REST API directly since Supabase-js doesn't support DROP TABLE
    // For safety, we'll just print the instructions
    console.log('⚠️  These tables need to be dropped manually in Supabase SQL Editor:');
    console.log('\n1. Go to: https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir/sql/new');
    console.log('\n2. Run this SQL:\n');
    console.log('DROP TABLE IF EXISTS public.saved_listings CASCADE;');
    console.log('DROP TABLE IF EXISTS public.saved_profiles CASCADE;');
    console.log('\n3. Click "Run"');
    console.log('\nNote: CASCADE will remove any dependent objects (foreign keys, etc.)');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropTables();
