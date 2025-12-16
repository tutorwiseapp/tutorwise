/**
 * Filename: tests/e2e/referrals/hierarchical-attribution.test.ts
 * Purpose: E2E tests for hierarchical attribution (URL → Cookie → Manual)
 * Created: 2025-12-16
 * Patent Reference: Section 3 (Hierarchical Attribution Resolution), Dependent Claim 2
 * Migration: 091_hierarchical_attribution_enhancement.sql
 *
 * Test Coverage:
 * - Priority 1: URL Parameter attribution
 * - Priority 2: Cookie fallback attribution
 * - Priority 3: Manual code entry attribution
 * - Priority conflicts (URL overrides Cookie, Cookie overrides Manual)
 * - HMAC signature validation
 * - Tamper detection
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Test utilities
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: Create test agent profile
async function createTestAgent(name: string) {
  const email = `agent-${Date.now()}-${Math.random()}@test.com`;
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (authError) throw authError;

  // Profile created by handle_new_user() trigger
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, referral_code')
    .eq('id', authUser.user.id)
    .single();

  return {
    id: profile!.id,
    referral_code: profile!.referral_code,
    email,
  };
}

// Helper: Create HMAC-signed cookie value
function createSignedCookie(referralId: string): string {
  const secret = process.env.REFERRAL_COOKIE_SECRET!;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(referralId)
    .digest('hex');

  return `${referralId}.${signature}`;
}

// Helper: Create tampered cookie (invalid signature)
function createTamperedCookie(referralId: string): string {
  const fakeSignature = 'deadbeef'.repeat(8); // 64 hex chars
  return `${referralId}.${fakeSignature}`;
}

// Helper: Clean up test data
async function cleanupTestUser(userId: string) {
  await supabase.from('referrals').delete().eq('referred_profile_id', userId);
  await supabase.from('profiles').delete().eq('id', userId);
  await supabase.auth.admin.deleteUser(userId);
}

describe.skip('Hierarchical Attribution Resolution (Patent Section 3)', () => {
  let agentA: Awaited<ReturnType<typeof createTestAgent>>;
  let agentB: Awaited<ReturnType<typeof createTestAgent>>;
  let agentC: Awaited<ReturnType<typeof createTestAgent>>;

  beforeEach(async () => {
    // Create 3 test agents for attribution tests
    agentA = await createTestAgent('Agent A');
    agentB = await createTestAgent('Agent B');
    agentC = await createTestAgent('Agent C');
  });

  afterEach(async () => {
    // Cleanup agents
    await cleanupTestUser(agentA.id);
    await cleanupTestUser(agentB.id);
    await cleanupTestUser(agentC.id);
  });

  describe('Priority 1: URL Parameter Attribution', () => {
    it('should attribute via URL parameter when present', async () => {
      // Simulate user clicking referral link /a/[code]
      const email = `user-url-${Date.now()}@test.com`;

      // Sign up with URL referral code in metadata
      const { data: authUser, error } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'URL Test User',
            referral_code_url: agentA.referral_code, // Priority 1
          },
        },
      });

      expect(error).toBeNull();
      expect(authUser.user).toBeDefined();

      // Verify attribution in profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_profile_id, referral_source')
        .eq('id', authUser.user!.id)
        .single();

      expect(profile?.referred_by_profile_id).toBe(agentA.id);
      expect(profile?.referral_source).toBe('url_parameter');

      // Verify referral record updated
      const { data: referral } = await supabase
        .from('referrals')
        .select('agent_id, referred_profile_id, status, attribution_method')
        .eq('referred_profile_id', authUser.user!.id)
        .single();

      expect(referral?.agent_id).toBe(agentA.id);
      expect(referral?.status).toBe('Signed Up');
      expect(referral?.attribution_method).toBe('url_parameter');

      // Cleanup
      await cleanupTestUser(authUser.user!.id);
    });

    it('should override cookie attribution when URL parameter present', async () => {
      // Setup: Create referral record with cookie for Agent B
      const { data: referralRecord } = await supabase
        .from('referrals')
        .insert({
          agent_id: agentB.id,
          referred_profile_id: null,
          status: 'Referred',
        })
        .select('id')
        .single();

      const signedCookie = createSignedCookie(referralRecord!.id);
      const email = `user-override-${Date.now()}@test.com`;

      // Sign up with BOTH cookie and URL (URL should win)
      const { data: authUser } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Override Test User',
            referral_code_url: agentA.referral_code, // Priority 1
            referral_cookie_id: signedCookie, // Priority 2 (ignored)
            referral_cookie_secret: process.env.REFERRAL_COOKIE_SECRET,
          },
        },
      });

      // Verify Agent A got attribution (URL), not Agent B (cookie)
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_profile_id, referral_source')
        .eq('id', authUser.user!.id)
        .single();

      expect(profile?.referred_by_profile_id).toBe(agentA.id); // Agent A wins
      expect(profile?.referral_source).toBe('url_parameter');

      // Cleanup
      await cleanupTestUser(authUser.user!.id);
    });
  });

  describe('Priority 2: Cookie Fallback Attribution', () => {
    it('should attribute via cookie when no URL parameter', async () => {
      // Setup: Create referral record for cookie
      const { data: referralRecord } = await supabase
        .from('referrals')
        .insert({
          agent_id: agentB.id,
          referred_profile_id: null,
          status: 'Referred',
        })
        .select('id')
        .single();

      const signedCookie = createSignedCookie(referralRecord!.id);
      const email = `user-cookie-${Date.now()}@test.com`;

      // Sign up with only cookie (no URL parameter)
      const { data: authUser } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Cookie Test User',
            referral_cookie_id: signedCookie, // Priority 2
            referral_cookie_secret: process.env.REFERRAL_COOKIE_SECRET,
          },
        },
      });

      // Verify attribution via cookie
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_profile_id, referral_source')
        .eq('id', authUser.user!.id)
        .single();

      expect(profile?.referred_by_profile_id).toBe(agentB.id);
      expect(profile?.referral_source).toBe('cookie');

      // Verify referral record updated
      const { data: referral } = await supabase
        .from('referrals')
        .select('agent_id, referred_profile_id, status, attribution_method')
        .eq('id', referralRecord!.id)
        .single();

      expect(referral?.referred_profile_id).toBe(authUser.user!.id);
      expect(referral?.status).toBe('Signed Up');
      expect(referral?.attribution_method).toBe('cookie');

      // Cleanup
      await cleanupTestUser(authUser.user!.id);
    });

    it('should reject tampered cookie (invalid HMAC signature)', async () => {
      // Setup: Create referral record
      const { data: referralRecord } = await supabase
        .from('referrals')
        .insert({
          agent_id: agentB.id,
          referred_profile_id: null,
          status: 'Referred',
        })
        .select('id')
        .single();

      // Create tampered cookie with wrong signature
      const tamperedCookie = createTamperedCookie(referralRecord!.id);
      const email = `user-tampered-${Date.now()}@test.com`;

      // Sign up with tampered cookie
      const { data: authUser } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Tampered Cookie User',
            referral_cookie_id: tamperedCookie, // Invalid signature
            referral_cookie_secret: process.env.REFERRAL_COOKIE_SECRET,
          },
        },
      });

      // Verify NO attribution (cookie rejected due to tampering)
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_profile_id, referral_source')
        .eq('id', authUser.user!.id)
        .single();

      expect(profile?.referred_by_profile_id).toBeNull(); // No attribution
      expect(profile?.referral_source).toBeNull();

      // Cleanup
      await cleanupTestUser(authUser.user!.id);
    });

    it('should override manual entry when cookie present', async () => {
      // Setup: Create referral record for cookie
      const { data: referralRecord } = await supabase
        .from('referrals')
        .insert({
          agent_id: agentB.id,
          referred_profile_id: null,
          status: 'Referred',
        })
        .select('id')
        .single();

      const signedCookie = createSignedCookie(referralRecord!.id);
      const email = `user-cookie-override-${Date.now()}@test.com`;

      // Sign up with BOTH cookie and manual entry (cookie should win)
      const { data: authUser } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Cookie Override User',
            referral_cookie_id: signedCookie, // Priority 2
            referral_cookie_secret: process.env.REFERRAL_COOKIE_SECRET,
            referral_code_manual: agentC.referral_code, // Priority 3 (ignored)
          },
        },
      });

      // Verify Agent B got attribution (cookie), not Agent C (manual)
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_profile_id, referral_source')
        .eq('id', authUser.user!.id)
        .single();

      expect(profile?.referred_by_profile_id).toBe(agentB.id); // Agent B wins
      expect(profile?.referral_source).toBe('cookie');

      // Cleanup
      await cleanupTestUser(authUser.user!.id);
    });
  });

  describe('Priority 3: Manual Code Entry Attribution', () => {
    it('should attribute via manual entry when no URL or cookie', async () => {
      const email = `user-manual-${Date.now()}@test.com`;

      // Sign up with only manual code entry
      const { data: authUser } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Manual Entry User',
            referral_code_manual: agentC.referral_code, // Priority 3
          },
        },
      });

      // Verify attribution via manual entry
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_profile_id, referral_source')
        .eq('id', authUser.user!.id)
        .single();

      expect(profile?.referred_by_profile_id).toBe(agentC.id);
      expect(profile?.referral_source).toBe('manual_entry');

      // Verify new referral record created
      const { data: referral } = await supabase
        .from('referrals')
        .select('agent_id, referred_profile_id, status, attribution_method')
        .eq('referred_profile_id', authUser.user!.id)
        .single();

      expect(referral?.agent_id).toBe(agentC.id);
      expect(referral?.status).toBe('Signed Up');
      expect(referral?.attribution_method).toBe('manual_entry');

      // Cleanup
      await cleanupTestUser(authUser.user!.id);
    });

    it('should handle invalid manual code (no attribution)', async () => {
      const email = `user-invalid-${Date.now()}@test.com`;

      // Sign up with invalid manual code
      const { data: authUser } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Invalid Code User',
            referral_code_manual: 'INVALID', // Doesn't exist
          },
        },
      });

      // Verify NO attribution (invalid code)
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_profile_id, referral_source')
        .eq('id', authUser.user!.id)
        .single();

      expect(profile?.referred_by_profile_id).toBeNull();
      expect(profile?.referral_source).toBeNull();

      // Cleanup
      await cleanupTestUser(authUser.user!.id);
    });
  });

  describe('Organic Signups (No Attribution)', () => {
    it('should handle organic signup with no referral context', async () => {
      const email = `user-organic-${Date.now()}@test.com`;

      // Sign up with NO referral data
      const { data: authUser } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Organic User',
            // No referral_code_url, referral_cookie_id, or referral_code_manual
          },
        },
      });

      // Verify NO attribution
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_profile_id, referral_source')
        .eq('id', authUser.user!.id)
        .single();

      expect(profile?.referred_by_profile_id).toBeNull();
      expect(profile?.referral_source).toBeNull();

      // Verify NO referral record created
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referred_profile_id', authUser.user!.id);

      expect(count).toBe(0);

      // Cleanup
      await cleanupTestUser(authUser.user!.id);
    });
  });

  describe('Case Sensitivity', () => {
    it('should match referral codes case-insensitively (uppercased)', async () => {
      const email = `user-case-${Date.now()}@test.com`;

      // Agent A's code might be 'kRz7Bq2'
      const lowercaseCode = agentA.referral_code.toLowerCase();

      // Sign up with lowercase version
      const { data: authUser } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!',
        options: {
          data: {
            full_name: 'Case Test User',
            referral_code_manual: lowercaseCode, // Lowercase input
          },
        },
      });

      // Verify attribution succeeds (UPPER() in trigger handles case-insensitivity)
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_profile_id')
        .eq('id', authUser.user!.id)
        .single();

      expect(profile?.referred_by_profile_id).toBe(agentA.id);

      // Cleanup
      await cleanupTestUser(authUser.user!.id);
    });
  });
});
