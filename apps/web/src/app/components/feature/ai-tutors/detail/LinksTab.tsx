/**
 * Filename: LinksTab.tsx
 * Purpose: AI Tutor URL Links Management - Add and manage reference URLs
 * Created: 2026-02-23
 * Version: v1.0
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import styles from './LinksTab.module.css';

interface Link {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  link_type: string | null;
  priority: number;
  status: 'active' | 'broken' | 'removed';
  added_at: string;
  last_accessed_at: string | null;
}

interface LinkFormData {
  url: string;
  title: string;
  description: string;
  link_type: string;
  priority: number;
}

interface LinksTabProps {
  aiTutorId: string;
  hasSubscription: boolean;
}

export default function LinksTab({ aiTutorId, hasSubscription }: LinksTabProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LinkFormData>({
    url: '',
    title: '',
    description: '',
    link_type: 'article',
    priority: 2,
  });

  // Fetch links
  const { data: links = [], isLoading } = useQuery<Link[]>({
    queryKey: ['ai-tutor-links', aiTutorId],
    queryFn: async () => {
      const response = await fetch(`/api/ai-tutors/${aiTutorId}/links`);
      if (!response.ok) throw new Error('Failed to fetch links');
      return response.json();
    },
  });

  // Add/Update link mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<LinkFormData> & { id?: string }) => {
      const url = data.id
        ? `/api/ai-tutors/${aiTutorId}/links/${data.id}`
        : `/api/ai-tutors/${aiTutorId}/links`;

      const response = await fetch(url, {
        method: data.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save link');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tutor-links', aiTutorId] });
      toast.success(editingId ? 'Link updated' : 'Link added successfully');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete link mutation
  const deleteMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const response = await fetch(
        `/api/ai-tutors/${aiTutorId}/links/${linkId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete link');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tutor-links', aiTutorId] });
      toast.success('Link deleted');
    },
    onError: () => {
      toast.error('Failed to delete link');
    },
  });

  const resetForm = () => {
    setFormData({
      url: '',
      title: '',
      description: '',
      link_type: 'article',
      priority: 2,
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (link: Link) => {
    setFormData({
      url: link.url,
      title: link.title || '',
      description: link.description || '',
      link_type: link.link_type || 'article',
      priority: link.priority,
    });
    setEditingId(link.id);
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL
    try {
      new URL(formData.url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    if (editingId) {
      saveMutation.mutate({ ...formData, id: editingId });
    } else {
      saveMutation.mutate(formData);
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return 'High';
      case 2:
        return 'Medium';
      case 3:
        return 'Low';
      default:
        return 'Medium';
    }
  };

  const getPriorityClass = (priority: number) => {
    switch (priority) {
      case 1:
        return styles.high;
      case 2:
        return styles.medium;
      case 3:
        return styles.low;
      default:
        return styles.medium;
    }
  };

  return (
    <div className={styles.container}>
      {/* Info Box */}
      <div className={styles.infoBox}>
        <p>
          <strong>URL Links (Studio Differentiator)</strong>
        </p>
        <p>
          Add reference URLs for your AI tutor to use when custom materials don't
          have an answer. Links are prioritized in order:
        </p>
        <ul>
          <li>High Priority: Critical resources (e.g., official documentation)</li>
          <li>Medium Priority: Supplementary resources</li>
          <li>Low Priority: Optional references</li>
        </ul>
      </div>

      {/* Add Link Form */}
      {(isAdding || editingId) && (
        <div
          className={`${styles.addLinkSection} ${!hasSubscription ? styles.disabled : ''}`}
        >
          <h3>{editingId ? 'Edit Link' : 'Add URL Link'}</h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="url">URL *</label>
              <input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                type="text"
                placeholder="Link title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder="Brief description of what this link covers"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="link_type">Type</label>
                <select
                  id="link_type"
                  value={formData.link_type}
                  onChange={(e) =>
                    setFormData({ ...formData, link_type: e.target.value })
                  }
                >
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="documentation">Documentation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value),
                    })
                  }
                >
                  <option value={1}>High</option>
                  <option value={2}>Medium</option>
                  <option value={3}>Low</option>
                </select>
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={resetForm}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? 'Saving...'
                  : editingId
                    ? 'Update Link'
                    : 'Add Link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Link Button */}
      {!isAdding && !editingId && (
        <div className={styles.addLinkSection}>
          <button
            className={styles.submitButton}
            onClick={() => setIsAdding(true)}
            disabled={!hasSubscription}
          >
            {hasSubscription
              ? '+ Add URL Link'
              : 'Active subscription required to add links'}
          </button>
        </div>
      )}

      {/* Links List */}
      <div className={styles.linksSection}>
        <h3>URL Links ({links.length})</h3>

        {isLoading ? (
          <div className={styles.emptyState}>
            <p>Loading links...</p>
          </div>
        ) : links.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No URL links added yet</p>
            <p>
              Add links to Khan Academy, Wikipedia, or other educational resources
            </p>
          </div>
        ) : (
          <div className={styles.linksList}>
            {links.map((link) => (
              <div key={link.id} className={styles.linkItem}>
                <div
                  className={`${styles.priorityBadge} ${getPriorityClass(link.priority)}`}
                  title={`${getPriorityLabel(link.priority)} Priority`}
                >
                  {link.priority}
                </div>

                <div className={styles.linkInfo}>
                  <div className={styles.linkTitle}>
                    {link.title || 'Untitled Link'}
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkUrl}
                  >
                    {link.url}
                  </a>
                  {link.description && (
                    <p className={styles.linkDescription}>{link.description}</p>
                  )}
                  <div className={styles.linkMeta}>
                    <span>{link.link_type}</span>
                    <span>Added {new Date(link.added_at).toLocaleDateString()}</span>
                    {link.last_accessed_at && (
                      <span>
                        Last used{' '}
                        {new Date(link.last_accessed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.linkActions}>
                  <button
                    className={styles.editButton}
                    onClick={() => handleEdit(link)}
                    title="Edit link"
                  >
                    ✏️
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => {
                      if (
                        confirm(
                          `Delete link "${link.title || link.url}"? This cannot be undone.`
                        )
                      ) {
                        deleteMutation.mutate(link.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    title="Delete link"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
