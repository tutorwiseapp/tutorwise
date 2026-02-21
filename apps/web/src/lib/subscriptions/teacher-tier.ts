/**
 * Teacher Free Tier Subscription System
 *
 * Provides unlimited Sage access for verified teachers as a growth strategy.
 * Teachers are key influencers in EdTech adoption.
 *
 * Verification methods:
 * 1. Email domain verification (.sch.uk, .ac.uk, known school domains)
 * 2. Manual verification (upload teaching license/ID)
 * 3. School admin bulk verification
 *
 * @module lib/subscriptions/teacher-tier
 */

// --- Types ---

export interface TeacherTier {
  type: 'teacher_free';
  status: 'pending' | 'verified' | 'rejected';
  verificationMethod: 'email_domain' | 'manual' | 'school_admin';
  schoolName?: string;
  schoolDomain?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  benefits: string[];
}

export interface TeacherVerificationRequest {
  userId: string;
  email: string;
  schoolName?: string;
  position?: string;
  verificationDocs?: string[]; // URLs to uploaded documents
}

export interface TeacherVerificationResult {
  approved: boolean;
  method: 'email_domain' | 'manual' | 'school_admin';
  reason?: string;
  tier?: TeacherTier;
}

// --- Configuration ---

/**
 * Trusted UK educational email domains
 */
export const TRUSTED_EDUCATION_DOMAINS = [
  // UK Schools
  '.sch.uk',
  '.sch.wales',
  '.sch.scot',

  // UK Universities
  '.ac.uk',

  // Known school networks
  'rbkc.sch.uk', // Royal Borough of Kensington and Chelsea
  'towerhamlets.sch.uk',
  'southwark.sch.uk',
  'lambeth.sch.uk',
  'hackney.sch.uk',

  // MATs (Multi-Academy Trusts)
  'arktrust.org',
  'harrisacademies.org.uk',
  'ormistonacademies.co.uk',
  'e-act.org.uk',

  // International schools (add as needed)
  'british-school.org',
];

/**
 * Teacher free tier benefits
 */
export const TEACHER_TIER_BENEFITS = [
  'Unlimited Sage AI Tutor access',
  'Access to all GCSE subjects',
  'Advanced curriculum tools',
  'Class analytics dashboard (coming soon)',
  'Lesson plan generator (coming soon)',
  'Priority support',
];

// --- Verification Functions ---

/**
 * Check if email domain is a trusted educational institution
 */
export function isEducationalEmail(email: string): {
  isEducational: boolean;
  domain?: string;
  schoolName?: string;
} {
  const emailLower = email.toLowerCase();
  const domain = emailLower.split('@')[1];

  if (!domain) {
    return { isEducational: false };
  }

  // Check against trusted domains
  for (const trustedDomain of TRUSTED_EDUCATION_DOMAINS) {
    if (domain.endsWith(trustedDomain) || domain === trustedDomain.substring(1)) {
      return {
        isEducational: true,
        domain,
        schoolName: extractSchoolName(domain),
      };
    }
  }

  return { isEducational: false };
}

/**
 * Extract school name from domain
 */
function extractSchoolName(domain: string): string | undefined {
  // Try to extract school name from domain
  // e.g., "stpauls.sch.uk" → "St Pauls School"
  const parts = domain.split('.');
  if (parts.length >= 2) {
    const schoolPart = parts[0];
    return schoolPart
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return undefined;
}

/**
 * Auto-verify teacher based on email domain
 */
export async function autoVerifyTeacher(
  email: string
): Promise<TeacherVerificationResult> {
  const { isEducational, domain, schoolName } = isEducationalEmail(email);

  if (isEducational) {
    return {
      approved: true,
      method: 'email_domain',
      tier: {
        type: 'teacher_free',
        status: 'verified',
        verificationMethod: 'email_domain',
        schoolName,
        schoolDomain: domain,
        verifiedAt: new Date(),
        benefits: TEACHER_TIER_BENEFITS,
      },
    };
  }

  return {
    approved: false,
    method: 'email_domain',
    reason: 'Email domain not recognized as educational institution',
  };
}

/**
 * Request manual verification
 */
export async function requestManualVerification(
  request: TeacherVerificationRequest
): Promise<{ success: boolean; message: string }> {
  // TODO: Store verification request in database
  // TODO: Notify admin team for manual review
  // TODO: Send confirmation email to user

  return {
    success: true,
    message: 'Verification request submitted. You will receive an email within 2-3 business days.',
  };
}

/**
 * Grant teacher tier to user
 */
export async function grantTeacherTier(
  userId: string,
  tier: TeacherTier,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update profile with teacher tier
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'teacher_free',
        subscription_metadata: tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // TODO: Send welcome email
    // TODO: Track conversion in analytics
    // TODO: Add to teacher segment in CRM

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Check if user has teacher tier
 */
export async function hasTeacherTier(
  userId: string,
  supabase: any
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (error || !data) return false;

    return data.subscription_tier === 'teacher_free';
  } catch {
    return false;
  }
}

/**
 * Get teacher tier details
 */
export async function getTeacherTierDetails(
  userId: string,
  supabase: any
): Promise<TeacherTier | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_metadata')
      .eq('id', userId)
      .single();

    if (error || !data || !data.subscription_metadata) return null;

    return data.subscription_metadata as TeacherTier;
  } catch {
    return null;
  }
}

// --- Usage Tracking ---

/**
 * Track teacher tier signups for analytics
 */
export async function trackTeacherSignup(
  userId: string,
  method: 'email_domain' | 'manual' | 'school_admin',
  schoolName?: string
): Promise<void> {
  // TODO: Send event to analytics
  console.log('[TeacherTier] Teacher signup tracked:', {
    userId,
    method,
    schoolName,
  });

  // TODO: Publish to CAS Marketer for growth tracking
}
