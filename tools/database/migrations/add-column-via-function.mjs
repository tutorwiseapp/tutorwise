#!/usr/bin/env node

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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function addColumn() {
  console.log('🚀 Attempting to add profile_completed column...\n');

  try {
    // First, create a function that will execute the DDL
    console.log('1️⃣ Creating helper function...');
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION add_profile_completed_column()
      RETURNS void AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'profiles' AND column_name = 'profile_completed'
        ) THEN
          ALTER TABLE profiles ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
          RAISE NOTICE 'Column added successfully';
        ELSE
          RAISE NOTICE 'Column already exists';
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Try to create the function using RPC
    const { error: funcError } = await supabase.rpc('exec', {
      sql: createFunctionSQL
    });

    if (funcError) {
      console.log('   Cannot create function via RPC:', funcError.message);
      console.log('\n❌ Direct DDL execution not available via Supabase client.');
      console.log('\n📋 Please run the following SQL in Supabase Dashboard SQL Editor:');
      console.log('\n' + '='.repeat(60));
      console.log('ALTER TABLE profiles');
      console.log('ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;');
      console.log('\n' + '='.repeat(60));
      console.log('\nDashboard URL: https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir/sql/new');
      process.exit(1);
    }

    // Now call the function
    console.log('2️⃣ Executing function...');
    const { error: execError } = await supabase.rpc('add_profile_completed_column');

    if (execError) {
      console.log('   Failed:', execError.message);
      process.exit(1);
    }

    console.log('✅ Column added successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addColumn();
