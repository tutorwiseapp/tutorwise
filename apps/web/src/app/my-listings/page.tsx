'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Button from '@/app/components/ui/Button';
import { getMyListings, deleteListing, publishListing, unpublishListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import { toast } from 'sonner';
import ListingCard from './ListingCard';
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
            <Button>Create Listing</Button>
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
            <ListingCard
              key={listing.id}
              listing={listing}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
