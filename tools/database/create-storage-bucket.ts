/**
 * Script to create support-snapshots storage bucket via Supabase API
 * Usage: npx tsx tools/database/create-storage-bucket.ts
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

async function createStorageBucket() {
  console.log('Creating support-snapshots storage bucket...');

  try {
    // Create the bucket
    const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'support-snapshots',
        public: false,
        file_size_limit: 10485760, // 10MB
        allowed_mime_types: ['image/png', 'image/jpeg'],
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      if (error.error === 'Duplicate') {
        console.log('✓ Bucket already exists');
      } else {
        throw new Error(`Failed to create bucket: ${JSON.stringify(error)}`);
      }
    } else {
      console.log('✓ Bucket created successfully');
    }

    // Set up RLS policies for the bucket
    console.log('Setting up RLS policies...');

    // Policy 1: Users can upload to their own folder
    const uploadPolicy = {
      name: 'Users can upload their own snapshots',
      definition: {
        roles: ['authenticated'],
        using: "(bucket_id = 'support-snapshots' AND auth.uid()::text = (storage.foldername(name))[1])",
      },
      action: 'INSERT',
    };

    // Policy 2: Users can view their own snapshots
    const selectPolicy = {
      name: 'Users can view their own snapshots',
      definition: {
        roles: ['authenticated'],
        using: "(bucket_id = 'support-snapshots' AND auth.uid()::text = (storage.foldername(name))[1])",
      },
      action: 'SELECT',
    };

    // Policy 3: Service role can access all snapshots
    const servicePolicy = {
      name: 'Service role can access all snapshots',
      definition: {
        roles: ['service_role'],
        using: "bucket_id = 'support-snapshots'",
      },
      action: 'SELECT',
    };

    const policies = [uploadPolicy, selectPolicy, servicePolicy];

    for (const policy of policies) {
      const policyResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/support-snapshots/policy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policy),
      });

      if (!policyResponse.ok) {
        const error = await policyResponse.json();
        console.warn(`⚠ Policy "${policy.name}" warning:`, error.message || error.error);
      } else {
        console.log(`✓ Policy created: ${policy.name}`);
      }
    }

    console.log('\n✓ Storage bucket setup completed!');
    console.log('\nBucket details:');
    console.log('  Name: support-snapshots');
    console.log('  Public: false');
    console.log('  Max file size: 10MB');
    console.log('  Allowed types: image/png, image/jpeg');

  } catch (error) {
    console.error('Storage bucket setup error:', error);
    process.exit(1);
  }
}

createStorageBucket();
