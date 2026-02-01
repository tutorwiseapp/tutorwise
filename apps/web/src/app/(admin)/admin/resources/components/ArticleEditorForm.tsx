/**
 * Filename: apps/web/src/app/(admin)/admin/resources/components/ArticleEditorForm.tsx
 * Purpose: Resource article editor form component
 * Created: 2026-01-15
 */
'use client';

import React, { useState } from 'react';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './ArticleEditorForm.module.css';

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
}

interface ArticleEditorFormProps {
  article?: Article;
  onSave: (article: Partial<Article>) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

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

export default function ArticleEditorForm({
  article,
  onSave,
  onCancel,
  isSaving = false,
}: ArticleEditorFormProps) {
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
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
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
        <h3 className={styles.sectionTitle}>Content</h3>

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
        </div>
      </div>

      {/* SEO & Media */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>SEO & Media</h3>

        <div className={styles.formGroup}>
          <label htmlFor="featured_image_url" className={styles.label}>
            Featured Image URL
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
      </div>

      {/* Form Actions */}
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" disabled={isSaving}>
          {isSaving ? 'Saving...' : article?.id ? 'Update Article' : 'Create Article'}
        </Button>
      </div>
    </form>
  );
}
