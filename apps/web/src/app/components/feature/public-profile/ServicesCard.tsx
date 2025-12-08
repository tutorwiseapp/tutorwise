/**
 * Filename: ServicesCard.tsx
 * Purpose: Services/Listings card for public profiles
 * Created: 2025-11-12
 *
 * Displays active listings for the profile.
 * Each listing card is fully clickable and navigates to listing details page.
 */

'use client';

import { useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import { ExternalLink } from 'lucide-react';
import styles from './ServicesCard.module.css';

interface ServicesCardProps {
  profile: Profile;
  listings?: Listing[];
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

export function ServicesCard({ profile, listings = [] }: ServicesCardProps) {
  const router = useRouter();
  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;

  const handleListingClick = (listing: Listing) => {
    // Navigate to listing details page
    const slug = listing.slug || listing.id;
    router.push(`/listings/${listing.id}/${slug}`);
  };

  // Empty state
  if (!listings || listings.length === 0) {
    return (
      <Card className={styles.servicesCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Services</h2>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {firstName} hasn&apos;t listed any services yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.servicesCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Services</h2>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.listingsContainer}>
          {listings.map((listing) => (
            <button
              key={listing.id}
              className={styles.listingCard}
              onClick={() => handleListingClick(listing)}
              type="button"
            >
              {/* Header: Title and Price */}
              <div className={styles.listingHeader}>
                <h3 className={styles.listingTitle}>{listing.title}</h3>
                {listing.price_per_hour && (
                  <span className={styles.price}>£{listing.price_per_hour}/hr</span>
                )}
              </div>

              {/* Meta: Subject, Level, Service Type */}
              <div className={styles.listingMeta}>
                {listing.subject && (
                  <span className={styles.metaTag}>{listing.subject}</span>
                )}
                {listing.level && (
                  <span className={styles.metaTag}>{listing.level}</span>
                )}
                {listing.service_type && (
                  <span className={styles.metaTag}>{listing.service_type}</span>
                )}
              </div>

              {/* Description */}
              {listing.description && (
                <p className={styles.listingDescription}>
                  {listing.description.length > 120
                    ? `${listing.description.substring(0, 120)}...`
                    : listing.description}
                </p>
              )}

              {/* View Details Icon (bottom-right) */}
              <div className={styles.listingFooter}>
                <span className={styles.viewDetailsText}>
                  View Details
                  <ExternalLink size={16} className={styles.viewDetailsIcon} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
