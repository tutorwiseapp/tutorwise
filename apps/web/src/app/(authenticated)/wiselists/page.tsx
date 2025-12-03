/**
 * Filename: page.tsx
 * Purpose: Wiselists hub page (v5.7)
 * Path: /wiselists
 * Created: 2025-11-15
 * Updated: 2025-11-29 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs, HubPagination
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WiselistCard from '@/app/components/feature/wiselists/WiselistCard';
import CreateWiselistModal from '@/app/components/feature/wiselists/CreateWiselistModal';
import { WiselistStatsWidget } from '@/app/components/feature/wiselists/WiselistStatsWidget';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import { Wiselist } from '@/types';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getMyWiselists, deleteWiselist } from '@/lib/api/wiselists';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type TabType = 'my-lists' | 'shared-with-me';
type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 5;

export default function WiselistsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('my-lists');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // React Query: Fetch wiselists with automatic retry, caching, and background refetch
  const {
    data: wiselists = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wiselists'],
    queryFn: getMyWiselists,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Calculate stats for ownership-based tabs
  const stats = useMemo(() => {
    const myLists = wiselists.filter((w: any) => w.is_owner === true).length;
    const sharedWithMe = wiselists.filter((w: any) => w.is_owner === false).length;

    return {
      total: wiselists.length,
      myLists,
      sharedWithMe,
    };
  }, [wiselists]);

  // Filter wiselists based on ownership, search, and sort
  const filteredWiselists = useMemo(() => {
    let filtered = [...wiselists];

    // Filter by ownership (tab)
    switch (activeTab) {
      case 'my-lists':
        filtered = filtered.filter((w: any) => w.is_owner === true);
        break;
      case 'shared-with-me':
        filtered = filtered.filter((w: any) => w.is_owner === false);
        break;
    }

    // Search filtering (by name or description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((w: any) => {
        const name = w.name?.toLowerCase() || '';
        const description = w.description?.toLowerCase() || '';
        return name.includes(query) || description.includes(query);
      });
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [wiselists, activeTab, searchQuery, sortBy]);

  // Pagination
  const totalItems = filteredWiselists.length;
  const paginatedWiselists = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredWiselists.slice(startIndex, endIndex);
  }, [filteredWiselists, currentPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, sortBy]);

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: deleteWiselist,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wiselists'] });

      // Snapshot current value
      const previousWiselists = queryClient.getQueryData(['wiselists']);

      // Optimistically remove from UI
      queryClient.setQueryData(['wiselists'], (old: Wiselist[] = []) =>
        old.filter((w) => w.id !== id)
      );

      return { previousWiselists };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousWiselists) {
        queryClient.setQueryData(['wiselists'], context.previousWiselists);
      }
      console.error('Delete wiselist error:', err);
      toast.error('Failed to delete wiselist');
    },
    onSuccess: () => {
      toast.success('Wiselist deleted');
    },
    onSettled: () => {
      // Refetch to ensure UI is in sync with server
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleShare = async (id: string) => {
    const wiselist = wiselists.find((w) => w.id === id);
    if (!wiselist || !wiselist.slug) {
      toast.error('This wiselist is not public');
      return;
    }

    const shareUrl = `${window.location.origin}/w/${wiselist.slug}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Action handlers
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabType);
  };

  const handleCreateWiselist = () => {
    setShowCreateModal(true);
    setShowActionsMenu(false);
  };

  const handleImportFavorites = () => {
    toast('Import favorites functionality coming soon!', { icon: '⭐' });
    setShowActionsMenu(false);
  };

  const handleManageCategories = () => {
    toast('Manage categories functionality coming soon!', { icon: '🏷️' });
    setShowActionsMenu(false);
  };

  const handleExportCSV = () => {
    if (!filteredWiselists.length) {
      toast.error('No wiselists to export');
      return;
    }

    const headers = ['Name', 'Description', 'Items', 'Visibility', 'Created'];
    const rows = filteredWiselists.map((w: any) => [
      w.name || '',
      w.description || '',
      w.item_count || 0,
      w.is_public ? 'Public' : 'Private',
      new Date(w.created_at).toLocaleDateString('en-GB'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `wiselists-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Wiselists exported successfully');
    setShowActionsMenu(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="My Wiselists" />}
        sidebar={
          <HubSidebar>
            <WiselistStatsWidget />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.loading}>Loading wiselists...</div>
        </div>
      </HubPageLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="My Wiselists" />}
        sidebar={
          <HubSidebar>
            <WiselistStatsWidget />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.error}>
            <p>Failed to load wiselists. Please try again.</p>
            <button onClick={() => refetch()} className={styles.emptyButton}>
              Retry
            </button>
          </div>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="My Wiselists"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className={filterStyles.filterSelect}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          }
          actions={
            <>
              {/* Primary Action Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateWiselist}
              >
                Create Wiselist
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
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={handleImportFavorites}
                        className={actionStyles.menuButton}
                      >
                        Import Favorites
                      </button>
                      <button
                        onClick={handleManageCategories}
                        className={actionStyles.menuButton}
                      >
                        Manage Categories
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
            { id: 'my-lists', label: 'My Lists', count: stats.myLists, active: activeTab === 'my-lists' },
            { id: 'shared-with-me', label: 'Shared With Me', count: stats.sharedWithMe, active: activeTab === 'shared-with-me' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <WiselistStatsWidget />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {/* Empty State */}
        {paginatedWiselists.length === 0 ? (
          <HubEmptyState
            title={wiselists.length === 0 ? 'No wiselists yet' : 'No wiselists found'}
            description={
              wiselists.length === 0
                ? 'Create your first wiselist to start saving and organizing tutors and services'
                : 'No wiselists match your current filters. Try adjusting your search or filters.'
            }
          />
        ) : (
          <>
            {/* Wiselists Grid */}
            <div className={styles.wiselistsGrid}>
              {paginatedWiselists.map((wiselist) => (
                <WiselistCard
                  key={wiselist.id}
                  wiselist={wiselist}
                  onDelete={handleDelete}
                  onShare={handleShare}
                />
              ))}
            </div>

            {/* Pagination */}
            {filteredWiselists.length > ITEMS_PER_PAGE && (
              <HubPagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {/* Create Wiselist Modal */}
      <CreateWiselistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Refresh handled by modal via queryClient.invalidateQueries
        }}
      />
    </HubPageLayout>
  );
}
