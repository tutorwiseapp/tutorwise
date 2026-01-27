/**
 * Email System Test Script
 *
 * Run with: npx tsx tools/scripts/test-email-system.ts
 *
 * Tests all email functions by sending to a test email address.
 * Set TEST_EMAIL environment variable or defaults to admin@tutorwise.io
 *
 * Updated: 2025-01-27 - Uses new base email template system
 */

import { Resend } from 'resend';

// Import email generators
import { generateEmailTemplate, paragraph, bold, stageTransition, tokens } from '../../apps/web/src/lib/email-templates/base';
import { adminAccessGrantedEmail, adminRoleChangedEmail, adminAccessRevokedEmail } from '../../apps/web/src/lib/email-templates/admin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@tutorwise.io';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Tutorwise <noreply@tutorwise.io>';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY environment variable is required');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function sendTestEmail(name: string, subject: string, html: string): Promise<boolean> {
  try {
    console.log(`\n📧 Testing: ${name}`);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TEST_EMAIL,
      subject: `[TEST] ${subject}`,
      html: html,
    });

    if (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({ name, success: false, error: error.message });
      return false;
    }

    console.log(`   ✅ Sent: ${data?.id}`);
    results.push({ name, success: true });
    return true;
  } catch (err: any) {
    console.log(`   ❌ Error: ${err.message}`);
    results.push({ name, success: false, error: err.message });
    return false;
  }
}

// Helper for feature items (used in invitation emails)
function featureItem(emoji: string, title: string, description: string): string {
  return `
    <div style="padding: 12px 16px; background: ${tokens.colors.background}; border-radius: ${tokens.borderRadius}; margin-bottom: 8px;">
      <p style="margin: 0; font-size: 15px; color: ${tokens.colors.textPrimary};">
        <strong style="color: ${tokens.colors.primary};">${emoji} ${title}</strong><br/>
        <span style="color: ${tokens.colors.textMuted}; font-size: 14px;">${description}</span>
      </p>
    </div>
  `;
}

// Test 1: Connection Invitation (default variant)
async function testConnectionInvitation() {
  const body = `
    ${paragraph(`${bold('Test User')} has invited you to join Tutorwise, a professional tutoring network where tutors, agents, and clients connect to grow together.`)}
    <div style="margin: 24px 0;">
      ${featureItem('🤝', 'Build Your Network', 'Connect with tutors, agents, and clients in your field')}
      ${featureItem('💰', 'Earn Commissions', 'Refer others and earn 10% lifetime commission on their bookings')}
      ${featureItem('🚀', 'Grow Together', 'Collaborate with your network to amplify your reach')}
    </div>
  `;

  const html = generateEmailTemplate({
    headline: "You're invited to Tutorwise",
    variant: 'default',
    body,
    cta: {
      text: 'Join Tutorwise',
      url: 'https://tutorwise.io/signup',
    },
  });

  return sendTestEmail('Connection Invitation', 'Join the Tutorwise Network', html);
}

// Test 2: New Referral (default variant with highlight)
async function testNewReferralEmail() {
  const body = `
    ${paragraph(`Great news! ${bold('John Doe')} (john@example.com) just joined ${bold('Test Organisation')} through your referral link.`)}
    ${paragraph(`Your referral is now in your pipeline as a ${bold('New Lead')}. You can track their progress and earn commission when they convert to a booking.`)}
  `;

  const html = generateEmailTemplate({
    headline: 'New Referral!',
    variant: 'default',
    recipientName: 'Test User',
    body,
    cta: {
      text: 'View Your Pipeline',
      url: 'https://tutorwise.io/referrals',
    },
    footerNote: 'Keep sharing your referral link to earn more commissions!',
  });

  return sendTestEmail('New Referral', '🎉 New Referral: John Doe joined through your link!', html);
}

// Test 3: Stage Change (default variant with stage transition)
async function testStageChangeEmail() {
  const body = `
    ${paragraph(`Your referral ${bold('John Doe')} has moved forward in the pipeline!`)}
    ${stageTransition('Contacted', 'Meeting Scheduled')}
  `;

  const html = generateEmailTemplate({
    headline: 'Referral Progress Update',
    variant: 'default',
    recipientName: 'Test User',
    body,
    highlight: {
      label: 'Estimated Value',
      value: '£500',
    },
    cta: {
      text: 'View Full Pipeline',
      url: 'https://tutorwise.io/referrals',
    },
  });

  return sendTestEmail('Stage Change', '📈 Referral Update: John Doe → Meeting Scheduled', html);
}

// Test 4: Commission Earned (success variant with highlight)
async function testCommissionEarnedEmail() {
  const body = `
    ${paragraph(`Congratulations! Your referral ${bold('John Doe')} has completed their booking and you've earned commission!`)}
    ${paragraph(`Your commission will be paid out according to Test Organisation's payout schedule.`)}
  `;

  const html = generateEmailTemplate({
    headline: 'Commission Earned!',
    variant: 'success',
    recipientName: 'Test User',
    body,
    highlight: {
      label: 'Commission Earned',
      value: '£50.00',
      sublabel: 'Total Lifetime Earnings',
      subvalue: '£250.00',
    },
    cta: {
      text: 'View Your Earnings',
      url: 'https://tutorwise.io/referrals',
    },
    footerNote: 'Keep referring to earn even more commissions!',
  });

  return sendTestEmail('Commission Earned', '💰 You earned £50.00 commission!', html);
}

// Test 5: Achievement Unlocked (success variant)
async function testAchievementUnlockedEmail() {
  const body = `
    ${paragraph(`Congratulations! You've unlocked a new achievement in your Test Organisation referral program!`)}
    ${paragraph(`${bold('First Referral')} (Bronze Tier)`)}
    ${paragraph('You made your first successful referral!')}
  `;

  const html = generateEmailTemplate({
    headline: 'Achievement Unlocked!',
    variant: 'success',
    recipientName: 'Test User',
    body,
    highlight: {
      label: 'Points Earned',
      value: '+100',
      sublabel: 'Total Points',
      subvalue: '100',
    },
    cta: {
      text: 'View All Achievements',
      url: 'https://tutorwise.io/referrals',
    },
    footerNote: 'Keep going to unlock more achievements and earn rewards!',
  });

  return sendTestEmail('Achievement Unlocked', '🏆 Achievement Unlocked: First Referral!', html);
}

// Test 6: Admin Access Granted (using admin template)
async function testAdminAccessGrantedEmail() {
  const { subject, html } = adminAccessGrantedEmail({
    recipientName: 'Test User',
    actorName: 'Super Admin',
    actorEmail: 'admin@tutorwise.io',
    role: 'superadmin',
    reason: 'Promoted to platform administrator',
    adminUrl: 'https://tutorwise.io/admin',
  });

  return sendTestEmail('Admin Access Granted', subject, html);
}

// Test 7: Admin Role Changed (using admin template)
async function testAdminRoleChangedEmail() {
  const { subject, html } = adminRoleChangedEmail({
    recipientName: 'Test User',
    actorName: 'Super Admin',
    actorEmail: 'admin@tutorwise.io',
    oldRole: 'moderator',
    newRole: 'admin',
    reason: 'Role upgraded based on performance',
    adminUrl: 'https://tutorwise.io/admin',
  });

  return sendTestEmail('Admin Role Changed', subject, html);
}

// Test 8: Admin Access Revoked (error variant)
async function testAdminAccessRevokedEmail() {
  const { subject, html } = adminAccessRevokedEmail({
    recipientName: 'Test User',
    actorName: 'Super Admin',
    actorEmail: 'admin@tutorwise.io',
    role: 'admin',
    reason: 'Access revoked due to policy change',
    adminUrl: 'https://tutorwise.io/admin',
  });

  return sendTestEmail('Admin Access Revoked', subject, html);
}

// Test 9: Referral Reminder
async function testReferralReminderEmail() {
  const body = `
    ${paragraph(`${bold('Test User')} invited you to join Tutorwise ${bold('3 days ago')}.`)}
    ${paragraph("Don't miss out on the opportunity to connect with a growing network of tutors, agents, and clients—and start earning commissions on referrals!")}
  `;

  const html = generateEmailTemplate({
    headline: 'Your invitation is waiting',
    variant: 'default',
    recipientName: 'John Doe',
    body,
    cta: {
      text: 'Get Started',
      url: 'https://tutorwise.io/signup',
    },
  });

  return sendTestEmail('Referral Reminder', 'Your connection is waiting for you on Tutorwise', html);
}

// Test 10: Warning Variant (for completeness)
async function testWarningVariant() {
  const html = generateEmailTemplate({
    headline: 'Action Required',
    variant: 'warning',
    recipientName: 'Test User',
    body: paragraph('This is a test of the warning variant email template. You might see this for payment issues or account warnings.'),
    cta: {
      text: 'Take Action',
      url: 'https://tutorwise.io/settings',
    },
  });

  return sendTestEmail('Warning Variant', '⚠️ Action Required', html);
}

async function runAllTests() {
  console.log('🧪 Email System Test Suite (New Base Template)');
  console.log('==============================================');
  console.log(`📬 Test recipient: ${TEST_EMAIL}`);
  console.log(`📤 From: ${FROM_EMAIL}`);
  console.log('');

  // Run all tests with a small delay between each to avoid rate limits
  await testConnectionInvitation();
  await new Promise(r => setTimeout(r, 500));

  await testNewReferralEmail();
  await new Promise(r => setTimeout(r, 500));

  await testStageChangeEmail();
  await new Promise(r => setTimeout(r, 500));

  await testCommissionEarnedEmail();
  await new Promise(r => setTimeout(r, 500));

  await testAchievementUnlockedEmail();
  await new Promise(r => setTimeout(r, 500));

  await testAdminAccessGrantedEmail();
  await new Promise(r => setTimeout(r, 500));

  await testAdminRoleChangedEmail();
  await new Promise(r => setTimeout(r, 500));

  await testAdminAccessRevokedEmail();
  await new Promise(r => setTimeout(r, 500));

  await testReferralReminderEmail();
  await new Promise(r => setTimeout(r, 500));

  await testWarningVariant();

  // Print summary
  console.log('\n\n📊 Test Summary');
  console.log('================');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.name}${r.error ? ` - ${r.error}` : ''}`);
  });

  console.log('');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(console.error);
