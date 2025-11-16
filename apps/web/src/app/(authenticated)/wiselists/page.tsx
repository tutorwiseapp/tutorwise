/**
 * Filename: page.tsx
 * Purpose: Wiselists hub page (v5.7)
 * Path: /wiselists
 * Created: 2025-11-15
 * Updated: 2025-11-16 - Aligned with Network/My Students design system
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WiselistCard from '@/app/components/wiselists/WiselistCard';
import { CreateWiselistWidget } from '@/app/components/wiselists/CreateWiselistWidget';
import { WiselistStatsWidget } from '@/app/components/wiselists/WiselistStatsWidget';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import { Wiselist } from '@/types';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getMyWiselists, deleteWiselist } from '@/lib/api/wiselists';
import styles from './page.module.css';

type TabType = 'all' | 'public' | 'private';

export default function WiselistsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('all');

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

  // Calculate stats
  const stats = useMemo(() => {
    const publicWiselists = wiselists.filter((w) => w.visibility === 'public').length;
    const privateWiselists = wiselists.filter((w) => w.visibility === 'private').length;

    return {
      total: wiselists.length,
      public: publicWiselists,
      private: privateWiselists,
    };
  }, [wiselists]);

  // Filter wiselists based on active tab
  const filteredWiselists = useMemo(() => {
    switch (activeTab) {
      case 'public':
        return wiselists.filter((w) => w.visibility === 'public');
      case 'private':
        return wiselists.filter((w) => w.visibility === 'private');
      case 'all':
      default:
        return wiselists;
    }
  }, [wiselists, activeTab]);

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

  // Show loading state
  if (isLoading) {
    return (
      <>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>My Wiselists</h1>
            <p className={styles.subtitle}>Loading wiselists...</p>
          </div>
        </div>
        <ContextualSidebar>
          <CreateWiselistWidget />
          <WiselistStatsWidget />
        </ContextualSidebar>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>My Wiselists</h1>
            <p className={styles.subtitle}>Save and organize your favorite tutors and services</p>
          </div>
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Failed to load wiselists</h3>
            <p className={styles.emptyText}>
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <button onClick={() => refetch()} className={styles.emptyButton}>
              Retry
            </button>
          </div>
        </div>
        <ContextualSidebar>
          <CreateWiselistWidget />
          <WiselistStatsWidget />
        </ContextualSidebar>
      </>
    );
  }

  return (
    <>
      <div className={styles.container}>
        {/* Header - No icon */}
        <div className={styles.header}>
          <h1 className={styles.title}>My Wiselists</h1>
          <p className={styles.subtitle}>
            Save and organize your favorite tutors and services
          </p>
        </div>

        {/* Filter Tabs - Same pattern as Network/My Students */}
        <div className={styles.filterTabs}>
          <button
            onClick={() => setActiveTab('all')}
            className={`${styles.filterTab} ${
              activeTab === 'all' ? styles.filterTabActive : ''
            }`}
          >
            All Wiselists ({stats.total})
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`${styles.filterTab} ${
              activeTab === 'public' ? styles.filterTabActive : ''
            }`}
          >
            Public ({stats.public})
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`${styles.filterTab} ${
              activeTab === 'private' ? styles.filterTabActive : ''
            }`}
          >
            Private ({stats.private})
          </button>
        </div>

        {/* Content */}
        {wiselists.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No wiselists yet</h3>
            <p className={styles.emptyText}>
              Create your first wiselist to start saving and organizing tutors and services
            </p>
          </div>
        ) : filteredWiselists.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No wiselists found</h3>
            <p className={styles.emptyText}>
              {activeTab === 'public' && 'You don\'t have any public wiselists yet.'}
              {activeTab === 'private' && 'You don\'t have any private wiselists yet.'}
            </p>
            <button
              onClick={() => setActiveTab('all')}
              className={styles.emptyButton}
            >
              View All Wiselists
            </button>
          </div>
        ) : (
          <div className={styles.wiselistsGrid}>
            {filteredWiselists.map((wiselist) => (
              <WiselistCard
                key={wiselist.id}
                wiselist={wiselist}
                onDelete={handleDelete}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contextual Sidebar */}
      <ContextualSidebar>
        <CreateWiselistWidget />
        <WiselistStatsWidget />
      </ContextualSidebar>
    </>
  );
}
