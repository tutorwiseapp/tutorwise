/**
 * Filename: CreateWiselistModal.tsx
 * Purpose: Modal for creating a new wiselist
 * Created: 2025-11-29
 * Updated: 2025-11-29 - Converted from CreateWiselistWidget to modal pattern
 */

'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import styles from './CreateWiselistModal.module.css';

interface CreateWiselistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateWiselistModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateWiselistModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'private' | 'public',
  });

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name for your wiselist');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/wiselists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create wiselist');
      }

      const { wiselist } = await response.json();
      toast.success('Wiselist created!');

      // Invalidate wiselists query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['wiselists'] });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close modal and reset form
      handleClose();

      // Navigate to the new wiselist
      router.push(`/wiselists/${wiselist.id}`);
    } catch (error: any) {
      console.error('Create wiselist error:', error);
      toast.error(error.message || 'Failed to create wiselist');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', visibility: 'private' });
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Create Wiselist</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Name Input */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Best Maths Tutors"
              className={styles.input}
              maxLength={100}
              disabled={isCreating}
              autoFocus
            />
          </div>

          {/* Description Textarea */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
              className={styles.textarea}
              rows={3}
              maxLength={500}
              disabled={isCreating}
            />
            <span className={styles.charCount}>{formData.description.length}/500</span>
          </div>

          {/* Visibility Select */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Visibility</label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'private' | 'public' })}
              className={styles.select}
              disabled={isCreating}
            >
              <option value="private">Private - Only you</option>
              <option value="public">Public - Share with link</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className={styles.buttonGroup}>
            <button
              onClick={handleClose}
              disabled={isCreating}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !formData.name.trim()}
              className={styles.createButton}
            >
              {isCreating ? 'Creating...' : 'Create Wiselist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
