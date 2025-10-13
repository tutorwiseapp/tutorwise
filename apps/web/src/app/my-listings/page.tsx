'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyListings, deleteListing, publishListing, unpublishListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import { toast } from 'sonner';
import styles from './page.module.css';

export default function MyListingsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUserProfile();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login?redirect=/my-listings');
      return;
    }

    if (user) {
      loadListings();
    }
  }, [user, userLoading, router]);

  const loadListings = async () => {
    try {
      const data = await getMyListings();
      setListings(data);
    } catch (error) {
      console.error('Failed to load listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;

    try {
      await deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('Listing deleted successfully');
    } catch (error) {
      console.error('Failed to delete listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const handleToggleStatus = async (listing: Listing) => {
    try {
      if (listing.status === 'published') {
        await unpublishListing(listing.id);
        toast.success('Listing unpublished');
      } else {
        await publishListing(listing.id);
        toast.success('Listing published');
      }
      await loadListings();
    } catch (error) {
      console.error('Failed to update listing status:', error);
      toast.error('Failed to update listing status');
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading your listings...</p>
      </div>
    );
  }

  return (
    <div className={styles.listingsPage}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerContent}>
            <h1>My Listings</h1>
            <p>Manage your tutoring service listings</p>
          </div>
          <Link href="/my-listings/create">
            <button className={styles.createButton}>Create New Listing</button>
          </Link>
        </div>
      </div>

      {/* Listings Grid or Empty State */}
      {listings.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyStateTitle}>No listings yet</h2>
          <p className={styles.emptyStateText}>
            Create your first tutoring listing to start attracting students and growing your tutoring business.
          </p>
          <Link href="/my-listings/create">
            <button className={styles.emptyStateButton}>Create Your First Listing</button>
          </Link>
        </div>
      ) : (
        <div className={styles.listingsGrid}>
          {listings.map(listing => (
            <div key={listing.id} className={styles.listingCard}>
              {/* Card Header */}
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{listing.title}</h3>
                <span className={`${styles.statusBadge} ${
                  listing.status === 'published' ? styles.statusPublished :
                  listing.status === 'draft' ? styles.statusDraft :
                  styles.statusPending
                }`}>
                  {listing.status}
                </span>
              </div>

              {/* Description */}
              <p className={styles.cardDescription}>{listing.description}</p>

              {/* Metadata */}
              <div className={styles.cardMeta}>
                <div className={styles.metaItem}>
                  <span>Subjects:</span> {listing.subjects?.join(', ') || 'Not specified'}
                </div>
                <div className={styles.metaItem}>
                  <span>Levels:</span> {listing.levels?.join(', ') || 'Not specified'}
                </div>
                {listing.hourly_rate && (
                  <div className={styles.metaItem}>
                    <span>Rate:</span> £{listing.hourly_rate}/hr
                  </div>
                )}
                <div className={styles.metaItem}>
                  <span>Type:</span> {listing.location_type || 'Not specified'}
                </div>
              </div>

              {/* Statistics - No icons, clean text */}
              <div className={styles.cardStats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{listing.view_count || 0}</span> views
                </div>
                <span className={styles.statDivider}>•</span>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{listing.inquiry_count || 0}</span> inquiries
                </div>
                <span className={styles.statDivider}>•</span>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{listing.booking_count || 0}</span> bookings
                </div>
              </div>

              {/* Action Buttons */}
              <div className={styles.cardActions}>
                <Link href={`/my-listings/${listing.id}/edit`} style={{ flex: 1 }}>
                  <button className={styles.actionButton}>Edit</button>
                </Link>
                <button
                  className={`${styles.actionButton} ${
                    listing.status === 'published' ? '' : styles.actionButtonPrimary
                  }`}
                  onClick={() => handleToggleStatus(listing)}
                >
                  {listing.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                  onClick={() => handleDelete(listing.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
