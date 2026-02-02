/**
 * Filename: apps/web/src/app/(admin)/admin/resources/components/ArticleEditorForm.tsx
 * Purpose: Enhanced resource article editor with autosave, draft recovery, and publishing features
 * Created: 2026-01-15
 * Updated: 2026-02-02
 *
 * Features:
 * - Autosave with debouncing (5 second delay)
 * - localStorage draft recovery for unsaved work
 * - Unsaved changes warning on page leave
 * - Save status indicator
 * - Social media platform selection
 * - Image selection (solid color, theme, free sources, upload)
 * - Storage optimization for large content
 */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import DatePicker from '@/app/components/ui/forms/DatePicker';
import TimePicker from '@/app/components/ui/forms/TimePicker';
import PlatformPreview from './PlatformPreview';
import SEOScore from './SEOScore';
import ContentTemplates from './ContentTemplates';
import styles from './ArticleEditorForm.module.css';

// Types
interface Article {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  category: string;
  status: string;
  read_time: string;
  featured_image_url?: string;
  meta_title?: string;
  meta_description?: string;
  // New fields for enhanced features
  publish_platforms?: string[];
  image_type?: 'solid' | 'theme' | 'free' | 'upload';
  image_color?: string;
  scheduled_for?: string; // ISO timestamp for scheduled publishing
}

interface ArticleVersion {
  id: string;
  version_number: number;
  title: string;
  status: string;
  created_by_name: string;
  created_at: string;
  is_milestone: boolean;
  change_summary: string | null;
}

interface ArticleEditorFormProps {
  article?: Article;
  onSave: (article: Partial<Article>) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  onAutoSave?: (article: Partial<Article>) => Promise<void>;
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'success' | 'error';
type ImageType = 'solid' | 'theme' | 'free' | 'upload';

interface DraftMetadata {
  lastSaved: string;
  version: string;
}

interface StoredDraft {
  data: Partial<Article>;
  metadata: DraftMetadata;
}

// Constants
const CATEGORIES = [
  { value: 'for-clients', label: 'For Clients' },
  { value: 'for-tutors', label: 'For Tutors' },
  { value: 'for-agents', label: 'For Agents' },
  { value: 'for-organisations', label: 'For Organisations' },
  { value: 'getting-started', label: 'Getting Started' },
  { value: 'faqs', label: 'FAQs' },
  { value: 'best-practices', label: 'Best Practices' },
  { value: 'success-stories', label: 'Success Stories' },
  { value: 'product-updates', label: 'Product Updates' },
  { value: 'pricing-billing', label: 'Pricing & Billing' },
  { value: 'safety-trust', label: 'Safety & Trust' },
  { value: 'education-insights', label: 'Education Insights' },
  { value: 'content-marketing', label: 'Content Marketing' },
  { value: 'about-tutorwise', label: 'About Tutorwise' },
  { value: 'company-news', label: 'Company News' },
];

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
];

const PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'all', name: 'All Platforms', icon: '🌐' },
];

const THEME_COLORS = [
  '#006c67', // Tutorwise primary
  '#00a89d', // Tutorwise secondary
  '#1e40af', // Blue
  '#7c3aed', // Purple
  '#dc2626', // Red
  '#ea580c', // Orange
  '#16a34a', // Green
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#be185d', // Pink
];

const SOLID_COLORS = [
  '#ffffff', // White
  '#000000', // Black
  '#f8fafc', // Slate 50
  '#f1f5f9', // Slate 100
  '#e2e8f0', // Slate 200
  '#1e293b', // Slate 800
  '#0f172a', // Slate 900
  '#fef3c7', // Amber 100
  '#dbeafe', // Blue 100
  '#dcfce7', // Green 100
];

const FREE_IMAGE_SOURCES = [
  { id: 'unsplash', name: 'Unsplash', url: 'https://unsplash.com' },
  { id: 'pexels', name: 'Pexels', url: 'https://pexels.com' },
  { id: 'pixabay', name: 'Pixabay', url: 'https://pixabay.com' },
];

const DRAFT_KEY_PREFIX = 'article_draft_';
const AUTOSAVE_DELAY = 5000; // 5 seconds
const LOCAL_SAVE_INTERVAL = 10000; // 10 seconds

export default function ArticleEditorForm({
  article,
  onSave,
  onCancel,
  isSaving = false,
  onAutoSave,
}: ArticleEditorFormProps) {
  // Form data state
  const [formData, setFormData] = useState<Partial<Article>>({
    title: article?.title || '',
    slug: article?.slug || '',
    description: article?.description || '',
    content: article?.content || '',
    category: article?.category || 'for-clients',
    status: article?.status || 'draft',
    read_time: article?.read_time || '',
    featured_image_url: article?.featured_image_url || '',
    meta_title: article?.meta_title || '',
    meta_description: article?.meta_description || '',
    publish_platforms: article?.publish_platforms || [],
    image_type: article?.image_type || 'upload',
    image_color: article?.image_color || '#006c67',
    scheduled_for: article?.scheduled_for || '',
  });

  // Save status states
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Draft recovery states
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState<number | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Image selection states
  const [selectedImageType, setSelectedImageType] = useState<ImageType>(
    article?.image_type || 'upload'
  );
  const [selectedColor, setSelectedColor] = useState(article?.image_color || '#006c67');

  // Version history states
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // Scheduled publishing states
  const [isScheduled, setIsScheduled] = useState(article?.status === 'scheduled');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    article?.scheduled_for ? new Date(article.scheduled_for) : undefined
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    article?.scheduled_for
      ? format(new Date(article.scheduled_for), 'HH:mm')
      : '09:00'
  );

  // Content templates state
  const [showTemplates, setShowTemplates] = useState(false);

  // Track if form has unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialDataRef = useRef<string>(JSON.stringify(formData));

  // Refs for cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Generate draft key based on article ID or 'new'
  const draftKey = `${DRAFT_KEY_PREFIX}${article?.id || 'new'}`;

  // Calculate content size for storage optimization display
  const contentSize = new Blob([formData.content || '']).size;
  const isLargeContent = contentSize > 50000; // 50KB threshold

  // Load draft from localStorage on mount
  useEffect(() => {
    if (article?.id) return; // Don't show draft for existing articles

    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const parsed: StoredDraft = JSON.parse(stored);
        const savedAt = new Date(parsed.metadata.lastSaved);
        const age = Date.now() - savedAt.getTime();

        setHasDraft(true);
        setDraftAge(age);
        setShowDraftBanner(true);

        console.log(`[ArticleDraft] Found draft, age: ${Math.round(age / 1000)}s`);
      }
    } catch (error) {
      console.error('[ArticleDraft] Error loading draft:', error);
    }
  }, [draftKey, article?.id]);

  // Auto-save to localStorage periodically (for new articles)
  useEffect(() => {
    if (article?.id) return; // Existing articles use API autosave

    localSaveTimerRef.current = setInterval(() => {
      if (!hasUnsavedChanges) return;

      try {
        const draft: StoredDraft = {
          data: formData,
          metadata: {
            lastSaved: new Date().toISOString(),
            version: '1.0',
          },
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
        console.log('[ArticleDraft] Saved to localStorage');
      } catch (error) {
        console.error('[ArticleDraft] Error saving to localStorage:', error);
      }
    }, LOCAL_SAVE_INTERVAL);

    return () => {
      if (localSaveTimerRef.current) {
        clearInterval(localSaveTimerRef.current);
      }
    };
  }, [draftKey, formData, hasUnsavedChanges, article?.id]);

  // Autosave with debouncing (for existing articles with API)
  useEffect(() => {
    if (!article?.id || !onAutoSave) return;

    // Check if data has changed
    const currentData = JSON.stringify(formData);
    if (currentData === initialDataRef.current) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSaveStatus('pending');

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;

      setSaveStatus('saving');
      setSaveError(null);

      try {
        await onAutoSave(formData);

        if (isMountedRef.current) {
          setSaveStatus('success');
          setLastSaved(new Date());
          setHasUnsavedChanges(false);

          // Reset to idle after 2 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              setSaveStatus('idle');
            }
          }, 2000);
        }
      } catch (error) {
        if (isMountedRef.current) {
          setSaveStatus('error');
          setSaveError(error instanceof Error ? error.message : 'Autosave failed');

          // Reset to idle after 3 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              setSaveStatus('idle');
            }
          }, 3000);
        }
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, article?.id, onAutoSave]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (localSaveTimerRef.current) {
        clearInterval(localSaveTimerRef.current);
      }
    };
  }, []);

  // Track unsaved changes
  useEffect(() => {
    const currentData = JSON.stringify(formData);
    setHasUnsavedChanges(currentData !== initialDataRef.current);
  }, [formData]);

  // Load version history for existing articles
  useEffect(() => {
    if (!article?.id) return;

    const loadVersionHistory = async () => {
      setIsLoadingVersions(true);
      try {
        const response = await fetch(`/api/admin/resources/articles/${article.id}/versions`);
        if (response.ok) {
          const data = await response.json();
          setVersions(data.versions || []);
        }
      } catch (error) {
        console.error('Error loading version history:', error);
      } finally {
        setIsLoadingVersions(false);
      }
    };

    loadVersionHistory();
  }, [article?.id]);

  // Update scheduled_for when date/time changes
  useEffect(() => {
    if (isScheduled && scheduledDate) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const combined = new Date(scheduledDate);
      combined.setHours(hours, minutes, 0, 0);
      setFormData((prev) => ({
        ...prev,
        status: 'scheduled',
        scheduled_for: combined.toISOString(),
      }));
    } else if (!isScheduled && formData.status === 'scheduled') {
      setFormData((prev) => ({
        ...prev,
        status: 'draft',
        scheduled_for: '',
      }));
    }
  }, [isScheduled, scheduledDate, scheduledTime]);

  // Handlers
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Auto-generate slug from title
      if (name === 'title' && !article?.slug) {
        const slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        setFormData((prev) => ({ ...prev, slug }));
      }
    },
    [article?.slug]
  );

  const handlePlatformToggle = useCallback((platformId: string) => {
    setFormData((prev) => {
      const currentPlatforms = prev.publish_platforms || [];

      if (platformId === 'all') {
        // Toggle all platforms
        if (currentPlatforms.includes('all')) {
          return { ...prev, publish_platforms: [] };
        }
        return { ...prev, publish_platforms: ['linkedin', 'facebook', 'instagram', 'all'] };
      }

      // Toggle individual platform
      if (currentPlatforms.includes(platformId)) {
        const newPlatforms = currentPlatforms.filter((p) => p !== platformId && p !== 'all');
        return { ...prev, publish_platforms: newPlatforms };
      }

      const newPlatforms = [...currentPlatforms, platformId];
      // If all individual platforms are selected, add 'all'
      if (
        newPlatforms.includes('linkedin') &&
        newPlatforms.includes('facebook') &&
        newPlatforms.includes('instagram')
      ) {
        return { ...prev, publish_platforms: [...newPlatforms, 'all'] };
      }
      return { ...prev, publish_platforms: newPlatforms };
    });
  }, []);

  const handleImageTypeChange = useCallback((type: ImageType) => {
    setSelectedImageType(type);
    setFormData((prev) => ({ ...prev, image_type: type }));
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color);
    setFormData((prev) => ({ ...prev, image_color: color }));
  }, []);

  const handleRestoreDraft = useCallback(() => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const parsed: StoredDraft = JSON.parse(stored);
        setFormData(parsed.data);
        setShowDraftBanner(false);
        console.log('[ArticleDraft] Draft restored');
      }
    } catch (error) {
      console.error('[ArticleDraft] Error restoring draft:', error);
    }
  }, [draftKey]);

  const handleDiscardDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setShowDraftBanner(false);
      console.log('[ArticleDraft] Draft discarded');
    } catch (error) {
      console.error('[ArticleDraft] Error discarding draft:', error);
    }
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
    } catch (error) {
      console.error('[ArticleDraft] Error clearing draft:', error);
    }
  }, [draftKey]);

  // Restore article to a previous version
  const handleRestoreVersion = useCallback(
    async (versionId: string) => {
      if (!article?.id) return;

      const confirmed = window.confirm(
        'Are you sure you want to restore this version? Current unsaved changes will be lost.'
      );
      if (!confirmed) return;

      setIsRestoringVersion(true);
      try {
        const response = await fetch(`/api/admin/resources/articles/${article.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId }),
        });

        if (response.ok) {
          const data = await response.json();
          // Update form with restored data
          if (data.article) {
            setFormData({
              title: data.article.title || '',
              slug: data.article.slug || '',
              description: data.article.description || '',
              content: data.article.content || '',
              category: data.article.category || 'for-clients',
              status: data.article.status || 'draft',
              read_time: data.article.read_time || '',
              featured_image_url: data.article.featured_image_url || '',
              meta_title: data.article.meta_title || '',
              meta_description: data.article.meta_description || '',
              publish_platforms: data.article.publish_platforms || [],
              image_type: data.article.image_type || 'upload',
              image_color: data.article.image_color || '#006c67',
              scheduled_for: data.article.scheduled_for || '',
            });
            initialDataRef.current = JSON.stringify(data.article);
            setHasUnsavedChanges(false);
          }
          // Reload version history
          const versionsResponse = await fetch(
            `/api/admin/resources/articles/${article.id}/versions`
          );
          if (versionsResponse.ok) {
            const versionsData = await versionsResponse.json();
            setVersions(versionsData.versions || []);
          }
        } else {
          alert('Failed to restore version');
        }
      } catch (error) {
        console.error('Error restoring version:', error);
        alert('Error restoring version');
      } finally {
        setIsRestoringVersion(false);
      }
    },
    [article?.id]
  );

  // Toggle scheduled publishing
  const handleScheduledToggle = useCallback(() => {
    setIsScheduled((prev) => !prev);
    if (!isScheduled && !scheduledDate) {
      // Default to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setScheduledDate(tomorrow);
      setScheduledTime('09:00');
    }
  }, [isScheduled, scheduledDate]);

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (template: { content: string; category: string }) => {
      // Only apply template if content is empty or user confirms
      if (formData.content && formData.content.trim().length > 0) {
        const confirmed = window.confirm(
          'Applying a template will replace your current content. Continue?'
        );
        if (!confirmed) {
          setShowTemplates(false);
          return;
        }
      }

      setFormData((prev) => ({
        ...prev,
        content: template.content,
        category: template.category,
      }));
      setShowTemplates(false);
    },
    [formData.content]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Optimize content before saving (compress whitespace for storage efficiency)
    const optimizedData = {
      ...formData,
      content: optimizeContentForStorage(formData.content || ''),
    };

    await onSave(optimizedData);

    // Clear draft after successful save
    clearDraft();
    setHasUnsavedChanges(false);
    initialDataRef.current = JSON.stringify(formData);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    onCancel();
  };

  // Utility functions
  const formatDraftAge = (ageMs: number | null): string => {
    if (!ageMs) return '';
    const minutes = Math.floor(ageMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  const formatLastSaved = (date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 10) return 'Saved just now';
    if (diffSeconds < 60) return `Saved ${diffSeconds} seconds ago`;
    return `Saved at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  const getSaveStatusText = (): string => {
    switch (saveStatus) {
      case 'pending':
        return 'Changes pending...';
      case 'saving':
        return 'Saving...';
      case 'success':
        return formatLastSaved(lastSaved);
      case 'error':
        return saveError || 'Save failed';
      default:
        return lastSaved ? formatLastSaved(lastSaved) : 'No changes';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Draft Recovery Banner */}
      {showDraftBanner && hasDraft && (
        <div className={styles.draftRecoveryBanner}>
          <span className={styles.draftRecoveryText}>
            📝 You have an unsaved draft from {formatDraftAge(draftAge)}
          </span>
          <div className={styles.draftRecoveryActions}>
            <button
              type="button"
              className={styles.restoreButton}
              onClick={handleRestoreDraft}
            >
              Restore
            </button>
            <button
              type="button"
              className={styles.discardButton}
              onClick={handleDiscardDraft}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Save Status Bar */}
      {article?.id && (
        <div className={styles.saveStatusBar}>
          <div className={styles.saveStatusLeft}>
            <span className={`${styles.saveStatusIcon} ${styles[saveStatus]}`} />
            <span className={`${styles.saveStatusText} ${saveStatus === 'error' ? styles.error : ''}`}>
              {getSaveStatusText()}
            </span>
          </div>
          {hasUnsavedChanges && saveStatus === 'idle' && (
            <span className={styles.saveStatusText}>• Unsaved changes</span>
          )}
        </div>
      )}

      {/* Basic Information */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic Information</h3>

        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.label}>
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={styles.input}
            required
            placeholder="Enter article title..."
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="slug" className={styles.label}>
            Slug *
          </label>
          <input
            type="text"
            id="slug"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            className={styles.input}
            required
            placeholder="url-friendly-slug"
          />
          <p className={styles.helpText}>URL: /resources/{formData.slug || 'article-slug'}</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={styles.textarea}
            rows={3}
            placeholder="Brief description for search engines and social sharing..."
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              Category *
            </label>
            <UnifiedSelect
              options={CATEGORIES}
              value={formData.category}
              onChange={(value) => setFormData((prev) => ({ ...prev, category: String(value) }))}
              placeholder="Select category"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="status" className={styles.label}>
              Status
            </label>
            <UnifiedSelect
              options={STATUSES}
              value={formData.status}
              onChange={(value) => setFormData((prev) => ({ ...prev, status: String(value) }))}
              placeholder="Select status"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="read_time" className={styles.label}>
              Read Time
            </label>
            <input
              type="text"
              id="read_time"
              name="read_time"
              value={formData.read_time}
              onChange={handleChange}
              className={styles.input}
              placeholder="10 min read"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Content</h3>
          {!article?.id && (
            <button
              type="button"
              className={styles.templateButton}
              onClick={() => setShowTemplates(true)}
            >
              📋 Use Template
            </button>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="content" className={styles.label}>
            Article Content (MDX)
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            className={styles.contentEditor}
            rows={20}
            placeholder="Write your article content in MDX format..."
          />
          <div className={`${styles.storageInfo} ${isLargeContent ? '' : styles.optimized}`}>
            {isLargeContent ? '⚠️' : '✓'} Content size: {formatBytes(contentSize)}
            {isLargeContent && ' (Consider splitting into multiple articles for better performance)'}
          </div>
        </div>
      </div>

      {/* Publishing Platforms */}
      <div className={styles.platformSection}>
        <h3 className={styles.sectionTitle}>Publishing Platforms</h3>
        <p className={styles.helpText} style={{ marginBottom: '1rem' }}>
          Select where you want to publish this article. Content will be auto-optimized for each platform.
        </p>

        <div className={styles.platformGrid}>
          {PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              className={`${styles.platformOption} ${
                formData.publish_platforms?.includes(platform.id) ? styles.selected : ''
              }`}
              onClick={() => handlePlatformToggle(platform.id)}
            >
              <span className={styles.platformIcon}>{platform.icon}</span>
              <span className={styles.platformName}>{platform.name}</span>
              {formData.publish_platforms?.includes(platform.id) && (
                <span className={styles.platformCheckmark}>✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Live Platform Preview */}
        {(formData.publish_platforms?.length ?? 0) > 0 && (
          <PlatformPreview
            title={formData.title || ''}
            description={formData.description || ''}
            imageUrl={formData.featured_image_url}
            imageColor={selectedColor}
            platforms={formData.publish_platforms || []}
          />
        )}
      </div>

      {/* Image Selection */}
      <div className={styles.imageSection}>
        <h3 className={styles.sectionTitle}>Featured Image</h3>

        <div className={styles.imageTypeGrid}>
          <div
            className={`${styles.imageTypeOption} ${selectedImageType === 'solid' ? styles.selected : ''}`}
            onClick={() => handleImageTypeChange('solid')}
          >
            <div className={`${styles.imageTypeIcon} ${styles.solidColor}`}>🎨</div>
            <div className={styles.imageTypeContent}>
              <div className={styles.imageTypeName}>Solid Color</div>
              <div className={styles.imageTypeDesc}>Simple, clean background</div>
            </div>
          </div>

          <div
            className={`${styles.imageTypeOption} ${selectedImageType === 'theme' ? styles.selected : ''}`}
            onClick={() => handleImageTypeChange('theme')}
          >
            <div className={`${styles.imageTypeIcon} ${styles.themeColor}`}>🎯</div>
            <div className={styles.imageTypeContent}>
              <div className={styles.imageTypeName}>Theme Color</div>
              <div className={styles.imageTypeDesc}>Brand-aligned colors</div>
            </div>
          </div>

          <div
            className={`${styles.imageTypeOption} ${selectedImageType === 'free' ? styles.selected : ''}`}
            onClick={() => handleImageTypeChange('free')}
          >
            <div className={`${styles.imageTypeIcon} ${styles.freeImage}`}>🖼️</div>
            <div className={styles.imageTypeContent}>
              <div className={styles.imageTypeName}>Free Image</div>
              <div className={styles.imageTypeDesc}>From Unsplash, Pexels, etc.</div>
            </div>
          </div>

          <div
            className={`${styles.imageTypeOption} ${selectedImageType === 'upload' ? styles.selected : ''}`}
            onClick={() => handleImageTypeChange('upload')}
          >
            <div className={`${styles.imageTypeIcon} ${styles.upload}`}>⬆️</div>
            <div className={styles.imageTypeContent}>
              <div className={styles.imageTypeName}>Upload</div>
              <div className={styles.imageTypeDesc}>Your own image</div>
            </div>
          </div>
        </div>

        {/* Solid Color Picker */}
        {selectedImageType === 'solid' && (
          <div className={styles.colorPicker}>
            {SOLID_COLORS.map((color) => (
              <div
                key={color}
                className={`${styles.colorSwatch} ${selectedColor === color ? styles.selected : ''}`}
                style={{ backgroundColor: color, border: color === '#ffffff' ? '1px solid #e5e7eb' : 'none' }}
                onClick={() => handleColorSelect(color)}
              />
            ))}
          </div>
        )}

        {/* Theme Color Picker */}
        {selectedImageType === 'theme' && (
          <div className={styles.colorPicker}>
            {THEME_COLORS.map((color) => (
              <div
                key={color}
                className={`${styles.colorSwatch} ${selectedColor === color ? styles.selected : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
              />
            ))}
          </div>
        )}

        {/* Free Image Sources */}
        {selectedImageType === 'free' && (
          <div className={styles.freeImageSources}>
            {FREE_IMAGE_SOURCES.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.imageSourceButton}
              >
                🔗 {source.name}
              </a>
            ))}
          </div>
        )}

        {/* Upload Area / URL Input */}
        {(selectedImageType === 'upload' || selectedImageType === 'free') && (
          <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
            <label htmlFor="featured_image_url" className={styles.label}>
              {selectedImageType === 'free' ? 'Paste Image URL' : 'Featured Image URL'}
            </label>
            <input
              type="url"
              id="featured_image_url"
              name="featured_image_url"
              value={formData.featured_image_url}
              onChange={handleChange}
              className={styles.input}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        )}

        {/* Image Preview */}
        {formData.featured_image_url && (
          <div className={styles.imagePreview}>
            <img src={formData.featured_image_url} alt="Featured preview" />
            <div className={styles.imagePreviewOverlay}>
              <button
                type="button"
                className={styles.removeImageButton}
                onClick={() => setFormData((prev) => ({ ...prev, featured_image_url: '' }))}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Color Preview for solid/theme */}
        {(selectedImageType === 'solid' || selectedImageType === 'theme') && !formData.featured_image_url && (
          <div
            className={styles.imagePreview}
            style={{
              backgroundColor: selectedColor,
              height: '150px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '1rem',
            }}
          >
            <span style={{ color: isLightColor(selectedColor) ? '#111827' : '#ffffff', fontSize: '0.875rem' }}>
              Color Preview: {selectedColor}
            </span>
          </div>
        )}
      </div>

      {/* Scheduled Publishing */}
      <div className={styles.scheduledSection}>
        <div className={styles.scheduledHeader}>
          <h3 className={styles.sectionTitle} style={{ margin: 0, border: 'none', padding: 0 }}>
            Scheduled Publishing
          </h3>
          <div className={styles.scheduledToggle}>
            <div
              className={`${styles.toggleSwitch} ${isScheduled ? styles.active : ''}`}
              onClick={handleScheduledToggle}
              role="switch"
              aria-checked={isScheduled}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleScheduledToggle()}
            />
            <span className={styles.toggleLabel}>
              {isScheduled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {isScheduled && (
          <>
            <div className={styles.scheduledInputs}>
              <div className={styles.scheduledInput}>
                <label>Publish Date</label>
                <DatePicker
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  placeholder="Select date"
                />
              </div>
              <div className={styles.scheduledInput}>
                <label>Publish Time</label>
                <TimePicker
                  value={scheduledTime}
                  onChange={(value) => setScheduledTime(String(value))}
                  interval={30}
                  placeholder="Select time"
                />
              </div>
            </div>
            {scheduledDate && (
              <div className={styles.scheduledPreview}>
                This article will be published on{' '}
                <strong>
                  {format(scheduledDate, 'MMMM d, yyyy')} at{' '}
                  {new Date(`2000-01-01T${scheduledTime}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </strong>
              </div>
            )}
          </>
        )}
      </div>

      {/* SEO & Meta */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>SEO & Meta</h3>

        <div className={styles.formGroup}>
          <label htmlFor="meta_title" className={styles.label}>
            Meta Title
          </label>
          <input
            type="text"
            id="meta_title"
            name="meta_title"
            value={formData.meta_title}
            onChange={handleChange}
            className={styles.input}
            placeholder="Custom title for search engines (optional)"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meta_description" className={styles.label}>
            Meta Description
          </label>
          <textarea
            id="meta_description"
            name="meta_description"
            value={formData.meta_description}
            onChange={handleChange}
            className={styles.textarea}
            rows={2}
            placeholder="Custom description for search engines (optional)"
          />
        </div>

        {/* SEO Score Analysis */}
        <SEOScore
          title={formData.title || ''}
          slug={formData.slug || ''}
          description={formData.description || ''}
          content={formData.content || ''}
          metaTitle={formData.meta_title}
          metaDescription={formData.meta_description}
          featuredImageUrl={formData.featured_image_url}
        />
      </div>

      {/* Version History - Only for existing articles */}
      {article?.id && (
        <div className={styles.versionHistorySection}>
          <div className={styles.versionHistoryHeader}>
            <h3 className={styles.versionHistoryTitle}>
              Version History
              {versions.length > 0 && (
                <span className={styles.versionCount}>{versions.length}</span>
              )}
            </h3>
          </div>

          {isLoadingVersions ? (
            <div className={styles.loadingVersions}>
              <span className={styles.loadingSpinner} />
              Loading versions...
            </div>
          ) : versions.length > 0 ? (
            <div className={styles.versionList}>
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`${styles.versionItem} ${version.is_milestone ? styles.milestone : ''}`}
                >
                  <div className={styles.versionInfo}>
                    <span className={styles.versionNumber}>
                      Version {version.version_number}
                      {version.is_milestone && (
                        <span className={styles.milestoneBadge}>Published</span>
                      )}
                    </span>
                    <span className={styles.versionMeta}>
                      {version.created_by_name || 'Unknown'} •{' '}
                      {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div className={styles.versionActions}>
                    <button
                      type="button"
                      className={styles.restoreVersionButton}
                      onClick={() => handleRestoreVersion(version.id)}
                      disabled={isRestoringVersion}
                    >
                      {isRestoringVersion ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noVersions}>
              No version history yet. Versions are created automatically when you save changes.
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" size="md" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        {!article?.id && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isSaving}
            onClick={() => {
              setFormData((prev) => ({ ...prev, status: 'draft' }));
              // Submit form after state update
              setTimeout(() => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }, 0);
            }}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" disabled={isSaving}>
          {isSaving
            ? 'Saving...'
            : article?.id
              ? 'Update Article'
              : formData.status === 'published'
                ? 'Publish'
                : 'Create Article'}
        </Button>
      </div>

      {/* Content Templates Modal */}
      {showTemplates && (
        <ContentTemplates
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </form>
  );
}

/**
 * Optimize content for storage efficiency
 * - Removes excessive whitespace
 * - Normalizes line endings
 * - Trims trailing spaces
 */
function optimizeContentForStorage(content: string): string {
  return content
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Remove trailing whitespace from each line
    .replace(/[ \t]+$/gm, '')
    // Collapse multiple blank lines into maximum of two
    .replace(/\n{4,}/g, '\n\n\n')
    // Trim start and end
    .trim();
}

/**
 * Check if a color is light (for text contrast)
 */
function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
