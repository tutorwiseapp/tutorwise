/**
 * Filename: page.tsx
 * Purpose: Wiselists hub page (v5.7)
 * Path: /wiselists
 * Created: 2025-11-15
 * Updated: 2025-11-29 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs, HubPagination
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import WiselistCard from '@/app/components/feature/wiselists/WiselistCard';
import SavedItemCard from '@/app/components/feature/wiselists/SavedItemCard';
import CreateWiselistModal from '@/app/components/feature/wiselists/CreateWiselistModal';
import AddToWiselistModal from '@/app/components/feature/wiselists/AddToWiselistModal';
import { WiselistStatsWidget } from '@/app/components/feature/wiselists/WiselistStatsWidget';
import WiselistHelpWidget from '@/app/components/feature/wiselists/WiselistHelpWidget';
import WiselistTipWidget from '@/app/components/feature/wiselists/WiselistTipWidget';
import WiselistVideoWidget from '@/app/components/feature/wiselists/WiselistVideoWidget';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import { Wiselist } from '@/types';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getMyWiselists, deleteWiselist, updateWiselist, getWiselist, quickSaveItem, addWiselistItem, removeWiselistItem } from '@/lib/api/wiselists';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type TabType = 'my-saves' | 'my-lists' | 'shared-with-me';
type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 4;

export default function WiselistsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('my-saves');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ itemId: string; profileId?: string; listingId?: string } | null>(null);
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
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Get My Saves wiselist ID
  const mySavesWiselist = useMemo(() => {
    return wiselists.find((w: any) => w.is_owner === true && w.name === 'My Saves');
  }, [wiselists]);

  // Fetch My Saves items
  const {
    data: mySavesData,
    isLoading: isLoadingMySaves,
  } = useQuery({
    queryKey: ['wiselist', mySavesWiselist?.id],
    queryFn: () => getWiselist(mySavesWiselist!.id),
    enabled: !!mySavesWiselist?.id && activeTab === 'my-saves',
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Calculate stats for tabs
  const stats = useMemo(() => {
    const mySavesCount = mySavesData?.items?.length || 0;
    const myLists = wiselists.filter((w: any) => w.is_owner === true && w.name !== 'My Saves').length;
    const sharedWithMe = wiselists.filter((w: any) => w.is_owner === false).length;

    return {
      total: wiselists.length,
      mySaves: mySavesCount,
      myLists,
      sharedWithMe,
    };
  }, [wiselists, mySavesData]);

  // Filter wiselists based on tab, search, and sort
  const filteredWiselists = useMemo(() => {
    let filtered = [...wiselists];

    // Filter by tab
    switch (activeTab) {
      case 'my-saves':
        filtered = filtered.filter((w: any) => w.is_owner === true && w.name === 'My Saves');
        break;
      case 'my-lists':
        filtered = filtered.filter((w: any) => w.is_owner === true && w.name !== 'My Saves');
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

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string } }) =>
      updateWiselist(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['wiselists'] });
      const previousWiselists = queryClient.getQueryData(['wiselists']);

      queryClient.setQueryData(['wiselists'], (old: Wiselist[] = []) =>
        old.map((w) => (w.id === id ? { ...w, ...data } : w))
      );

      return { previousWiselists };
    },
    onError: (err, variables, context) => {
      if (context?.previousWiselists) {
        queryClient.setQueryData(['wiselists'], context.previousWiselists);
      }
      console.error('Update wiselist error:', err);
      toast.error('Failed to update wiselist');
    },
    onSuccess: () => {
      toast.success('Wiselist updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
    },
  });

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

  const handleUpdate = (id: string, data: { name: string; description: string }) => {
    updateMutation.mutate({ id, data });
  };

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

  // Handle Add to List for a saved item
  const handleItemAddToList = async (itemId: string) => {
    // Get the item to extract profileId or listingId
    const item = mySavesData?.items.find(i => i.id === itemId);
    if (item) {
      setSelectedItem({
        itemId,
        profileId: item.profile_id || undefined,
        listingId: item.listing_id || undefined,
      });
      setShowAddToListModal(true);
    }
  };

  // Handle Unsave for a saved item
  const handleItemUnsave = async (itemId: string, profileId?: string, listingId?: string) => {
    try {
      // Remove the item from the wiselist
      await removeWiselistItem(itemId);

      // Refresh the My Saves data
      await queryClient.invalidateQueries({ queryKey: ['wiselist', mySavesWiselist?.id] });
      await queryClient.invalidateQueries({ queryKey: ['wiselists'] });

      toast.success('Item unsaved');
    } catch (error) {
      console.error('Failed to unsave item:', error);
      toast.error('Failed to unsave item');
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
            <WiselistHelpWidget />
            <WiselistTipWidget />
            <WiselistVideoWidget />
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
            <WiselistHelpWidget />
            <WiselistTipWidget />
            <WiselistVideoWidget />
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
                  square
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
            { id: 'my-saves', label: 'My Saves', count: stats.mySaves, active: activeTab === 'my-saves' },
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
        {activeTab === 'my-saves' ? (
          /* My Saves Tab - Show saved items */
          <>
            {isLoadingMySaves ? (
              <div className={styles.loading}>Loading saved items...</div>
            ) : mySavesData?.items && mySavesData.items.length > 0 ? (
              <>
                <div className={styles.savedItemsList}>
                  {mySavesData.items.map((item) => (
                    <SavedItemCard
                      key={item.id}
                      item={item}
                      onAddToList={handleItemAddToList}
                      onUnsave={handleItemUnsave}
                    />
                  ))}
                </div>
              </>
            ) : (
              <HubEmptyState
                title="No saved items yet"
                description='Start saving profiles and listings by clicking the heart icon. Your saved items will appear here in "My Saves".'
              />
            )}
          </>
        ) : (
          /* My Lists and Shared With Me tabs - Show wiselist cards */
          <>
            {paginatedWiselists.length === 0 ? (
              <HubEmptyState
                title={
                  wiselists.length === 0
                    ? 'No wiselists yet'
                    : 'No wiselists found'
                }
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
                      onUpdate={handleUpdate}
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

      {/* Add to List Modal */}
      <AddToWiselistModal
        isOpen={showAddToListModal}
        onClose={() => {
          setShowAddToListModal(false);
          setSelectedItem(null);
        }}
        itemId={selectedItem?.itemId || ''}
        profileId={selectedItem?.profileId}
        listingId={selectedItem?.listingId}
        onCreateWiselist={() => {
          setShowAddToListModal(false);
          setShowCreateModal(true);
        }}
      />
    </HubPageLayout>
  );
}
