/**
 * Setup Test Users for E2E Testing
 *
 * This script creates three test users in Supabase for E2E testing:
 * - Test Tutor (provider role)
 * - Test Client (seeker role)
 * - Test Agent (agent role)
 *
 * Usage:
 *   npx tsx scripts/setup-test-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (admin access)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TestUser {
  email: string;
  password: string;
  role: 'provider' | 'seeker' | 'agent';
  name: string;
  roleDetails: any;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'test-tutor@tutorwise.com',
    password: 'TestPassword123!',
    role: 'provider',
    name: 'Test Tutor',
    roleDetails: {
      subjects: ['Mathematics', 'Physics'],
      teaching_experience: '5-10 years',
      teaching_methods: ['Online', 'In-Person'],
      hourly_rate: 50,
      qualifications: ['BSc Mathematics', 'PGCE'],
      specializations: ['Exam Preparation'],
      teaching_style: 'Interactive and engaging',
      availability: { weekdays: ['evening'], weekends: ['morning', 'afternoon'] }
    }
  },
  {
    email: 'test-client@tutorwise.com',
    password: 'TestPassword123!',
    role: 'seeker',
    name: 'Test Client',
    roleDetails: {
      subjects: ['Mathematics', 'Physics'],
      goals: ['Improve exam scores', 'Build confidence'],
      current_level: 'GCSE',
      target_level: 'A-Level',
      learning_style: 'Visual learner',
      budget_range: '£30-50/hour',
      availability_hours: 10
    }
  },
  {
    email: 'test-agent@tutorwise.com',
    password: 'TestPassword123!',
    role: 'agent',
    name: 'Test Agent',
    roleDetails: {
      subjects: ['Mathematics', 'Science', 'English'],
      commission_rate: 15,
      target_categories: ['GCSE', 'A-Level', 'University'],
      performance_metrics: {
        total_placements: 50,
        years_in_business: 5,
        success_rate: 95
      }
    }
  }
];

async function createTestUser(testUser: TestUser): Promise<boolean> {
  console.log(`\n📝 Creating user: ${testUser.email}`);

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === testUser.email);

    if (userExists) {
      console.log(`⚠️  User already exists: ${testUser.email}`);

      // Get existing user
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users?.find(u => u.email === testUser.email);

      if (!user) {
        console.error(`❌ Could not find existing user`);
        return false;
      }

      console.log(`✅ User ID: ${user.id}`);

      // Update profile and role_details
      await updateUserData(user.id, testUser);
      return true;
    }

    // Create new user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true, // Auto-confirm email for test users
      user_metadata: {
        full_name: testUser.name,
        role: testUser.role
      }
    });

    if (authError) {
      console.error(`❌ Error creating auth user:`, authError.message);
      return false;
    }

    console.log(`✅ Created auth user: ${authData.user.id}`);

    // Create profile entry with onboarding completed
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: testUser.email,
        display_name: testUser.name,
        first_name: testUser.name.split(' ')[0],
        last_name: testUser.name.split(' ')[1] || '',
        roles: [testUser.role],
        onboarding_progress: {
          onboarding_completed: true,
          completed_steps: ['welcome', 'role-selection', 'role-details'],
          current_step: 'completed'
        },
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error(`❌ Error creating profile:`, profileError.message);
      return false;
    }

    console.log(`✅ Created profile entry`);

    // Create role_details entry
    const roleDetailsData = {
      profile_id: authData.user.id,
      role_type: testUser.role,
      ...testUser.roleDetails,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: roleError } = await supabase
      .from('role_details')
      .insert(roleDetailsData);

    if (roleError) {
      console.error(`❌ Error creating role_details:`, roleError.message);
      return false;
    }

    console.log(`✅ Created role_details entry`);
    console.log(`✅ Test user setup complete: ${testUser.email}`);

    return true;

  } catch (error) {
    console.error(`❌ Unexpected error:`, error);
    return false;
  }
}

async function updateUserData(userId: string, testUser: TestUser): Promise<void> {
  console.log(`🔄 Updating existing user data...`);

  // Update profile with onboarding completed
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      display_name: testUser.name,
      first_name: testUser.name.split(' ')[0],
      last_name: testUser.name.split(' ')[1] || '',
      roles: [testUser.role],
      onboarding_progress: {
        onboarding_completed: true,
        completed_steps: ['welcome', 'role-selection', 'role-details'],
        current_step: 'completed'
      }
    })
    .eq('id', userId);

  if (profileError) {
    console.error(`⚠️  Error updating profile:`, profileError.message);
  } else {
    console.log(`✅ Updated profile`);
  }

  // Upsert role_details
  const roleDetailsData = {
    profile_id: userId,
    role_type: testUser.role,
    ...testUser.roleDetails,
    updated_at: new Date().toISOString()
  };

  const { error: roleError } = await supabase
    .from('role_details')
    .upsert(roleDetailsData, {
      onConflict: 'profile_id,role_type'
    });

  if (roleError) {
    console.error(`⚠️  Error updating role_details:`, roleError.message);
  } else {
    console.log(`✅ Updated role_details`);
  }
}

async function main() {
  console.log('🚀 Setting up test users for E2E testing\n');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Service Key:', supabaseServiceKey?.substring(0, 20) + '...\n');

  let successCount = 0;
  let failCount = 0;

  for (const testUser of TEST_USERS) {
    const success = await createTestUser(testUser);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(60));

  if (failCount === 0) {
    console.log('\n🎉 All test users created successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Copy .env.test.example to .env.test');
    console.log('2. Add these credentials to .env.test:');
    console.log('\n' + TEST_USERS.map(u =>
      `   ${u.email.toUpperCase().replace('@TUTORWISE.COM', '').replace('TEST-', 'TEST_').replace('-', '_')}_EMAIL=${u.email}\n   ${u.email.toUpperCase().replace('@TUTORWISE.COM', '').replace('TEST-', 'TEST_').replace('-', '_')}_PASSWORD=${u.password}`
    ).join('\n\n'));
    console.log('\n3. Run E2E tests:');
    console.log('   npx playwright test tests/e2e/account/professional-info.spec.ts');
  } else {
    console.log('\n⚠️  Some users failed to create. Check errors above.');
    process.exit(1);
  }
}

main();
