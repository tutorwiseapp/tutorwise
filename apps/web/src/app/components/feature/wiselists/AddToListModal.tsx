/**
 * Filename: AddToListModal.tsx
 * Purpose: Modal for adding items to custom wiselists
 * Created: 2025-12-09
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Folder } from 'lucide-react';
import { getMyWiselists, addWiselistItem, createWiselist } from '@/lib/api/wiselists';
import Button from '@/app/components/ui/actions/Button';
import { toast } from 'react-hot-toast';
import type { WiselistItem, Wiselist } from '@/types';
import styles from './AddToListModal.module.css';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WiselistItem | null;
  selectedItems?: string[]; // For bulk actions
  wiselistId: string;
}

export default function AddToListModal({
  isOpen,
  onClose,
  item,
  selectedItems,
  wiselistId,
}: AddToListModalProps) {
  const queryClient = useQueryClient();
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());

  // Fetch all wiselists
  const { data: wiselists = [] } = useQuery({
    queryKey: ['wiselists'],
    queryFn: getMyWiselists,
    enabled: isOpen,
  });

  // Filter out "My Saves" and current wiselist
  const availableLists = wiselists.filter(
    (w: Wiselist) => w.name !== 'My Saves' && w.id !== wiselistId
  );

  // Add to wiselist mutation
  const addMutation = useMutation({
    mutationFn: async (listId: string) => {
      if (!item) return;

      await addWiselistItem({
        wiselistId: listId,
        profileId: item.profile_id || undefined,
        listingId: item.listing_id || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });
      queryClient.invalidateQueries({ queryKey: ['wiselist', wiselistId] });
    },
  });

  // Create new wiselist mutation
  const createMutation = useMutation({
    mutationFn: (name: string) =>
      createWiselist({
        name,
        description: '',
        visibility: 'private',
      }),
    onSuccess: async (newList) => {
      await queryClient.invalidateQueries({ queryKey: ['wiselists'] });

      // Auto-select the newly created list
      setSelectedLists(new Set([...selectedLists, newList.id]));
      setShowCreateNew(false);
      setNewListName('');
      toast.success('List created');
    },
    onError: () => {
      toast.error('Failed to create list');
    },
  });

  const handleToggleList = (listId: string) => {
    const newSelected = new Set(selectedLists);
    if (newSelected.has(listId)) {
      newSelected.delete(listId);
    } else {
      newSelected.add(listId);
    }
    setSelectedLists(newSelected);
  };

  const handleAddToLists = async () => {
    if (selectedLists.size === 0) {
      toast.error('Please select at least one list');
      return;
    }

    try {
      for (const listId of selectedLists) {
        await addMutation.mutateAsync(listId);
      }
      toast.success(`Added to ${selectedLists.size} list(s)`);
      onClose();
      setSelectedLists(new Set());
    } catch (error) {
      toast.error('Failed to add to lists');
    }
  };

  const handleCreateNew = () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    createMutation.mutate(newListName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add to Lists</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {showCreateNew ? (
            <div className={styles.createSection}>
              <input
                type="text"
                placeholder="New list name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className={styles.input}
                autoFocus
              />
              <div className={styles.createActions}>
                <Button variant="secondary" size="sm" onClick={() => setShowCreateNew(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleCreateNew} disabled={createMutation.isPending}>
                  Create
                </Button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => setShowCreateNew(true)} className={styles.createButton}>
                <Plus size={16} />
                Create New List
              </button>

              <div className={styles.listGrid}>
                {availableLists.length === 0 ? (
                  <p className={styles.emptyText}>
                    No lists available. Create your first list above!
                  </p>
                ) : (
                  availableLists.map((list: Wiselist) => (
                    <label key={list.id} className={styles.listOption}>
                      <input
                        type="checkbox"
                        checked={selectedLists.has(list.id)}
                        onChange={() => handleToggleList(list.id)}
                        className={styles.checkbox}
                      />
                      <div className={styles.listInfo}>
                        <Folder size={16} />
                        <span className={styles.listName}>{list.name}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!showCreateNew && (
          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddToLists}
              disabled={selectedLists.size === 0 || addMutation.isPending}
            >
              Add to {selectedLists.size} List{selectedLists.size !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
