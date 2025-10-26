'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import Button from '@/app/components/ui/Button';
import { getMyListings, deleteListing, publishListing, unpublishListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import { toast } from 'sonner';
import ListingCard from './ListingCard';
import styles from './page.module.css';

export default function MyListingsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['provider', 'agent', 'seeker']);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadListings = async () => {
    try {
      const data = await getMyListings();

      // Sort listings: templates first, then by creation date
      const sortedData = data.sort((a, b) => {
        // Templates always come first
        if (a.is_template && !b.is_template) return -1;
        if (!a.is_template && b.is_template) return 1;

        // Within same type, sort by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setListings(sortedData);
    } catch (error) {
      console.error('Failed to load listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  // Load listings on mount - MUST be before any conditional returns
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login?redirect=/my-listings');
      return;
    }

    if (user) {
      loadListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

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

  const handleDuplicate = async (templateId: string) => {
    try {
      if (!user) return;

      const { duplicateTemplate } = await import('@/lib/utils/templateGenerator');
      const newListingId = await duplicateTemplate(templateId, user.id);

      if (newListingId) {
        toast.success('Template duplicated successfully!');
        await loadListings();
        // Optionally redirect to edit the new listing
        // router.push(`/my-listings/${newListingId}/edit`);
      } else {
        toast.error('Failed to duplicate template');
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  // Show loading state
  if (userLoading || roleLoading || isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading your listings...</p>
      </div>
    );
  }

  // Role guard handles redirect automatically
  if (!isAllowed) {
    return null;
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
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
