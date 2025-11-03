/*
 * Filename: src/app/(authenticated)/listings/page.tsx
 * Purpose: Listings hub page - displays user's service listings (SDD v3.6)
 * Created: 2025-11-03
 * Specification: SDD v3.6 - Hub page with filter tabs following established pattern
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { getMyListings, deleteListing, publishListing, unpublishListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import ListingCard from './ListingCard';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import styles from './page.module.css';

type FilterType = 'all' | 'published' | 'draft' | 'archived' | 'templates';

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent', 'client']);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Read filter from URL (SDD v3.6: URL is single source of truth)
  const filter = (searchParams?.get('filter') as FilterType) || 'all';

  // Update URL when filter changes
  const handleFilterChange = (newFilter: FilterType) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }
    router.push(`/listings${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const loadListings = async () => {
    try {
      setIsLoading(true);
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

  // Load listings on mount
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login?redirect=/listings');
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

  const handlePublish = async (id: string) => {
    try {
      await publishListing(id);
      toast.success('Listing published');
      await loadListings();
    } catch (error) {
      console.error('Failed to publish listing:', error);
      toast.error('Failed to publish listing');
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await unpublishListing(id, 'draft');
      toast.success('Listing unpublished');
      await loadListings();
    } catch (error) {
      console.error('Failed to unpublish listing:', error);
      toast.error('Failed to unpublish listing');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await unpublishListing(id, 'archived' as 'draft' | 'paused');
      toast.success('Listing archived');
      await loadListings();
    } catch (error) {
      console.error('Failed to archive listing:', error);
      toast.error('Failed to archive listing');
    }
  };

  const handleDuplicate = async (listingId: string) => {
    try {
      if (!user) return;

      const { duplicateTemplate } = await import('@/lib/utils/templateGenerator');
      const newListingId = await duplicateTemplate(listingId, user.id);

      if (newListingId) {
        toast.success('Listing duplicated successfully!');
        await loadListings();
        router.push(`/edit-listing/${newListingId}`);
      } else {
        toast.error('Failed to duplicate listing');
      }
    } catch (error) {
      console.error('Failed to duplicate listing:', error);
      toast.error('Failed to duplicate listing');
    }
  };

  // Filter listings based on URL param
  const filteredListings = listings.filter((listing) => {
    if (filter === 'templates') {
      return listing.is_template === true;
    }
    if (filter === 'all') {
      return listing.is_template !== true; // Exclude templates from "all"
    }
    if (filter === 'published') {
      return listing.status === 'published' && listing.is_template !== true;
    }
    if (filter === 'draft') {
      return listing.status === 'draft' && listing.is_template !== true;
    }
    if (filter === 'archived') {
      return listing.status === 'archived' && listing.is_template !== true;
    }
    return true;
  });

  // Show loading state
  if (userLoading || roleLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your listings...</div>
      </div>
    );
  }

  // Role guard handles redirect automatically
  if (!isAllowed) {
    return null;
  }

  return (
    <>
      {/* Main Content */}
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Listings</h1>
          <p className={styles.subtitle}>
            Manage your tutoring service listings and offerings
          </p>
        </div>
      </div>

      {/* Filter Tabs - Full width outside container */}
      <div className={styles.filterTabs}>
        <button
          onClick={() => handleFilterChange('all')}
          className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
        >
          All Listings
        </button>
        <button
          onClick={() => handleFilterChange('published')}
          className={`${styles.filterTab} ${filter === 'published' ? styles.filterTabActive : ''}`}
        >
          Published
        </button>
        <button
          onClick={() => handleFilterChange('draft')}
          className={`${styles.filterTab} ${filter === 'draft' ? styles.filterTabActive : ''}`}
        >
          Drafts
        </button>
        <button
          onClick={() => handleFilterChange('archived')}
          className={`${styles.filterTab} ${filter === 'archived' ? styles.filterTabActive : ''}`}
        >
          Archived
        </button>
        <button
          onClick={() => handleFilterChange('templates')}
          className={`${styles.filterTab} ${filter === 'templates' ? styles.filterTabActive : ''}`}
        >
          Templates
        </button>
      </div>

      {/* Content container */}
      <div className={styles.container}>
        {/* Loading State */}
        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading listings...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredListings.length === 0 && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No listings found</h3>
            <p className={styles.emptyText}>
              {filter === 'templates'
                ? 'No templates available. Templates help you quickly create new listings.'
                : filter === 'published'
                ? 'You have no published listings yet.'
                : filter === 'draft'
                ? 'You have no draft listings.'
                : filter === 'archived'
                ? 'You have no archived listings.'
                : 'You have no listings yet. Create your first listing to get started.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/create-listing')}
                className={styles.emptyButton}
              >
                Create Your First Listing
              </button>
            )}
          </div>
        )}

        {/* Listings List */}
        {!isLoading && filteredListings.length > 0 && (
          <div className={styles.listingsList}>
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onDelete={handleDelete}
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
                onArchive={handleArchive}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contextual Sidebar (Right Column) */}
      <ContextualSidebar>
        <div className={styles.sidebarPlaceholder}>
          <p className={styles.sidebarText}>Listing stats and quick actions will appear here.</p>
        </div>
      </ContextualSidebar>
    </>
  );
}
