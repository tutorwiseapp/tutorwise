/**
 * Filename: page.tsx
 * Purpose: Wiselist detail page (v5.7)
 * Path: /wiselists/[id]
 * Created: 2025-11-15
 * Updated: 2025-11-16 - Migrated to React Query for robust data fetching
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { List, Lock, Globe, Edit2 } from 'lucide-react';
import WiselistItemCard from '@/app/components/wiselists/WiselistItemCard';
import { ShareCollaborateWidget } from '@/app/components/wiselists/ShareCollaborateWidget';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import Button from '@/app/components/ui/Button';
import { WiselistWithDetails } from '@/types';
import { toast } from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getWiselist, updateWiselist, removeWiselistItem } from '@/lib/api/wiselists';
import styles from './page.module.css';

interface PageProps {
  params: { id: string };
}

export default function WiselistDetailPage({ params }: PageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '' });

  // React Query: Fetch wiselist with automatic retry, caching, and background refetch
  const {
    data: wiselist,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wiselist', params.id],
    queryFn: () => getWiselist(params.id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Update edit data when wiselist changes (React Query v5 pattern)
  useEffect(() => {
    if (wiselist) {
      setEditData({
        name: wiselist.name,
        description: wiselist.description || '',
      });
    }
  }, [wiselist]);

  const isOwner = profile && wiselist && wiselist.profile_id === profile.id;

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      updateWiselist(params.id, { name, description }),
    onMutate: async ({ name, description }) => {
      await queryClient.cancelQueries({ queryKey: ['wiselist', params.id] });
      const previousWiselist = queryClient.getQueryData(['wiselist', params.id]);

      queryClient.setQueryData(['wiselist', params.id], (old: WiselistWithDetails | null) =>
        old ? { ...old, name, description } : null
      );

      return { previousWiselist };
    },
    onError: (err, variables, context) => {
      if (context?.previousWiselist) {
        queryClient.setQueryData(['wiselist', params.id], context.previousWiselist);
      }
      console.error('Update wiselist error:', err);
      toast.error('Failed to update wiselist');
    },
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Wiselist updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wiselist', params.id] });
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
    },
  });

  // Remove item mutation with optimistic updates
  const removeItemMutation = useMutation({
    mutationFn: removeWiselistItem,
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['wiselist', params.id] });
      const previousWiselist = queryClient.getQueryData(['wiselist', params.id]);

      queryClient.setQueryData(['wiselist', params.id], (old: WiselistWithDetails | null) =>
        old ? { ...old, items: old.items.filter((item) => item.id !== itemId) } : null
      );

      return { previousWiselist };
    },
    onError: (err, itemId, context) => {
      if (context?.previousWiselist) {
        queryClient.setQueryData(['wiselist', params.id], context.previousWiselist);
      }
      console.error('Remove item error:', err);
      toast.error('Failed to remove item');
    },
    onSuccess: () => {
      toast.success('Item removed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wiselist', params.id] });
    },
  });

  const handleSaveEdit = () => {
    if (!editData.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    updateMutation.mutate({
      name: editData.name.trim(),
      description: editData.description.trim(),
    });
  };

  const handleRemoveItem = (itemId: string) => {
    removeItemMutation.mutate(itemId);
  };

  const handleVisibilityChange = (visibility: 'private' | 'public') => {
    if (wiselist) {
      queryClient.setQueryData(['wiselist', params.id], { ...wiselist, visibility });
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading wiselist...</div>
      </div>
    );
  }

  if (error || !wiselist) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Wiselist Not Found</h2>
          <p>The wiselist you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
          <Button onClick={() => router.push('/wiselists')} variant="primary">
            Back to Wiselists
          </Button>
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

          <div className={styles.headerContent}>
            {isEditing ? (
              <div className={styles.editForm}>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className={styles.editInput}
                  maxLength={100}
                />
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className={styles.editTextarea}
                  rows={2}
                  maxLength={500}
                  placeholder="Description (optional)"
                />
                <div className={styles.editActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        name: wiselist.name,
                        description: wiselist.description || '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.headerTop}>
                  <h1 className={styles.title}>{wiselist.name}</h1>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className={styles.editButton}
                      title="Edit wiselist"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                </div>

                {wiselist.description && (
                  <p className={styles.description}>{wiselist.description}</p>
                )}

                <div className={styles.meta}>
                  <span className={styles.metaItem}>
                    {wiselist.visibility === 'public' ? (
                      <>
                        <Globe size={16} />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        Private
                      </>
                    )}
                  </span>
                  <span className={styles.metaItem}>
                    {wiselist.items.length} {wiselist.items.length === 1 ? 'item' : 'items'}
                  </span>
                  {wiselist.collaborators.length > 0 && (
                    <span className={styles.metaItem}>
                      {wiselist.collaborators.length}{' '}
                      {wiselist.collaborators.length === 1 ? 'collaborator' : 'collaborators'}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        <div className={styles.content}>
          {wiselist.items.length === 0 ? (
            <div className={styles.empty}>
              <p>This wiselist is empty</p>
              <p className={styles.emptyHint}>
                Browse tutors and services to add them to this wiselist
              </p>
            </div>
          ) : (
            <div className={styles.grid}>
              {wiselist.items.map((item) => (
                <WiselistItemCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveItem}
                  canEdit={!!isOwner}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ContextualSidebar>
        <ShareCollaborateWidget
          wiselistId={wiselist.id}
          slug={wiselist.slug}
          visibility={wiselist.visibility}
          isOwner={!!isOwner}
          onVisibilityChange={handleVisibilityChange}
        />
      </ContextualSidebar>
    </div>
  );
}
