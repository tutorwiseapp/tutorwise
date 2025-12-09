/**
 * Filename: ListingStatsCard.tsx
 * Purpose: Display listing-specific statistics
 * Created: 2025-12-09
 */

'use client';

import React from 'react';
import type { ListingV41 } from '@/types/listing-v4.1';
import Card from '@/app/components/ui/data-display/Card';
import styles from './ListingStatsCard.module.css';

interface StatItemProps {
  label: string;
  value: string | number;
  tooltip?: string;
}

function StatItem({ label, value, tooltip }: StatItemProps) {
  return (
    <div className={styles.statItem} title={tooltip}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

interface ListingStatsCardProps {
  listing: ListingV41;
}

export function ListingStatsCard({ listing }: ListingStatsCardProps) {
  // Format published date
  const formatPublishedDate = (dateString?: string) => {
    if (!dateString) return 'Not published';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  return (
    <Card className={styles.listingStatsCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Listing Stats</h3>
      </div>
      <div className={styles.statsGrid}>
        {/* Published Since */}
        {listing.published_at && (
          <StatItem
            key="published-since"
            label="Published Since"
            value={formatPublishedDate(listing.published_at)}
          />
        )}

        {/* Listing Views */}
        <StatItem
          key="views"
          label="Listing Views"
          value={listing.view_count || 0}
          tooltip="Number of times this listing has been viewed"
        />

        {/* Inquiries */}
        <StatItem
          key="inquiries"
          label="Inquiries"
          value={listing.inquiry_count || 0}
          tooltip="Number of inquiries received for this listing"
        />

        {/* Bookings */}
        <StatItem
          key="bookings"
          label="Bookings"
          value={listing.booking_count || 0}
          tooltip="Number of successful bookings from this listing"
        />
      </div>
    </Card>
  );
}
