/**
 * Filename: CreateWiselistWidget.tsx
 * Purpose: Sidebar widget to create new wiselist (v5.7)
 * Path: /app/components/wiselists/CreateWiselistWidget.tsx
 * Created: 2025-11-15
 */

'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import Button from '@/app/components/ui/Button';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import styles from '@/app/components/layout/sidebars/ContextualSidebar.module.css';

export function CreateWiselistWidget() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'private' | 'public',
  });

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

      // Reset form
      setFormData({ name: '', description: '', visibility: 'private' });
      setShowForm(false);

      // Navigate to the new wiselist
      router.push(`/wiselists/${wiselist.id}`);
      router.refresh();
    } catch (error: any) {
      console.error('Create wiselist error:', error);
      toast.error(error.message || 'Failed to create wiselist');
    } finally {
      setIsCreating(false);
    }
  };

  if (!showForm) {
    return (
      <SidebarWidget title="Create Wiselist">
        <div className={styles.widgetContent}>
          <p className={styles.widgetText}>
            Save and organize your favorite tutors and services
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowForm(true)}
            className={styles.widgetButton}
          >
            <Plus size={16} />
            New Wiselist
          </Button>
        </div>
      </SidebarWidget>
    );
  }

  return (
    <SidebarWidget title="Create Wiselist">
      <div className={styles.widgetContent}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Best Maths Tutors"
            className={styles.formInput}
            maxLength={100}
            disabled={isCreating}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description..."
            className={styles.formTextarea}
            rows={3}
            maxLength={500}
            disabled={isCreating}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Visibility</label>
          <select
            value={formData.visibility}
            onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'private' | 'public' })}
            className={styles.formSelect}
            disabled={isCreating}
          >
            <option value="private">Private - Only you</option>
            <option value="public">Public - Share with link</option>
          </select>
        </div>

        <div className={styles.buttonGroup}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowForm(false);
              setFormData({ name: '', description: '', visibility: 'private' });
            }}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            disabled={isCreating || !formData.name.trim()}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </SidebarWidget>
  );
}
