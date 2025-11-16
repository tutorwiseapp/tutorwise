/**
 * Filename: page.tsx
 * Purpose: Wiselists hub page (v5.7)
 * Path: /wiselists
 * Created: 2025-11-15
 * Updated: 2025-11-16 - Migrated to React Query for robust data fetching
 */

'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { List } from 'lucide-react';
import WiselistCard from '@/app/components/wiselists/WiselistCard';
import { CreateWiselistWidget } from '@/app/components/wiselists/CreateWiselistWidget';
import { WiselistStatsWidget } from '@/app/components/wiselists/WiselistStatsWidget';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import { Wiselist } from '@/types';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getMyWiselists, deleteWiselist } from '@/lib/api/wiselists';
import styles from './page.module.css';

export default function WiselistsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.mainContent}>
          <div className={styles.error}>
            <h2>Failed to load wiselists</h2>
            <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
            <button onClick={() => refetch()} className={styles.retryButton}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <List size={32} />
          </div>
          <div>
            <h1 className={styles.title}>My Wiselists</h1>
            <p className={styles.subtitle}>
              Save and organize your favorite tutors and services
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className={styles.loading}>
            <p>Loading wiselists...</p>
          </div>
        ) : wiselists.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <List size={48} />
            </div>
            <h2 className={styles.emptyTitle}>No wiselists yet</h2>
            <p className={styles.emptyText}>
              Create your first wiselist to start saving and organizing tutors and services
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {wiselists.map((wiselist) => (
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

      <ContextualSidebar>
        <CreateWiselistWidget />
        <WiselistStatsWidget />
      </ContextualSidebar>
    </div>
  );
}
