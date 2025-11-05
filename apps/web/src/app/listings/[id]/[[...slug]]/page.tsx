/*
 * Filename: apps/web/src/app/listings/[id]/[[...slug]]/page.tsx
 * Purpose: Dynamic Listing Details Page (v4.1) - Server Component
 * Architecture: Replaces legacy /tutor/[id]/[slug] route
 *
 * Features:
 * - Server-side rendering for SEO
 * - Support for both /listings/[id] and /listings/[id]/[slug]
 * - Dynamic service type variants (one-to-one, group-session, workshop, study-package)
 * - Sticky ActionCard on desktop, fixed bottom CTA on mobile
 * - Related listings recommendations
 */

import { notFound } from 'next/navigation';
import { getListing } from '@/lib/api/listings';
import { getProfile } from '@/lib/api/profiles';
import type { ListingV41 } from '@/types/listing-v4.1';
import Container from '@/app/components/layout/Container';
import ListingHeader from './components/ListingHeader';
import ListingImageGrid from './components/ListingImageGrid';
import ListingDetailsColumn from './components/ListingDetailsColumn';
import ActionCard from './components/ActionCard';
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
  const listing = (await getListing(params.id)) as ListingV41 | null;

  if (!listing) {
    return {
      title: 'Listing Not Found | Tutorwise',
    };
  }

  return {
    title: `${listing.title} | Tutorwise`,
    description: listing.description?.substring(0, 160) || 'Book this service on Tutorwise',
    openGraph: {
      title: listing.title,
      description: listing.description,
      images: listing.hero_image_url ? [listing.hero_image_url] : [],
    },
  };
}

export default async function ListingDetailsPage({ params }: ListingDetailsPageProps) {
  // Fetch listing data server-side
  const listing = (await getListing(params.id)) as ListingV41 | null;

  if (!listing || listing.status !== 'published') {
    notFound();
  }

  // Fetch tutor profile with stats
  const tutorProfile = listing.profile_id ? await getProfile(listing.profile_id) : null;

  if (!tutorProfile) {
    notFound();
  }

  // Extract tutor stats (from migration 032 - stored in listing)
  const tutorStats = {
    sessionsTaught: listing.sessions_taught || 0,
    totalReviews: 0, // TODO: Calculate from reviews table
    averageRating: listing.average_rating || 0,
    responseTimeHours: listing.response_time_hours || 24,
    responseRate: listing.response_rate_percentage || 95,
  };

  // Build image URLs (defensive)
  const images = [
    listing.hero_image_url,
    ...(listing.gallery_image_urls || [])
  ].filter(Boolean) as string[];

  return (
    <>
      <Container>
        {/* SECTION 1: Header & Images (1-column) */}
        <div className={styles.topSection}>
          <ListingHeader
            listing={listing}
            tutorProfile={tutorProfile}
            tutorStats={tutorStats}
          />

          {images.length > 0 && (
            <ListingImageGrid images={images} listingTitle={listing.title} />
          )}
        </div>

        {/* SECTION 2: Body (2-column layout) */}
        <div className={styles.bodySection}>
          {/* Column 1: Main content (2/3 width on desktop) */}
          <div className={styles.mainColumn}>
            <ListingDetailsColumn
              listing={listing}
              tutorProfile={tutorProfile}
              tutorStats={tutorStats}
            />
          </div>

          {/* Column 2: Sticky ActionCard (1/3 width on desktop, hidden on mobile) */}
          <div className={styles.sidebarColumn}>
            <ActionCard listing={listing} tutorProfile={tutorProfile} />
          </div>
        </div>

        {/* SECTION 3: Related Listings (1-column) */}
        <div className={styles.relatedSection}>
          <RelatedListingsCard
            listingId={listing.id}
            currentSubjects={listing.subjects}
            currentLocation={listing.location_city}
          />
        </div>
      </Container>

      {/* Mobile-only: Fixed bottom CTA bar */}
      <MobileBottomCTA listing={listing} />
    </>
  );
}
