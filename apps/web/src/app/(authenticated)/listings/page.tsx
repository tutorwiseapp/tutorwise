/*
 * Filename: src/app/(authenticated)/listings/page.tsx
 * Purpose: Listings hub page - displays user's service listings (SDD v3.6)
 * Created: 2025-11-03
 * Updated: 2025-11-08 - Refactored to use React Query for robust data fetching
 * Specification: SDD v3.6 - Hub page with filter tabs following established pattern
 */
'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { getMyListings, deleteListing, publishListing, unpublishListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import ListingCard from './ListingCard';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import CreateListingWidget from '@/app/components/listings/CreateListingWidget';
import ListingStatsWidget from '@/app/components/listings/ListingStatsWidget';
import ListingsSkeleton from '@/app/components/listings/ListingsSkeleton';
import ListingsError from '@/app/components/listings/ListingsError';
import styles from './page.module.css';

type FilterType = 'all' | 'published' | 'unpublished' | 'draft' | 'archived' | 'templates';

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent', 'client']);

  // Read filter from URL (SDD v3.6: URL is single source of truth)
  const filter = (searchParams?.get('filter') as FilterType) || 'all';

  // React Query: Fetch listings with automatic retry, caching, and background refetch
  const {
    data: rawListings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['listings', user?.id],
    queryFn: getMyListings,
    enabled: !!user && !userLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Sort listings: templates first, then by creation date
  const listings = useMemo(() => {
    return [...rawListings].sort((a, b) => {
      // Templates always come first
      if (a.is_template && !b.is_template) return -1;
      if (!a.is_template && b.is_template) return 1;

      // Within same type, sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [rawListings]);

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: deleteListing,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['listings', user?.id] });

      // Snapshot current value
      const previousListings = queryClient.getQueryData(['listings', user?.id]);

      // Optimistically update
      queryClient.setQueryData(['listings', user?.id], (old: Listing[] = []) =>
        old.filter((l) => l.id !== id)
      );

      return { previousListings };
    },
    onError: (err, id, context) => {
      // Rollback on error
      queryClient.setQueryData(['listings', user?.id], context?.previousListings);
      toast.error('Failed to delete listing');
    },
    onSuccess: () => {
      toast.success('Listing deleted successfully');
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['listings', user?.id] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: publishListing,
    onSuccess: () => {
      toast.success('Listing published');
      queryClient.invalidateQueries({ queryKey: ['listings', user?.id] });
    },
    onError: () => {
      toast.error('Failed to publish listing');
    },
  });

  // Unpublish mutation
  const unpublishMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'draft' | 'paused' }) =>
      unpublishListing(id, status),
    onSuccess: () => {
      toast.success('Listing unpublished');
      queryClient.invalidateQueries({ queryKey: ['listings', user?.id] });
    },
    onError: () => {
      toast.error('Failed to unpublish listing');
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) => unpublishListing(id, 'archived' as 'draft' | 'paused'),
    onSuccess: () => {
      toast.success('Listing archived');
      queryClient.invalidateQueries({ queryKey: ['listings', user?.id] });
    },
    onError: () => {
      toast.error('Failed to archive listing');
    },
  });

  // Filter listings based on URL param
  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (filter === 'templates') {
        return listing.is_template === true;
      }
      if (filter === 'all') {
        return listing.is_template !== true; // Exclude templates from "all"
      }
      if (filter === 'published') {
        return listing.status === 'published' && listing.is_template !== true;
      }
      if (filter === 'unpublished') {
        return listing.status === 'unpublished' && listing.is_template !== true;
      }
      if (filter === 'draft') {
        return listing.status === 'draft' && listing.is_template !== true;
      }
      if (filter === 'archived') {
        return listing.status === 'archived' && listing.is_template !== true;
      }
      return true;
    });
  }, [listings, filter]);

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

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    deleteMutation.mutate(id);
  };

  const handlePublish = (id: string) => {
    publishMutation.mutate(id);
  };

  const handleUnpublish = (id: string) => {
    unpublishMutation.mutate({ id, status: 'unpublished' as 'draft' | 'paused' });
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate(id);
  };

  const handleDuplicate = async (listingId: string) => {
    try {
      if (!user) return;

      const { duplicateTemplate } = await import('@/lib/utils/templateGenerator');
      const newListingId = await duplicateTemplate(listingId, user.id);

      if (newListingId) {
        toast.success('Listing duplicated successfully! View it in the Drafts tab.');
        queryClient.invalidateQueries({ queryKey: ['listings', user?.id] });
        handleFilterChange('draft');
      } else {
        toast.error('Failed to duplicate listing');
      }
    } catch (error) {
      console.error('Failed to duplicate listing:', error);
      toast.error('Failed to duplicate listing');
    }
  };

  // Show loading state for auth/role checks
  if (userLoading || roleLoading) {
    return <ListingsSkeleton />;
  }

  // Role guard handles redirect automatically
  if (!isAllowed) {
    return null;
  }

  // Show error state
  if (error) {
    return (
      <>
        <ListingsError error={error as Error} onRetry={() => refetch()} />
        <ContextualSidebar>
          <ListingStatsWidget listings={[]} isLoading={false} />
          <CreateListingWidget />
        </ContextualSidebar>
      </>
    );
  }

  // Show loading skeleton
  if (isLoading) {
    return (
      <>
        <ListingsSkeleton />
        <ContextualSidebar>
          <ListingStatsWidget listings={[]} isLoading={true} />
          <CreateListingWidget />
        </ContextualSidebar>
      </>
    );
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
          onClick={() => handleFilterChange('unpublished')}
          className={`${styles.filterTab} ${filter === 'unpublished' ? styles.filterTabActive : ''}`}
        >
          Unpublished
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
        {/* Empty State */}
        {filteredListings.length === 0 && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No listings found</h3>
            <p className={styles.emptyText}>
              {filter === 'templates'
                ? 'No templates available. Templates help you quickly create new listings.'
                : filter === 'published'
                ? 'You have no published listings yet.'
                : filter === 'unpublished'
                ? 'You have no unpublished listings.'
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
        {filteredListings.length > 0 && (
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
        <ListingStatsWidget listings={listings} isLoading={false} />
        <CreateListingWidget />
      </ContextualSidebar>
    </>
  );
}
