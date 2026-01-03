/**
 * Filename: AddToWiselistModal.tsx
 * Purpose: Modal for adding saved items to custom wiselists
 * Created: 2025-12-09
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyWiselists, addWiselistItem } from '@/lib/api/wiselists';
import { toast } from 'react-hot-toast';
import styles from './AddToWiselistModal.module.css';

interface AddToWiselistModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  profileId?: string;
  listingId?: string;
  onCreateWiselist?: () => void;
}

export default function AddToWiselistModal({
  isOpen,
  onClose,
  itemId,
  profileId,
  listingId,
  onCreateWiselist,
}: AddToWiselistModalProps) {
  const queryClient = useQueryClient();
  const [selectedWiselists, setSelectedWiselists] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Fetch user's wiselists (excluding "My Saves")
  const { data: wiselists = [], isLoading } = useQuery({
    queryKey: ['wiselists'],
    queryFn: getMyWiselists,
    enabled: isOpen,
  });

  // Filter out "My Saves" wiselist
  const customWiselists = wiselists.filter(
    (w: any) => w.is_owner === true && w.name !== 'My Saves'
  );

  if (!isOpen) return null;

  const handleToggleWiselist = (wiselistId: string) => {
    const newSelected = new Set(selectedWiselists);
    if (newSelected.has(wiselistId)) {
      newSelected.delete(wiselistId);
    } else {
      newSelected.add(wiselistId);
    }
    setSelectedWiselists(newSelected);
  };

  const handleAddToLists = async () => {
    if (selectedWiselists.size === 0) {
      toast.error('Please select at least one wiselist');
      return;
    }

    setIsAdding(true);

    try {
      // Add to all selected wiselists
      await Promise.all(
        Array.from(selectedWiselists).map((wiselistId) =>
          addWiselistItem({
            wiselistId,
            profileId,
            listingId,
          })
        )
      );

      toast.success(
        `Added to ${selectedWiselists.size} wiselist${selectedWiselists.size > 1 ? 's' : ''}`
      );

      // Invalidate wiselists query to refresh counts
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });

      // Close modal and reset selection
      handleClose();
    } catch (error) {
      console.error('Failed to add to wiselists:', error);
      toast.error('Failed to add to wiselists');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedWiselists(new Set());
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add to Wiselist</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>Loading wiselists...</div>
          ) : customWiselists.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>No custom wiselists yet</p>
              <p className={styles.emptyHint}>
                Create a wiselist to organise your saved items.
              </p>
              {onCreateWiselist && (
                <button
                  onClick={() => {
                    handleClose();
                    onCreateWiselist();
                  }}
                  className={styles.createButton}
                >
                  Create Wiselist
                </button>
              )}
            </div>
          ) : (
            <div className={styles.wiselistsList}>
              {customWiselists.map((wiselist: any) => (
                <label key={wiselist.id} className={styles.wiselistItem}>
                  <input
                    type="checkbox"
                    checked={selectedWiselists.has(wiselist.id)}
                    onChange={() => handleToggleWiselist(wiselist.id)}
                    className={styles.checkbox}
                    disabled={isAdding}
                  />
                  <div className={styles.wiselistInfo}>
                    <span className={styles.wiselistName}>{wiselist.name}</span>
                    {wiselist.description && (
                      <span className={styles.wiselistDescription}>
                        {wiselist.description}
                      </span>
                    )}
                    <span className={styles.itemCount}>
                      {wiselist.item_count || 0} item{wiselist.item_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.buttonGroup}>
            <button
              onClick={handleClose}
              disabled={isAdding}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              onClick={handleAddToLists}
              disabled={isAdding || selectedWiselists.size === 0 || customWiselists.length === 0}
              className={styles.addButton}
            >
              {isAdding
                ? 'Adding...'
                : `Add to ${selectedWiselists.size || ''} List${selectedWiselists.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
