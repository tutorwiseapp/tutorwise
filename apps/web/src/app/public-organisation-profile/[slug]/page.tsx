/*
 * Filename: apps/web/src/app/public-organisation-profile/[slug]/page.tsx
 * Purpose: Public Organisation Profile Page - Server Component
 * Created: 2025-12-31
 *
 * Features:
 * - SEO-optimized server-side rendering
 * - Slug-only URLs (e.g., /organisation/london-maths-tutors)
 * - 2-column layout matching public profile (2fr 1fr)
 * - Organisation hero with logo, stats, team info
 * - Team members showcase
 * - Aggregate team services and reviews
 * - Sticky sidebar with verification, stats, and CTAs
 * - Mobile-optimized with fixed bottom CTA
 * - 5-minute revalidation for optimal caching
 */

// Next.js Revalidation: Cache for 5 minutes
export const revalidate = 300; // 5 minutes

import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Container from '@/app/components/layout/Container';
import { checkSEOEligibility } from '@/services/seo/eligibility-resolver';
import { OrganisationHeroSection } from '@/components/feature/public-organisation-profile/OrganisationHeroSection';
import { OrganisationStatsCard } from '@/components/feature/public-organisation-profile/OrganisationStatsCard';
import { TeamMembersCard } from '@/components/feature/public-organisation-profile/TeamMembersCard';
import { AboutCard } from '@/components/feature/public-organisation-profile/AboutCard';
import { ReviewsCard } from '@/components/feature/public-organisation-profile/ReviewsCard';
import { VerificationCard } from '@/components/feature/public-organisation-profile/VerificationCard';
import { OrganisationViewTracker } from '@/components/feature/public-organisation-profile/OrganisationViewTracker';
import { SimilarOrganisationsCard } from '@/components/feature/public-organisation-profile/SimilarOrganisationsCard';
import { MobileBottomCTA } from '@/components/feature/public-organisation-profile/MobileBottomCTA';
import styles from './page.module.css';

interface PublicOrganisationPageProps {
  params: {
    slug: string;
  };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PublicOrganisationPageProps) {
  const supabase = await createClient();

  const { data: organisation } = await supabase
    .from('connection_groups')
    .select('id, name, tagline, bio, location_city, caas_score, logo_url, public_visible, allow_indexing')
    .eq('slug', params.slug)
    .eq('type', 'organisation')
    .single();

  if (!organisation || !organisation.public_visible) {
    return {
      title: 'Organisation Not Found | Tutorwise',
    };
  }

  // ===================================================================
  // TRUST-FIRST SEO: Check eligibility based on organisation CaaS score
  // ===================================================================
  const allowIndex = organisation.allow_indexing && (organisation.caas_score || 0) >= 75;

  // Base metadata
  const metadata = {
    title: `${organisation.name} | Tutorwise`,
    description: organisation.tagline?.substring(0, 160) || organisation.bio?.substring(0, 160) || `View ${organisation.name} on Tutorwise`,
    openGraph: {
      title: organisation.name,
      description: organisation.tagline || organisation.bio?.substring(0, 160) || '',
      images: organisation.logo_url ? [{ url: organisation.logo_url }] : [],
      type: 'website' as const,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: organisation.name,
      description: organisation.tagline || organisation.bio?.substring(0, 160) || '',
      images: organisation.logo_url ? [organisation.logo_url] : [],
    },
    // Apply trust-based indexing directive
    robots: {
      index: allowIndex,
      follow: allowIndex,
      googleBot: {
        index: allowIndex,
        follow: allowIndex,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  // Add trust badge for high-scoring organisations
  if (allowIndex && (organisation.caas_score || 0) >= 80) {
    metadata.openGraph.description = `${organisation.tagline || organisation.name} | Trust Score: ${organisation.caas_score}/100`;
  }

  return metadata;
}

export default async function PublicOrganisationPage({ params }: PublicOrganisationPageProps) {
  const supabase = await createClient();

  // ===========================================================
  // STEP 1: Fetch organisation by slug
  // ===========================================================
  const { data: organisation, error } = await supabase
    .from('connection_groups')
    .select('*')
    .eq('slug', params.slug)
    .eq('type', 'organisation')
    .single();

  if (error || !organisation || !organisation.public_visible) {
    notFound();
  }

  // ===========================================================
  // STEP 2: Get current user (for ownership check)
  // ===========================================================
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === organisation.profile_id;

  // ===========================================================
  // STEP 3: Fetch organisation stats using RPC
  // ===========================================================
  const { data: stats } = await supabase
    .rpc('get_organisation_public_stats', { p_org_id: organisation.id })
    .single();

  const organisationStats = stats || {
    total_sessions: 0,
    total_reviews: 0,
    avg_rating: 0,
    total_tutors: 0,
    profile_views: 0,
    unique_subjects: [],
    unique_levels: [],
    dbs_verified_tutors: 0,
    established_date: null,
    total_clients: 0,
  };

  // ===========================================================
  // STEP 4: Fetch team members
  // ===========================================================
  const { data: members } = await supabase
    .from('network_group_members')
    .select(`
      profile_id,
      profiles:profile_id (
        id,
        full_name,
        slug,
        avatar_url,
        bio,
        city,
        professional_details,
        dbs_verified,
        identity_verified
      )
    `)
    .eq('group_id', organisation.id)
    .limit(24);

  const teamMembers = (members || [])
    .map((m: any) => m.profiles)
    .filter(Boolean);

  // ===========================================================
  // STEP 5: Fetch aggregate team reviews
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
      reviewee:profiles!profile_reviews_reviewee_id_fkey (
        id,
        full_name
      ),
      session:booking_review_sessions!profile_reviews_session_id_fkey (
        status
      )
    `)
    .in('reviewee_id', teamMembers.map(m => m.id))
    .eq('session.status', 'published')
    .order('created_at', { ascending: false })
    .limit(12);

  // Transform reviews
  const transformedReviews = (reviews || []).map((review: any) => ({
    id: review.id,
    reviewer_id: review.reviewer?.id || '',
    reviewer_name: review.reviewer?.full_name || 'Anonymous',
    reviewer_avatar_url: review.reviewer?.avatar_url,
    rating: review.rating,
    comment: review.comment,
    tutor_name: review.reviewee?.full_name || '',
    verified_booking: true,
    created_at: review.created_at,
  }));

  // ===========================================================
  // STEP 6: Fetch similar organisations (same city or similar subjects)
  // ===========================================================
  let similarOrgsQuery = supabase
    .from('connection_groups')
    .select('id, name, slug, avatar_url, logo_url, location_city, tagline, caas_score')
    .eq('type', 'organisation')
    .eq('public_visible', true)
    .neq('id', organisation.id)
    .limit(12);

  // Prefer organisations from the same city
  if (organisation.location_city) {
    similarOrgsQuery = similarOrgsQuery.eq('location_city', organisation.location_city);
  }

  const { data: similarOrgs } = await similarOrgsQuery;

  // Enrich similar orgs with stats (run in parallel)
  const enrichedSimilarOrgs = await Promise.all(
    (similarOrgs || []).map(async (org: any) => {
      const { data: orgStats } = await supabase
        .rpc('get_organisation_public_stats', { p_org_id: org.id })
        .single();

      return {
        ...org,
        avg_rating: (orgStats as any)?.avg_rating || 0,
        total_tutors: (orgStats as any)?.total_tutors || 0,
      };
    })
  );

  // ===========================================================
  // STEP 7: Enrich organisation with stats
  // ===========================================================
  const enrichedOrganisation = {
    ...organisation,
    ...organisationStats,
  };

  // ===========================================================
  // STEP 8: Generate JSON-LD structured data
  // ===========================================================
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": organisation.name,
    "description": organisation.bio || organisation.tagline,
    "url": `https://tutorwise.io/organisation/${organisation.slug}`,
    "logo": organisation.logo_url || organisation.avatar_url,
    "image": organisation.cover_image_url || organisation.logo_url || organisation.avatar_url,
    "address": organisation.location_city ? {
      "@type": "PostalAddress",
      "addressLocality": organisation.location_city,
      "addressCountry": organisation.location_country || "United Kingdom"
    } : undefined,
    "aggregateRating": (organisationStats as any)?.avg_rating > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": (organisationStats as any)?.avg_rating,
      "bestRating": 5,
      "ratingCount": (organisationStats as any)?.total_reviews
    } : undefined,
    "numberOfEmployees": (organisationStats as any)?.total_tutors,
    "foundingDate": (organisationStats as any)?.established_date,
    "sameAs": [
      organisation.website,
      organisation.social_links?.linkedin,
      organisation.social_links?.twitter,
      organisation.social_links?.facebook,
    ].filter(Boolean),
    "award": (organisation.caas_score || 0) >= 80 ? "Top 10% Rated Organisation" : undefined,
    "knowsAbout": organisationStats.unique_subjects || [],
  });

  // ===========================================================
  // STEP 9: Render organisation page
  // ===========================================================
  return (
    <Container>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />

      {/* View Tracking - only for non-owners */}
      {!isOwner && <OrganisationViewTracker organisationId={organisation.id} />}

      {/* SECTION 1: Hero Section */}
      <div className={styles.heroSection}>
        <OrganisationHeroSection
          organisation={enrichedOrganisation}
          isOwner={isOwner}
        />
      </div>

      {/* SECTION 2: Body (2-column layout) */}
      <div className={styles.bodySection}>
        {/* Column 1: Main content */}
        <div className={styles.mainColumn}>
          {/* About Card */}
          <AboutCard organisation={enrichedOrganisation} />

          {/* Team Members Card */}
          <TeamMembersCard
            members={teamMembers}
            organisation={enrichedOrganisation}
          />

          {/* Reviews Card */}
          <ReviewsCard
            reviews={transformedReviews}
            organisation={enrichedOrganisation}
          />
        </div>

        {/* Column 2: Sidebar */}
        <div className={styles.sidebarColumn}>
          {/* Stats Card */}
          <OrganisationStatsCard organisation={enrichedOrganisation} />

          {/* Verification Card */}
          <VerificationCard organisation={enrichedOrganisation} />
        </div>
      </div>

      {/* SECTION 3: Similar Organisations */}
      {enrichedSimilarOrgs && enrichedSimilarOrgs.length > 0 && (
        <SimilarOrganisationsCard
          organisations={enrichedSimilarOrgs}
          currentOrganisationId={organisation.id}
        />
      )}

      {/* Bottom spacer */}
      <div className={styles.bottomSpacer} />

      {/* Mobile Bottom CTA */}
      <MobileBottomCTA
        organisation={enrichedOrganisation}
        isOwner={isOwner}
      />
    </Container>
  );
}
