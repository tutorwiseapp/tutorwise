/*
 * Filename: src/app/(authenticated)/listings/page.tsx
 * Purpose: Listings hub page - displays user's service listings (SDD v3.6)
 * Created: 2025-11-03
 * Updated: 2025-11-28 - Migrated to HubPageLayout with Gold Standard Hub Architecture
 * Specification: SDD v3.6 - Ultra-Dense Single-Row Header with comprehensive filtering
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { getMyListings, deleteListing, publishListing, unpublishListing } from '@/lib/api/listings';
import type { Listing } from '@tutorwise/shared-types';
import toast from 'react-hot-toast';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/ui/hub-layout';
import type { HubTab } from '@/app/components/ui/hub-layout';
import styles from './page.module.css';
import filterStyles from './filters.module.css';
import actionStyles from './actions.module.css';
import ListingCard from './ListingCard';
import ListingStatsWidget from '@/app/components/listings/ListingStatsWidget';
import ListingsSkeleton from '@/app/components/listings/ListingsSkeleton';
import ListingsError from '@/app/components/listings/ListingsError';
import Pagination from '@/app/components/ui/Pagination';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import Button from '@/app/components/ui/Button';

type FilterType = 'all' | 'published' | 'unpublished' | 'draft' | 'archived' | 'templates';
type SortType = 'newest' | 'oldest' | 'price-high' | 'price-low' | 'views-high' | 'views-low';

const ITEMS_PER_PAGE = 5;

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent', 'client']);

  // URL state management
  const filter = (searchParams?.get('filter') as FilterType) || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // React Query: Fetch listings
  const {
    data: rawListings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['listings', user?.id],
    queryFn: getMyListings,
    enabled: !!user && !userLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteListing,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['listings', user?.id] });
      const previousListings = queryClient.getQueryData(['listings', user?.id]);
      queryClient.setQueryData(['listings', user?.id], (old: Listing[] = []) =>
        old.filter((l) => l.id !== id)
      );
      return { previousListings };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['listings', user?.id], context?.previousListings);
      toast.error('Failed to delete listing');
    },
    onSuccess: () => {
      toast.success('Listing deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['listings', user?.id] });
    },
  });

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

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const regularListings = rawListings.filter(l => !l.is_template);
    return {
      all: regularListings.length,
      published: regularListings.filter(l => l.status === 'published').length,
      unpublished: regularListings.filter(l => l.status === 'unpublished').length,
      draft: regularListings.filter(l => l.status === 'draft').length,
      archived: regularListings.filter(l => l.status === 'archived').length,
      templates: rawListings.filter(l => l.is_template).length,
    };
  }, [rawListings]);

  // Filter listings based on tab
  const filteredByTab = useMemo(() => {
    return rawListings.filter((listing) => {
      if (filter === 'templates') {
        return listing.is_template === true;
      }
      if (filter === 'all') {
        return listing.is_template !== true;
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
  }, [rawListings, filter]);

  // Apply client-side search
  const searchedListings = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab;

    const query = searchQuery.toLowerCase();
    return filteredByTab.filter((listing) => {
      const title = listing.title?.toLowerCase() || '';
      const subjects = listing.subjects?.join(' ').toLowerCase() || '';
      const description = listing.description?.toLowerCase() || '';

      return title.includes(query) ||
             subjects.includes(query) ||
             description.includes(query);
    });
  }, [filteredByTab, searchQuery]);

  // Apply sorting
  const sortedListings = useMemo(() => {
    const sorted = [...searchedListings];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'price-high':
        return sorted.sort((a, b) => (b.hourly_rate || 0) - (a.hourly_rate || 0));
      case 'price-low':
        return sorted.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
      case 'views-high':
        return sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
      case 'views-low':
        return sorted.sort((a, b) => (a.view_count || 0) - (b.view_count || 0));
      default:
        return sorted;
    }
  }, [searchedListings, sortBy]);

  // Pagination logic
  const totalItems = sortedListings.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedListings = sortedListings.slice(startIndex, endIndex);

  // Reset to page 1 when filter/search/sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, sortBy]);

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

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Title', 'Status', 'Hourly Rate', 'Views', 'Inquiries', 'Bookings', 'Created At'];
    const rows = sortedListings.map(listing => [
      listing.title || '',
      listing.status || '',
      `£${listing.hourly_rate || 0}`,
      listing.view_count || 0,
      listing.inquiry_count || 0,
      listing.booking_count || 0,
      new Date(listing.created_at).toLocaleDateString('en-GB'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `listings-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Listings exported successfully');
    setShowActionsMenu(false);
  };

  const handleViewPublicProfile = () => {
    if (user?.id) {
      router.push(`/public-profile/${user.id}`);
      setShowActionsMenu(false);
    }
  };

  // Show loading state for auth/role checks
  if (userLoading || roleLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Listings" subtitle="Manage your service offerings and track their performance" />}
        sidebar={
          <ContextualSidebar>
            <ListingStatsWidget listings={[]} isLoading={true} />
          </ContextualSidebar>
        }
      >
        <ListingsSkeleton />
      </HubPageLayout>
    );
  }

  // Role guard handles redirect automatically
  if (!isAllowed) {
    return null;
  }

  // Show error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Listings" subtitle="Manage your service offerings and track their performance" />}
        sidebar={
          <ContextualSidebar>
            <ListingStatsWidget listings={[]} isLoading={false} />
          </ContextualSidebar>
        }
      >
        <ListingsError error={error as Error} onRetry={() => refetch()} />
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Listings"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className={filterStyles.sortSelect}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
                <option value="views-high">Views: High to Low</option>
                <option value="views-low">Views: Low to High</option>
              </select>
            </div>
          }
          actions={
            <>
              {/* Primary Action: Create Listing */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/create-listing')}
              >
                Create Listing
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu} style={{ display: 'block' }}>
                      <button
                        onClick={handleViewPublicProfile}
                        className={actionStyles.menuButton}
                      >
                        View Public Profile
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className={actionStyles.menuButton}
                      >
                        Export CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Listings', count: tabCounts.all, active: filter === 'all' },
            { id: 'published', label: 'Published', count: tabCounts.published, active: filter === 'published' },
            { id: 'unpublished', label: 'Unpublished', count: tabCounts.unpublished, active: filter === 'unpublished' },
            { id: 'draft', label: 'Drafts', count: tabCounts.draft, active: filter === 'draft' },
            { id: 'archived', label: 'Archived', count: tabCounts.archived, active: filter === 'archived' },
            { id: 'templates', label: 'Templates', count: tabCounts.templates, active: filter === 'templates' },
          ]}
          onTabChange={(tabId) => handleFilterChange(tabId as FilterType)}
        />
      }
      sidebar={
        <ContextualSidebar>
          <ListingStatsWidget listings={rawListings} isLoading={isLoading} />
        </ContextualSidebar>
      }
    >
      <div className={styles.container}>
        {/* Empty State */}
        {paginatedListings.length === 0 && !searchQuery && (
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
              <Button
                variant="primary"
                onClick={() => router.push('/create-listing')}
              >
                Create Your First Listing
              </Button>
            )}
          </div>
        )}

        {/* Search Empty State */}
        {paginatedListings.length === 0 && searchQuery && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No results found</h3>
            <p className={styles.emptyText}>
              No listings match your search &ldquo;{searchQuery}&rdquo;. Try a different search term.
            </p>
          </div>
        )}

        {/* Listings List */}
        {paginatedListings.length > 0 && (
          <div className={styles.listingsList}>
            {paginatedListings.map((listing) => (
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

        {/* Pagination */}
        {totalItems > ITEMS_PER_PAGE && (
          <div className={styles.paginationContainer}>
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </HubPageLayout>
  );
}
