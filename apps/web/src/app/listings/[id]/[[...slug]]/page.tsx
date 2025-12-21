/*
 * Filename: apps/web/src/app/listings/[id]/[[...slug]]/page.tsx
 * Purpose: Dynamic Listing Details Page (v4.1) - Server Component
 * Architecture: Replaces legacy /tutor/[id]/[slug] route
 * Updated: 2025-12-21 - Added Next.js revalidation for performance optimization
 *
 * Features:
 * - Server-side rendering for SEO
 * - Support for both /listings/[id] and /listings/[id]/[slug]
 * - Dynamic service type variants (one-to-one, group-session, workshop, study-package)
 * - Sticky ActionCard on desktop, fixed bottom CTA on mobile
 * - Related listings recommendations
 * - 3-minute revalidation (more dynamic than profiles)
 */

// Next.js Revalidation: Cache for 3 minutes (listings change more frequently than profiles)
export const revalidate = 180; // 3 minutes

import { notFound } from 'next/navigation';
import { getListing } from '@/lib/api/listings';
import { getProfile } from '@/lib/api/profiles';
import { createClient } from '@/utils/supabase/server';
import type { ListingV41 } from '@/types/listing-v4.1';
import type { Profile } from '@/types';
import Container from '@/app/components/layout/Container';
import ListingHeroSection from './components/ListingHeroSection';
import ListingImageGrid from './components/ListingImageGrid';
import { ListingDetailsCard } from './components/ListingDetailsCard';
import { CancellationPolicyCard } from './components/CancellationPolicyCard';
import { AvailabilityScheduleCard } from '@/app/components/feature/public-profile/AvailabilityScheduleCard';
import { ReviewsCard } from '@/app/components/feature/public-profile/ReviewsCard';
import { VerificationCard } from '@/app/components/feature/public-profile/VerificationCard';
import { GetInTouchCard } from '@/app/components/feature/public-profile/GetInTouchCard';
import { ListingStatsCard } from './components/ListingStatsCard';
import RelatedListingsCard from './components/RelatedListingsCard';
import MobileBottomCTA from './components/MobileBottomCTA';
import styles from './page.module.css';

interface ListingDetailsPageProps {
  params: {
    id: string;
    slug?: string[];
  };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ListingDetailsPageProps) {
  // Safe cast: ListingV41 extends Listing and adds optional fields
  // Database returns all fields including v4.1 additions (service_type, hero_image_url, etc.)
  const listing = (await getListing(params.id)) as ListingV41 | null;

  if (!listing) {
    return {
      title: 'Listing Not Found | Tutorwise',
    };
  }

  const tutorProfile = listing.profile_id ? await getProfile(listing.profile_id) : null;
  const serviceTypeLabel =
    listing.service_type === 'one-to-one' ? 'One-to-One Tutoring' :
    listing.service_type === 'group-session' ? 'Group Session' :
    listing.service_type === 'workshop' ? 'Workshop' :
    listing.service_type === 'study-package' ? 'Study Package' :
    'Tutoring';

  return {
    title: `${listing.title} | ${tutorProfile?.full_name || 'Tutorwise'}`,
    description: listing.description?.substring(0, 160) || `Book ${serviceTypeLabel} with ${tutorProfile?.full_name || 'an expert tutor'} on Tutorwise`,
    keywords: [
      ...(listing.subjects || []),
      ...(listing.levels || []),
      serviceTypeLabel,
      'tutoring',
      'online learning',
      listing.location_city,
    ].filter(Boolean).join(', '),
    openGraph: {
      type: 'website',
      title: listing.title,
      description: listing.description || `Book ${serviceTypeLabel} on Tutorwise`,
      images: listing.hero_image_url ? [{
        url: listing.hero_image_url,
        width: 1200,
        height: 630,
        alt: listing.title,
      }] : [],
      siteName: 'Tutorwise',
    },
    twitter: {
      card: 'summary_large_image',
      title: listing.title,
      description: listing.description?.substring(0, 160) || `Book ${serviceTypeLabel} on Tutorwise`,
      images: listing.hero_image_url ? [listing.hero_image_url] : [],
    },
  };
}

export default async function ListingDetailsPage({ params }: ListingDetailsPageProps) {
  const supabase = await createClient();

  // Fetch listing data server-side
  // Safe cast: ListingV41 extends Listing and adds optional fields
  // Database returns all fields including v4.1 additions (service_type, hero_image_url, etc.)
  const listing = (await getListing(params.id)) as ListingV41 | null;

  if (!listing || listing.status !== 'published') {
    notFound();
  }

  // Fetch tutor profile with stats
  const tutorProfile = listing.profile_id ? await getProfile(listing.profile_id) : null;

  if (!tutorProfile) {
    notFound();
  }

  // Get current user (for GetInTouchCard and isOwnProfile check)
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === tutorProfile.id;

  // Fetch current user's profile (if authenticated)
  let currentUserProfile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    currentUserProfile = data as Profile;
  }

  // Fetch tutor's reviews
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
    .eq('reviewee_id', tutorProfile.id)
    .eq('session.status', 'published')
    .order('created_at', { ascending: false })
    .limit(10);

  // Transform reviews
  const transformedReviews = (reviews || []).map((review: any) => ({
    id: review.id,
    reviewer_id: review.reviewer?.id || '',
    reviewer_name: review.reviewer?.full_name || 'Anonymous',
    reviewer_avatar_url: review.reviewer?.avatar_url,
    rating: review.rating,
    title: '',
    comment: review.comment,
    verified_booking: true,
    created_at: review.created_at,
  }));

  // Calculate tutor stats
  const { data: reviewStats } = await supabase
    .from('profile_reviews')
    .select('rating')
    .eq('reviewee_id', tutorProfile.id);

  const reviewCount = reviewStats?.length || 0;
  const averageRating = reviewCount > 0
    ? reviewStats!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  const { count: sessionsAsStudent } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', tutorProfile.id)
    .eq('status', 'Completed');

  const { count: sessionsAsTutor } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', tutorProfile.id)
    .eq('status', 'Completed');

  const sessionsCompleted = (sessionsAsStudent || 0) + (sessionsAsTutor || 0);

  const { count: reviewsGiven } = await supabase
    .from('profile_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('reviewer_id', tutorProfile.id);

  const { data: uniqueTutors } = await supabase
    .from('bookings')
    .select('tutor_id')
    .eq('client_id', tutorProfile.id)
    .eq('status', 'Completed');

  const tutorsWorkedWith = uniqueTutors
    ? new Set(uniqueTutors.map(b => b.tutor_id).filter(Boolean)).size
    : 0;

  const { data: uniqueClients } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('tutor_id', tutorProfile.id)
    .eq('status', 'Completed');

  const clientsWorkedWith = uniqueClients
    ? new Set(uniqueClients.map(b => b.client_id).filter(Boolean)).size
    : 0;

  const { data: viewData } = await supabase
    .from('profile_view_counts')
    .select('total_views')
    .eq('profile_id', tutorProfile.id)
    .maybeSingle();

  const profileViews = viewData?.total_views || 0;

  const { count: freeSessionsCount } = await supabase
    .from('free_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', tutorProfile.id);

  // Enrich tutor profile with stats
  const enrichedProfile = {
    ...tutorProfile,
    average_rating: Math.round(averageRating * 10) / 10,
    total_reviews: reviewCount,
    sessions_completed: sessionsCompleted,
    reviews_given: reviewsGiven || 0,
    tutors_worked_with: tutorsWorkedWith,
    clients_worked_with: clientsWorkedWith,
    profile_views: profileViews,
    free_sessions_count: freeSessionsCount || 0,
  } as Profile;

  // Extract tutor stats for hero section
  const tutorStats = {
    sessionsTaught: sessionsCompleted,
    totalReviews: reviewCount,
    averageRating: averageRating,
    responseTimeHours: listing.response_time_hours || 24,
    responseRate: listing.response_rate_percentage || 95,
  };

  // Build image URLs (defensive)
  const images = [
    listing.hero_image_url,
    ...(listing.gallery_image_urls || [])
  ].filter(Boolean) as string[];

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || '',
    image: listing.hero_image_url || '',
    offers: {
      '@type': 'Offer',
      price: listing.hourly_rate || listing.package_price || listing.group_price_per_person || 0,
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Person',
        name: enrichedProfile.full_name || 'Anonymous Tutor',
        image: enrichedProfile.avatar_url || '',
      },
    },
    aggregateRating: tutorStats.averageRating > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: tutorStats.averageRating,
      reviewCount: tutorStats.totalReviews,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    category: listing.subjects?.join(', ') || 'Education',
    brand: {
      '@type': 'Brand',
      name: 'Tutorwise',
    },
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container>
        {/* SECTION 1: Hero Section (1-column full width) */}
        <div className={styles.heroSection}>
          <ListingHeroSection
            listing={listing}
            tutorProfile={enrichedProfile}
            tutorStats={tutorStats}
          />
        </div>

        {/* Images below hero */}
        {images.length > 0 && (
          <div className={styles.imagesSection}>
            <ListingImageGrid images={images} listingTitle={listing.title} />
          </div>
        )}

        {/* SECTION 2: Body (2-column layout: 2fr main + 1fr sidebar) */}
        <div className={styles.bodySection}>
          {/* Column 1: Main content (2fr width on desktop) */}
          <div className={styles.mainColumn}>
            {/* Listing Details Card - Listing description */}
            <ListingDetailsCard listing={listing} />

            {/* Cancellation Policy Card - Only shown if policy exists */}
            <CancellationPolicyCard listing={listing} />

            {/* Availability Schedule Card - Tutor's general schedule */}
            <AvailabilityScheduleCard profile={enrichedProfile} />

            {/* Reviews Card - Tutor's reviews */}
            <ReviewsCard profile={enrichedProfile} reviews={transformedReviews} />
          </div>

          {/* Column 2: Sticky Sidebar (1fr width on desktop) */}
          <div className={styles.sidebarColumn}>
            {/* Verification Card */}
            <VerificationCard profile={enrichedProfile} />

            {/* Listing Stats Card - Shows listing-specific metrics */}
            <ListingStatsCard listing={listing} />

            {/* Get in Touch Card - Replaces ActionCard */}
            <GetInTouchCard
              profile={enrichedProfile}
              currentUser={currentUserProfile}
            />
          </div>
        </div>

        {/* SECTION 3: Related Listings (1-column full width) */}
        <div className={styles.relatedSection}>
          <RelatedListingsCard
            listingId={listing.id}
            currentSubjects={listing.subjects}
            currentLocation={listing.location_city}
          />
        </div>

        {/* Empty spacer for consistent bottom padding */}
        <div className={styles.bottomSpacer} />
      </Container>

      {/* Mobile-only: Fixed bottom CTA bar */}
      <MobileBottomCTA listing={listing} />
    </>
  );
}
