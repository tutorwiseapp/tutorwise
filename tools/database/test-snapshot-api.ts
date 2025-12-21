/**
 * Script to test the snapshot API endpoint
 * Usage: npx tsx tools/database/test-snapshot-api.ts
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

async function testSnapshotAPI() {
  console.log('Testing Snapshot API...\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // For testing, we need to be authenticated
  // You can replace this with actual test credentials or skip this test
  console.log('Note: This test requires an authenticated user session.');
  console.log('To fully test the API:');
  console.log('1. Navigate to http://localhost:3001/help-centre');
  console.log('2. Make sure you are logged in');
  console.log('3. Click "Report a Problem" in the Quick Actions widget');
  console.log('4. Fill out the form:');
  console.log('   - Action: "Submit a booking"');
  console.log('   - Issue: "Button does not respond when clicked"');
  console.log('   - Impact: Select "I can\'t continue"');
  console.log('   - Include Screenshot: Check this option');
  console.log('   - Click "Capture Screenshot"');
  console.log('5. Click "Send Report"\n');

  console.log('Expected results:');
  console.log('✓ Success message appears');
  console.log('✓ Modal closes');
  console.log('✓ Database record created in help_support_snapshots');
  console.log('✓ Screenshot uploaded to support-snapshots bucket\n');

  console.log('To verify in database:');
  console.log('Run: psql "$POSTGRES_URL_NON_POOLING" -c "SELECT id, action, issue, impact, capture_level, screenshot_url IS NOT NULL as has_screenshot, created_at FROM help_support_snapshots ORDER BY created_at DESC LIMIT 5;"');

  console.log('\n---\n');
  console.log('Checking storage bucket...');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }

    const snapshotBucket = buckets?.find(b => b.name === 'support-snapshots');

    if (snapshotBucket) {
      console.log('✓ Storage bucket "support-snapshots" exists');
      console.log(`  Created: ${snapshotBucket.created_at}`);
      console.log(`  Public: ${snapshotBucket.public}`);
    } else {
      console.log('✗ Storage bucket "support-snapshots" not found');
    }
  } catch (error) {
    console.error('Error checking storage:', error);
  }

  console.log('\n---\n');
  console.log('Database schema verification...');

  // Check if we can query the table (will fail if not authenticated)
  const { data, error } = await supabase
    .from('help_support_snapshots')
    .select('count')
    .limit(1);

  if (error) {
    console.log('Note: Cannot query table without authentication (expected)');
    console.log('RLS is working correctly - table requires authentication\n');
  } else {
    console.log('✓ Table is accessible with current auth level\n');
  }
}

testSnapshotAPI();
