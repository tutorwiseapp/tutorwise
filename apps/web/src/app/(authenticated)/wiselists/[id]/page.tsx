/**
 * Filename: page.tsx
 * Purpose: Wiselist detail page showing individual items
 * Path: /wiselists/[id]
 * Created: 2025-12-09
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { getWiselist, removeWiselistItem } from '@/lib/api/wiselists';
import { quickSaveItem } from '@/lib/api/wiselists';
import WiselistItemCard from '@/app/components/feature/wiselists/WiselistItemCard';
import AddToListModal from '@/app/components/feature/wiselists/AddToListModal';
import WiselistItemDetailModal from '@/app/components/feature/wiselists/WiselistItemDetailModal';
import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import { toast } from 'react-hot-toast';
import type { WiselistWithDetails, WiselistItem } from '@/types';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

export default function WiselistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const wiselistId = params.id as string;

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<WiselistItem | null>(null);

  // Fetch wiselist with items
  const {
    data: wiselist,
    isLoading,
    error,
  } = useQuery<WiselistWithDetails | null>({
    queryKey: ['wiselist', wiselistId],
    queryFn: () => getWiselist(wiselistId),
    staleTime: 5 * 60 * 1000,
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: removeWiselistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiselist', wiselistId] });
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
      toast.success('Item removed from list');
    },
    onError: () => {
      toast.error('Failed to remove item');
    },
  });

  // Unsave item mutation (removes from My Saves AND updates heart icon)
  const unsaveItemMutation = useMutation({
    mutationFn: async (item: WiselistItem) => {
      // Call quickSaveItem to toggle the saved state
      if (item.profile_id) {
        await quickSaveItem({ profileId: item.profile_id });
      } else if (item.listing_id) {
        await quickSaveItem({ listingId: item.listing_id });
      }
      // Also remove from the current wiselist
      await removeWiselistItem(item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiselist', wiselistId] });
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
      toast.success('Item unsaved');
    },
    onError: () => {
      toast.error('Failed to unsave item');
    },
  });

  const isMySaves = wiselist?.name === 'My Saves';

  // Handle individual item actions
  const handleViewDetails = (item: WiselistItem) => {
    setCurrentItem(item);
    setShowDetailModal(true);
  };

  const handleAddToList = (item: WiselistItem) => {
    setCurrentItem(item);
    setShowAddToListModal(true);
  };

  const handleUnsave = (item: WiselistItem) => {
    unsaveItemMutation.mutate(item);
  };

  const handleRemoveFromList = (item: WiselistItem) => {
    removeItemMutation.mutate(item.id);
  };

  // Handle bulk actions
  const handleBulkOrganize = () => {
    setBulkMode(true);
    setShowActionsMenu(false);
  };

  const handleCancelBulk = () => {
    setBulkMode(false);
    setSelectedItems(new Set());
  };

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkAddToLists = () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }
    // Open modal for bulk add (we'll use the same modal)
    setShowAddToListModal(true);
  };

  const handleBulkUnsave = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    const itemsToUnsave = wiselist?.items?.filter((item) => selectedItems.has(item.id)) || [];

    for (const item of itemsToUnsave) {
      try {
        await unsaveItemMutation.mutateAsync(item);
      } catch (error) {
        console.error('Failed to unsave item:', item.id);
      }
    }

    setBulkMode(false);
    setSelectedItems(new Set());
  };

  if (isLoading) {
    return (
      <HubPageLayout header={<HubHeader title="Loading..." />}>
        <div className={styles.loading}>Loading wiselist...</div>
      </HubPageLayout>
    );
  }

  if (error || !wiselist) {
    return (
      <HubPageLayout header={<HubHeader title="Error" />}>
        <div className={styles.error}>
          <p>Failed to load wiselist.</p>
          <Button variant="secondary" onClick={() => router.push('/wiselists')}>
            Back to Wiselists
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  const items = wiselist.items || [];

  return (
    <>
      {/* Back Button Row */}
      <div className={styles.backRow}>
        <button onClick={() => router.push('/wiselists')} className={styles.backButton}>
          <ArrowLeft size={20} />
          <span>Back to Wiselists</span>
        </button>
      </div>

      <HubPageLayout
        header={
          <HubHeader
            title={wiselist.name}
          actions={
            <>
              {bulkMode ? (
                <>
                  <Button variant="secondary" size="sm" onClick={handleCancelBulk}>
                    Cancel
                  </Button>
                  {isMySaves && (
                    <>
                      <Button variant="primary" size="sm" onClick={handleBulkAddToLists}>
                        Add to Lists ({selectedItems.size})
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleBulkUnsave}>
                        Unsave ({selectedItems.size})
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className={actionStyles.dropdownContainer}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                  >
                    <MoreVertical size={16} />
                  </Button>

                  {showActionsMenu && (
                    <>
                      <div
                        className={actionStyles.backdrop}
                        onClick={() => setShowActionsMenu(false)}
                      />
                      <div className={actionStyles.dropdownMenu}>
                        {isMySaves && (
                          <button onClick={handleBulkOrganize} className={actionStyles.menuButton}>
                            Bulk Organize
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          }
        />
      }
      sidebar={
        <HubSidebar>
          <div className={styles.sidebarCard}>
            <h3>About this list</h3>
            <p>{wiselist.description || 'No description'}</p>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Items</span>
                <span className={styles.statValue}>{items.length}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Visibility</span>
                <span className={styles.statValue}>
                  {wiselist.visibility === 'public' ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
          </div>
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {items.length === 0 ? (
          <HubEmptyState
            title="No items in this list"
            description={
              isMySaves
                ? 'Start saving profiles and listings by clicking the heart icon.'
                : 'Add items to this list to organize your saved content.'
            }
          />
        ) : (
          <div className={styles.itemsGrid}>
            {items.map((item) => (
              <WiselistItemCard
                key={item.id}
                item={item}
                isMySaves={isMySaves}
                bulkMode={bulkMode}
                isSelected={selectedItems.has(item.id)}
                onToggleSelect={() => handleToggleItem(item.id)}
                onViewDetails={() => handleViewDetails(item)}
                onAddToList={() => handleAddToList(item)}
                onUnsave={() => handleUnsave(item)}
                onRemove={() => handleRemoveFromList(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <WiselistItemDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setCurrentItem(null);
        }}
        item={currentItem}
      />

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => {
          setShowAddToListModal(false);
          setCurrentItem(null);
        }}
        item={currentItem}
        selectedItems={bulkMode ? Array.from(selectedItems) : undefined}
        wiselistId={wiselistId}
      />
      </HubPageLayout>
    </>
  );
}
