/**
 * Filename: WiselistSelectionModal.tsx
 * Purpose: Modal to select/create wiselist when saving a listing or profile
 * Created: 2025-11-17
 * Gap 1: Save Bridge Implementation
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyWiselists, createWiselist } from '@/lib/api/wiselists';
import { Plus, List } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './WiselistSelectionModal.module.css';

interface WiselistSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'profile' | 'listing';
  targetId: string;
  targetName: string; // For display purposes
}

export default function WiselistSelectionModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}: WiselistSelectionModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWiselistName, setNewWiselistName] = useState('');
  const queryClient = useQueryClient();

  // Fetch user's wiselists
  const { data: wiselists = [], isLoading } = useQuery({
    queryKey: ['wiselists'],
    queryFn: getMyWiselists,
    enabled: isOpen,
  });

  // Create wiselist mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const wiselist = await createWiselist({ name, visibility: 'private' });
      return wiselist;
    },
    onSuccess: async (wiselist) => {
      // Add item to the newly created wiselist
      await addItemToWiselist(wiselist.id);
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
      setShowCreateForm(false);
      setNewWiselistName('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create wiselist');
    },
  });

  // Add to wiselist mutation
  const addItemMutation = useMutation({
    mutationFn: async (wiselistId: string) => {
      const payload: any = { wiselist_id: wiselistId };
      if (targetType === 'profile') {
        payload.profile_id = targetId;
      } else {
        payload.listing_id = targetId;
      }
      const response = await fetch(`/api/wiselists/${wiselistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add item');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Saved to wiselist!');
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save');
    },
  });

  const addItemToWiselist = async (wiselistId: string) => {
    return addItemMutation.mutateAsync(wiselistId);
  };

  const handleCreateAndSave = () => {
    if (!newWiselistName.trim()) {
      toast.error('Please enter a wiselist name');
      return;
    }
    createMutation.mutate(newWiselistName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Save to Wiselist</h2>
          <button onClick={onClose} className={styles.closeButton}>✕</button>
        </div>

        <div className={styles.content}>
          <p className={styles.subtitle}>Saving: {targetName}</p>

          {isLoading ? (
            <div className={styles.loading}>Loading your wiselists...</div>
          ) : (
            <>
              {/* Existing Wiselists */}
              {wiselists.length > 0 && (
                <div className={styles.wiselistList}>
                  {wiselists.map((wiselist: any) => (
                    <button
                      key={wiselist.id}
                      onClick={() => addItemToWiselist(wiselist.id)}
                      className={styles.wiselistButton}
                      disabled={addItemMutation.isPending}
                    >
                      <List size={18} />
                      <span>{wiselist.name}</span>
                      <span className={styles.itemCount}>({wiselist.item_count || 0})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Create New Wiselist */}
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className={styles.createButton}
                >
                  <Plus size={18} />
                  Create New Wiselist
                </button>
              ) : (
                <div className={styles.createForm}>
                  <input
                    type="text"
                    value={newWiselistName}
                    onChange={(e) => setNewWiselistName(e.target.value)}
                    placeholder="Wiselist name..."
                    className={styles.input}
                    maxLength={100}
                    autoFocus
                  />
                  <div className={styles.createActions}>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewWiselistName('');
                      }}
                      className={styles.cancelButton}
                      disabled={createMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateAndSave}
                      className={styles.saveButton}
                      disabled={createMutation.isPending || !newWiselistName.trim()}
                    >
                      {createMutation.isPending ? 'Creating...' : 'Create & Save'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
