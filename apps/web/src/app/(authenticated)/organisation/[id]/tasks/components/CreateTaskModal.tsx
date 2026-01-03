/**
 * CreateTaskModal.tsx
 * Modal for creating new organisation tasks
 * Created: 2026-01-03
 */

'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import styles from './CreateTaskModal.module.css';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  organisationId: string;
  onCreate: () => void;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  organisationId,
  onCreate,
}: CreateTaskModalProps) {
  const supabase = createClient();
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    status: 'todo',
    requiresApproval: false,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setCreating(true);

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('org_tasks')
        .insert({
          organisation_id: organisationId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          category: formData.category,
          status: formData.status,
          requires_approval: formData.requiresApproval,
          created_by: currentUser.user.id,
        });

      if (error) throw error;

      onCreate();
      onClose();

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'general',
        status: 'todo',
        requiresApproval: false,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create New Task</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>
              Title <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={styles.input}
              placeholder="Enter task title..."
              disabled={creating}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              placeholder="Enter task description..."
              rows={4}
              disabled={creating}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className={styles.select}
                disabled={creating}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={styles.select}
                disabled={creating}
              >
                <option value="general">General</option>
                <option value="complaint">Complaint</option>
                <option value="payment">Payment</option>
                <option value="tutor_switch">Tutor Switch</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Initial Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={styles.select}
                disabled={creating}
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.requiresApproval}
                  onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                  className={styles.checkbox}
                  disabled={creating}
                />
                <span>Requires approval</span>
              </label>
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
