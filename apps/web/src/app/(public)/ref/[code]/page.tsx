/**
 * Filename: src/app/ref/[code]/page.tsx
 * Purpose: Referral landing page - Trust-First SEO authority amplification
 * Created: 2025-12-31
 * Phase: Trust-First SEO - Phase 3.2
 *
 * Key Principles:
 * - Pages ARE indexable (unlike typical referral links)
 * - Act as authority amplification points for high-trust referrers
 * - Only index if referrer has SEO eligibility score >= 75
 * - Include referrer's trust score in metadata for transparency
 * - Redirect to signup with referral code preserved
 */

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { SEOEligibilityResolver } from '@/services/seo/eligibility-resolver';
import { generatePersonSchema } from '@/services/seo/schema-generator';

interface Props {
  params: Promise<{
    code: string;
  }>;
}

/**
 * Get referrer profile from referral code
 */
async function getReferrerByCode(referralCode: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      bio,
      profile_picture_url,
      role,
      referral_code,
      total_referrals_sent
    `)
    .eq('referral_code', referralCode)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile;
}

/**
 * Get CaaS score for referrer
 */
async function getCaaSScore(profileId: string): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('caas_scores')
    .select('total_score')
    .eq('profile_id', profileId)
    .single();

  return data?.total_score || 0;
}

/**
 * Generate metadata with trust-first SEO directives
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const referralCode = resolvedParams.code;

  // Fetch referrer profile
  const referrer = await getReferrerByCode(referralCode);

  if (!referrer) {
    return {
      title: 'Invalid Referral Link | Tutorwise',
      description: 'This referral link is invalid or has expired.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Check SEO eligibility
  const eligibilityResolver = new SEOEligibilityResolver();
  const eligibility = await eligibilityResolver.evaluateEligibility({
    entityType: 'profile',
    entityId: referrer.id,
  });

  // Only index if referrer is high-trust (score >= 75)
  const shouldIndex = eligibility.isEligible && eligibility.eligibilityScore >= 75;

  // Trust badge based on score
  let trustBadge = '';
  if (eligibility.eligibilityScore >= 80) {
    trustBadge = ' - Verified High-Trust Professional';
  } else if (eligibility.eligibilityScore >= 75) {
    trustBadge = ' - Verified Trusted Professional';
  }

  const title = `Join Tutorwise - Referred by ${referrer.full_name}${trustBadge}`;
  const description = `${referrer.full_name} (Trust Score: ${eligibility.eligibilityScore}/100) has invited you to join Tutorwise's verified tutor network. ${referrer.total_referrals_sent || 0} professionals have joined through their referral.`;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const canonicalUrl = `${baseUrl}/ref/${referralCode}`;

  return {
    title,
    description,
    robots: {
      index: shouldIndex,
      follow: shouldIndex,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Tutorwise',
      type: 'website',
      images: referrer.profile_picture_url
        ? [
            {
              url: referrer.profile_picture_url,
              width: 1200,
              height: 630,
              alt: `${referrer.full_name} - Tutorwise`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: referrer.profile_picture_url ? [referrer.profile_picture_url] : undefined,
    },
  };
}

/**
 * Referral Landing Page
 *
 * This page serves multiple purposes:
 * 1. SEO authority amplification for high-trust referrers
 * 2. Social sharing optimization with referrer context
 * 3. User onboarding with trust signals
 */
export default async function ReferralLandingPage({ params }: Props) {
  const resolvedParams = await params;
  const referralCode = resolvedParams.code;

  // Fetch referrer profile
  const referrer = await getReferrerByCode(referralCode);

  if (!referrer) {
    notFound();
  }

  // Get CaaS score and eligibility
  const caasScore = await getCaaSScore(referrer.id);
  const eligibilityResolver = new SEOEligibilityResolver();
  const eligibility = await eligibilityResolver.evaluateEligibility({
    entityType: 'profile',
    entityId: referrer.id,
  });

  // Generate structured data for SEO
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
  const personSchema = generatePersonSchema({
    name: referrer.full_name,
    caasScore: eligibility.eligibilityScore,
    reviewCount: referrer.total_referrals_sent || 1, // Use referral count as proxy
    role: referrer.role as 'tutor' | 'agent' | 'client',
    profileUrl: `${baseUrl}/public-profile/${referrer.id}`,
    description: referrer.bio || undefined,
    avatarUrl: referrer.profile_picture_url || undefined,
  });

  // Redirect to homepage with referral code preserved
  // Note: This is a server-side redirect after metadata is generated
  // The redirect preserves SEO value while sending users to the platform
  // The homepage should detect the ?ref parameter and show signup CTA
  redirect(`/?ref=${referralCode}`);
}
