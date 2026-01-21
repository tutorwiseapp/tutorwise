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
    console.log('🔄 Reading migration file...');
    const migrationPath = path.join(__dirname, 'apps/api/migrations/025_add_listing_mvp_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Executing migration 025_add_listing_mvp_fields.sql...');

    // Execute the migration using rpc to exec_sql function
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration 025 completed successfully!');
    console.log('📋 Added columns to listings table:');
    console.log('   - listing_type VARCHAR(100)');
    console.log('   - instant_booking_enabled BOOLEAN');
    console.log('   - ai_tools_used TEXT[]');
    console.log('   - cancellation_policy TEXT');
    console.log('   - duration_options INTEGER[]');
    console.log('   - free_trial BOOLEAN');
    console.log('   - location_details TEXT');
    console.log('   - delivery_mode VARCHAR(50) (if not exists)');
    console.log('✅ Created indexes for filtering');

  } catch (err) {
    console.error('❌ Error running migration:', err);
    process.exit(1);
  }
}

runMigration();
