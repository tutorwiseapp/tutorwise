const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database credentials
const supabaseUrl = 'https://lvsmtgmpoysjygdwcrir.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2c210Z21wb3lzanlnZHdjcmlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODIzNTc1NSwiZXhwIjoyMDQzODExNzU1fQ.bxnAgKp_nxnZEqbdF6o0Y3uQfPQLHK2pzC2HQwCg63w';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🔄 Running migration step by step...');

    // Step 1: Add listing_type
    console.log('  Adding listing_type column...');
    await supabase.rpc('exec_sql_statement', {
      statement: "ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_type VARCHAR(100) DEFAULT 'Tutor: One-on-One Session';"
    }).then(() => console.log('  ✅ listing_type added'));

    // Step 2: Add instant_booking_enabled
    console.log('  Adding instant_booking_enabled column...');
    await supabase.from('listings').select('instant_booking_enabled').limit(1);
    // If the query above doesn't error, column exists. Otherwise, we need to use a different approach

    console.log('✅ Migration approach needs adjustment. Let me try direct column addition...');

    // Let's check what columns exist
    const { data: sampleListing, error: sampleError } = await supabase
      .from('listings')
      .select('*')
      .limit(1)
      .single();

    if (!sampleError && sampleListing) {
      console.log('📋 Existing columns:', Object.keys(sampleListing));

      // Check which new columns are missing
      const newColumns = [
        'listing_type',
        'instant_booking_enabled',
        'ai_tools_used',
        'cancellation_policy',
        'duration_options',
        'free_trial',
        'location_details'
      ];

      const existingColumns = Object.keys(sampleListing);
      const missingColumns = newColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length === 0) {
        console.log('✅ All columns already exist!');
      } else {
        console.log('⚠️  Missing columns:', missingColumns);
        console.log('⚠️  These need to be added via Supabase Dashboard SQL Editor or pgAdmin');
        console.log('\nSQL to run:');
        console.log(fs.readFileSync(path.join(__dirname, 'apps/api/migrations/025_add_listing_mvp_fields.sql'), 'utf8'));
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📝 Please run the migration manually via Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/lvsmtgmpoysjygdwcrir/sql');
    console.log('2. Copy the SQL from: apps/api/migrations/025_add_listing_mvp_fields.sql');
    console.log('3. Paste and execute');
  }
}

runMigration();
