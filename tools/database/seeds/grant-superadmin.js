#!/usr/bin/env node
/**
 * Grant Superadmin Access Script
 *
 * This script grants superadmin access to the specified email address
 * using the Supabase service role key.
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Read environment variables from .env.local
const envPath = path.join(__dirname, '../../../.env.local');
const envLocal = fs.readFileSync(envPath, 'utf8');

// Extract Supabase credentials
const urlMatch = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/);
const keyMatch = envLocal.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/);

if (!urlMatch || !keyMatch) {
  console.error('❌ Error: Could not find Supabase credentials in .env.local');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const url = urlMatch[1];
const serviceKey = keyMatch[1];

console.log('🔐 Connecting to Supabase...');
console.log(`   URL: ${url}`);
console.log('');

const supabase = createClient(url, serviceKey);

async function grantSuperadminAccess() {
  const email = 'micquan@gmail.com';

  console.log(`👤 Granting superadmin access to: ${email}`);
  console.log('');

  try {
    // Update profile to grant superadmin
    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_admin: true,
        admin_role: 'superadmin',
        admin_role_level: 4,
        admin_granted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select('id, email, first_name, last_name, is_admin, admin_role, admin_role_level, admin_granted_at');

    if (error) {
      console.error('❌ Error granting superadmin access:');
      console.error('   ', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.error('❌ Error: No profile found with email:', email);
      console.error('   Make sure the user has signed up first');
      process.exit(1);
    }

    console.log('✅ SUCCESS: Superadmin access granted!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Updated Profile:');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  ID:               ${data[0].id}`);
    console.log(`  Email:            ${data[0].email}`);
    console.log(`  Name:             ${data[0].first_name || ''} ${data[0].last_name || ''}`);
    console.log(`  Is Admin:         ${data[0].is_admin}`);
    console.log(`  Admin Role:       ${data[0].admin_role}`);
    console.log(`  Admin Role Level: ${data[0].admin_role_level}`);
    console.log(`  Granted At:       ${new Date(data[0].admin_granted_at).toLocaleString()}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Refresh your browser');
    console.log('  2. Navigate to: http://localhost:3000/admin');
    console.log('  3. You now have full superadmin access!');
    console.log('');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

grantSuperadminAccess();
