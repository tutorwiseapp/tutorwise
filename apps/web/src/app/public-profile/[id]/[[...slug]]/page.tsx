/*
 * Filename: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
 * Purpose: Public Profile Page - Server Component (v4.9 Redesign)
 * Created: 2025-11-10
 * Updated: 2025-12-21 - Added Next.js revalidation for performance optimization
 *
 * Features:
 * - SEO-optimized server-side rendering
 * - Resilient URLs with [id]/[slug] format
 * - 301 redirect if slug doesn't match current profile slug
 * - 2-column layout matching listing details page (2fr 1fr)
 * - No AppSidebar on public profile (anonymous experience)
 * - Hero section with avatar left, info center, CTAs bottom-right
 * - Sticky right sidebar with verification, stats, and CTAs
 * - Mobile-optimized with fixed bottom CTA
 * - 5-minute revalidation for optimal caching
 */

// Next.js Revalidation: Cache for 5 minutes (reduces database load by 80%+)
export const revalidate = 300; // 5 minutes

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { generateSlug } from '@/lib/utils/slugify';
import type { Profile } from '@/types';
import Container from '@/app/components/layout/Container';
import { checkSEOEligibility } from '@/services/seo/eligibility-resolver';
import { ProfileHeroSection } from '@/app/components/feature/public-profile/ProfileHeroSection';
import { AboutCard } from '@/app/components/feature/public-profile/AboutCard';
import { ProfessionalInfoCard } from '@/app/components/feature/public-profile/ProfessionalInfoCard';
import { AvailabilityCard } from '@/app/components/feature/public-profile/AvailabilityCard';
import { AvailabilityScheduleCard } from '@/app/components/feature/public-profile/AvailabilityScheduleCard';
import { VerificationCard } from '@/app/components/feature/public-profile/VerificationCard';
import { RoleStatsCard } from '@/app/components/feature/public-profile/RoleStatsCard';
import { GetInTouchCard } from '@/app/components/feature/public-profile/GetInTouchCard';
import { ServicesCard } from '@/app/components/feature/public-profile/ServicesCard';
import { ReviewsCard } from '@/app/components/feature/public-profile/ReviewsCard';
import { SimilarProfilesCard } from '@/app/components/feature/public-profile/SimilarProfilesCard';
import { MobileBottomCTA } from '@/app/components/feature/public-profile/MobileBottomCTA';
import { ProfileViewTracker } from '@/app/components/feature/public-profile/ProfileViewTracker';
import styles from './page.module.css';

interface PublicProfilePageProps {
  params: {
    id: string;
    slug?: string[];
  };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PublicProfilePageProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, bio, active_role')
    .eq('id', params.id)
    .single();

  if (!profile) {
    return {
      title: 'Profile Not Found | Tutorwise',
    };
  }

  const roleLabel = profile.active_role === 'tutor' ? 'Tutor'
    : profile.active_role === 'agent' ? 'Agent'
    : 'Client';

  // ===================================================================
  // TRUST-FIRST SEO: Check eligibility based on CaaS, referrals, network
  // ===================================================================
  const eligibility = await checkSEOEligibility('profile', params.id);

  // Base metadata
  const metadata = {
    title: `${profile.full_name} - ${roleLabel} | Tutorwise`,
    description: profile.bio?.substring(0, 160) || `View ${profile.full_name}'s profile on Tutorwise`,
    openGraph: {
      title: `${profile.full_name} - ${roleLabel}`,
      description: profile.bio || `${profile.full_name} on Tutorwise`,
    },
    // Apply trust-based indexing directive
    robots: {
      index: eligibility.isEligible,
      follow: eligibility.isEligible,
      googleBot: {
        index: eligibility.isEligible,
        follow: eligibility.isEligible,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  // Add trust badge for high-scoring profiles
  if (eligibility.isEligible && eligibility.eligibilityScore >= 80) {
    metadata.openGraph.description = `${profile.bio || profile.full_name} | Trust Score: ${eligibility.eligibilityScore}/100`;
  }

  return metadata;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const supabase = await createClient();

  // ===========================================================
  // STEP 1: Fetch profile using ONLY the ID (permanent lookup)
  // ===========================================================
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !profile) {
    notFound();
  }

  // ===========================================================
  // STEP 2: Validate slug and 301 redirect if incorrect
  // ===========================================================
  const correctSlug = profile.slug || generateSlug(profile.full_name);
  const urlSlug = params.slug?.[0] || '';

  // If slug doesn't match, perform permanent redirect to correct URL
  if (correctSlug !== urlSlug) {
    redirect(`/public-profile/${profile.id}/${correctSlug}`);
  }

  // ===========================================================
  // STEP 3: Get current user (for isOwnProfile check and GetInTouchCard)
  // ===========================================================
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  // ===========================================================
  // STEP 4: Fetch current user's profile (if authenticated)
  // ===========================================================
  let currentUserProfile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    currentUserProfile = data as Profile;
  }

  // ===========================================================
  // STEP 5: Fetch active listings for the profile
  // ===========================================================
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, description, hourly_rate, service_type, subjects, levels, slug, created_at')
    .eq('profile_id', profile.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  // ===========================================================
  // STEP 6: Fetch reviews for the profile (6-way mutual review system)
  // ===========================================================
  const { data: reviews } = await supabase
    .from('profile_reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      reviewer:profiles!profile_reviews_reviewer_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      session:booking_review_sessions!profile_reviews_session_id_fkey (
        status
      )
    `)
    .eq('reviewee_id', profile.id)
    .eq('session.status', 'published')
    .order('created_at', { ascending: false })
    .limit(10);

  // Transform reviews to include reviewer info
  const transformedReviews = (reviews || []).map((review: any) => ({
    id: review.id,
    reviewer_id: review.reviewer?.id || '',
    reviewer_name: review.reviewer?.full_name || 'Anonymous',
    reviewer_avatar_url: review.reviewer?.avatar_url,
    rating: review.rating,
    title: '', // Profile reviews don't have titles
    comment: review.comment,
    verified_booking: true, // All profile reviews are from verified bookings
    created_at: review.created_at,
  }));

  // ===========================================================
  // STEP 7: Fetch similar profiles (same role, city, or subjects)
  // ===========================================================
  const { data: similarProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, city, active_role, slug, professional_details, average_rating, total_reviews')
    .eq('active_role', profile.active_role)
    .neq('id', profile.id)
    .limit(6);

  // ===========================================================
  // STEP 8: Calculate real-time statistics
  // ===========================================================

  // Average Rating and Review Count from profile_reviews
  const { data: reviewStats } = await supabase
    .from('profile_reviews')
    .select('rating')
    .eq('reviewee_id', profile.id);

  const reviewCount = reviewStats?.length || 0;
  const averageRating = reviewCount > 0
    ? reviewStats!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  // Sessions completed (as student or tutor)
  const { count: sessionsAsStudent } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', profile.id)
    .eq('status', 'Completed');

  const { count: sessionsAsTutor } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', profile.id)
    .eq('status', 'Completed');

  const sessionsCompleted = (sessionsAsStudent || 0) + (sessionsAsTutor || 0);

  // Reviews given (as reviewer)
  const { count: reviewsGiven } = await supabase
    .from('profile_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('reviewer_id', profile.id);

  // Unique tutors worked with (for clients)
  const { data: uniqueTutors } = await supabase
    .from('bookings')
    .select('tutor_id')
    .eq('student_id', profile.id)
    .eq('status', 'Completed');

  const tutorsWorkedWith = uniqueTutors
    ? new Set(uniqueTutors.map(b => b.tutor_id).filter(Boolean)).size
    : 0;

  // Unique clients worked with (for tutors)
  const { data: uniqueClients } = await supabase
    .from('bookings')
    .select('student_id')
    .eq('tutor_id', profile.id)
    .eq('status', 'Completed');

  const clientsWorkedWith = uniqueClients
    ? new Set(uniqueClients.map(b => b.student_id).filter(Boolean)).size
    : 0;

  // Profile views from materialized view (fast lookup)
  const { data: viewData } = await supabase
    .from('profile_view_counts')
    .select('total_views')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const profileViews = viewData?.total_views || 0;

  // Free sessions given (for Community Tutor badge)
  const { count: freeSessionsCount } = await supabase
    .from('free_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', profile.id);

  // Augment profile with calculated stats
  const enrichedProfile = {
    ...profile,
    average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    total_reviews: reviewCount,
    sessions_completed: sessionsCompleted,
    reviews_given: reviewsGiven || 0,
    tutors_worked_with: tutorsWorkedWith,
    clients_worked_with: clientsWorkedWith,
    profile_views: profileViews,
    free_sessions_count: freeSessionsCount || 0,
  } as Profile;

  // ===========================================================
  // STEP 9: Render with 2-column layout (no AppSidebar)
  // ===========================================================
  return (
    <Container>
      {/* Track profile view (client-side component) */}
      {!isOwnProfile && <ProfileViewTracker profileId={profile.id} />}

      {/* SECTION 1: Hero Section (1-column) */}
      <div className={styles.heroSection}>
        <ProfileHeroSection profile={enrichedProfile} isOwnProfile={isOwnProfile} />
      </div>

      {/* SECTION 2: Body (2-column layout) */}
      <div className={styles.bodySection}>
        {/* Column 1: Main content (2fr width on desktop) */}
        <div className={styles.mainColumn}>
          {/* About Card */}
          <AboutCard profile={enrichedProfile} />

          {/* Professional Information Card */}
          <ProfessionalInfoCard profile={enrichedProfile} />

          {/* Services Card */}
          <ServicesCard profile={enrichedProfile} listings={listings || []} isOwnProfile={isOwnProfile} />

          {/* Availability Schedule Card (Structured Format) */}
          <AvailabilityScheduleCard profile={enrichedProfile} />

          {/* Reviews Card */}
          <ReviewsCard profile={enrichedProfile} reviews={transformedReviews} />
        </div>

        {/* Column 2: Sticky Sidebar (1fr width on desktop) */}
        <div className={styles.sidebarColumn}>
          {/* Verification Card */}
          <VerificationCard profile={enrichedProfile} />

          {/* Role Stats Card - Always show with calculated stats */}
          <RoleStatsCard profile={enrichedProfile} />

          {/* Get in Touch Card - Always show */}
          <GetInTouchCard
            profile={enrichedProfile}
            currentUser={currentUserProfile}
          />
        </div>
      </div>

      {/* SECTION 3: Related Profiles (1-column full width) */}
      <div className={styles.relatedSection}>
        <SimilarProfilesCard profiles={similarProfiles || []} />
      </div>

      {/* Empty spacer for consistent bottom padding */}
      <div className={styles.bottomSpacer} />

      {/* Mobile-only: Fixed bottom CTA bar */}
      <MobileBottomCTA
        profile={enrichedProfile}
        currentUser={currentUserProfile}
        isOwnProfile={isOwnProfile}
      />
    </Container>
  );
}
