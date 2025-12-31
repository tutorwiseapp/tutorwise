/**
 * Filename: ServicesCard.tsx
 * Purpose: Services/Listings card for public profiles
 * Created: 2025-11-12
 *
 * Displays active listings for the profile.
 * Shows the latest 5 listings with a count badge and link to view all in hub.
 */

'use client';

import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import styles from './ServicesCard.module.css';

interface ServicesCardProps {
  profile: Profile;
  listings?: Listing[];
  isOwnProfile?: boolean;
  excludeListingId?: string; // ID of listing to exclude (e.g., current listing on detail page)
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price_per_hour?: number;
  service_type?: string;
  subject?: string;
  level?: string;
  slug?: string;
  created_at: string;
}

const MAX_LISTINGS_SHOWN = 5;

export function ServicesCard({ profile, listings = [], isOwnProfile = false, excludeListingId }: ServicesCardProps) {
  const router = useRouter();
  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;

  // Filter out the excluded listing (e.g., current listing on detail page)
  const filteredListings = excludeListingId
    ? listings.filter(listing => listing.id !== excludeListingId)
    : listings;

  const totalCount = filteredListings.length;

  const handleListingClick = (listing: Listing) => {
    // Navigate to listing details page
    const slug = listing.slug || listing.id;
    router.push(`/listings/${listing.id}/${slug}`);
  };

  const handleViewAllClick = () => {
    if (isOwnProfile) {
      router.push('/listings');
    } else {
      // Viewing someone else's profile - no action needed
      // Could potentially show a toast message or modal here
    }
  };

  // Show only the latest 5 listings
  const displayedListings = filteredListings.slice(0, MAX_LISTINGS_SHOWN);
  const hasMore = totalCount > MAX_LISTINGS_SHOWN;

  return (
    <Card className={styles.servicesCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Services</h2>
        {isOwnProfile ? (
          <button
            className={styles.countBadge}
            onClick={handleViewAllClick}
            type="button"
            aria-label={`View all ${totalCount} listings in Hub`}
          >
            {totalCount}
          </button>
        ) : (
          <span className={styles.countBadgeStatic}>
            {totalCount}
          </span>
        )}
      </div>
      <div className={styles.cardContent}>
        {totalCount === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              {firstName} hasn&apos;t listed any services yet.
            </p>
          </div>
        ) : (
          <div className={styles.listingsContainer}>
            {displayedListings.map((listing) => {
              // Get subjects array (handle both subjects and subject)
              const subjects = (listing as any).subjects || (listing.subject ? [listing.subject] : []);
              const levels = (listing as any).levels || (listing.level ? [listing.level] : []);

              return (
                <button
                  key={listing.id}
                  className={styles.listingRow}
                  onClick={() => handleListingClick(listing)}
                  type="button"
                >
                  {/* Title */}
                  <div className={styles.listingTitle}>{listing.title}</div>

                  {/* Subjects and Levels */}
                  <div className={styles.listingMeta}>
                    {subjects.slice(0, 3).join(', ')}
                    {subjects.length > 3 && ` +${subjects.length - 3} more`}
                    {levels.length > 0 && ` • ${levels.join(', ')}`}
                  </div>

                  {/* Price */}
                  <div className={styles.listingPrice}>
                    {(listing as any).hourly_rate || listing.price_per_hour ? (
                      `£${(listing as any).hourly_rate || listing.price_per_hour}/hr`
                    ) : (
                      '—'
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
