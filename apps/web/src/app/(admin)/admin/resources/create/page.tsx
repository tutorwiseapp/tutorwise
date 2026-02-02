/**
 * Filename: apps/web/src/app/(admin)/admin/resources/create/page.tsx
 * Purpose: Admin resource - Create new article or edit existing article
 * Created: 2026-01-15
 * Updated: 2026-02-02
 *
 * Handles both create and edit:
 * - /admin/resources/create → Create new article
 * - /admin/resources/create?slug=my-article → Edit existing article
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import ArticleEditorForm from '../components/ArticleEditorForm';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Article {
  id: string;
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

export default function NewBlogArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(!!slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!slug;

  // Fetch existing article when slug is provided
  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/resources/articles/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setArticle(data.article);
      } else {
        setError('Article not found');
      }
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (articleData: any) => {
    try {
      setSaving(true);

      if (isEditMode && article) {
        // Update existing article
        const response = await fetch(`/api/admin/resources/articles/${article.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData),
        });

        if (response.ok) {
          router.push('/admin/resources');
        } else {
          alert('Failed to save article');
        }
      } else {
        // Create new article
        const response = await fetch('/api/admin/resources/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData),
        });

        const data = await response.json();
        if (response.ok) {
          router.push('/admin/resources');
        } else {
          console.error('API error:', data);
          alert(`Failed to create article: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error saving article:', err);
      alert('Error saving article');
    } finally {
      setSaving(false);
    }
  };

  // Autosave handler - saves silently without redirect
  const handleAutoSave = async (updatedArticle: Partial<Article>) => {
    if (!article) return;

    const response = await fetch(`/api/admin/resources/articles/${article.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedArticle),
    });

    if (!response.ok) {
      throw new Error('Autosave failed');
    }
  };

  const handleCancel = () => {
    router.push('/admin/resources');
  };

  const handleDelete = async () => {
    if (!article) return;

    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/resources/articles/${article.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/resources');
      } else {
        alert('Failed to delete article');
      }
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Error deleting article');
    }
  };

  if (loading) {
    return (
      <HubPageLayout
        header={
          <HubHeader
            title="Loading..."
            subtitle="Please wait while we load the article"
            className={styles.blogHeader}
          />
        }
      >
        <div className={styles.loadingState}>
          <p>Loading article...</p>
        </div>
      </HubPageLayout>
    );
  }

  if (error) {
    return (
      <HubPageLayout
        header={
          <HubHeader
            title="Error"
            subtitle={error}
            className={styles.blogHeader}
          />
        }
      >
        <div className={styles.errorState}>
          <p>{error}</p>
          <Button variant="primary" size="md" onClick={() => router.push('/admin/resources')}>
            Back to Articles
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title={isEditMode ? 'Edit Article' : 'Create Article'}
          subtitle={isEditMode ? article?.title : 'Create and publish new resource content'}
          actions={
            isEditMode ? (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete Article
              </Button>
            ) : undefined
          }
          className={styles.blogHeader}
        />
      }
      tabs={
        !isEditMode ? (
          <HubTabs
            tabs={[
              { id: 'editor', label: 'Article Editor', active: true },
            ]}
            onTabChange={() => {}}
            className={styles.blogTabs}
          />
        ) : undefined
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Article Editor"
            items={[
              { question: 'What is MDX?', answer: 'MDX allows you to write markdown with embedded React components for rich, interactive content.' },
              { question: 'How to add images?', answer: 'Upload a featured image for social sharing, and embed images directly in MDX content.' },
              { question: 'SEO best practices?', answer: 'Write descriptive titles, add meta descriptions, use proper headings, and include relevant keywords naturally.' },
            ]}
          />
          <AdminTipWidget
            title="Writing Tips"
            tips={[
              'Start with an attention-grabbing headline',
              'Break content into scannable sections with headings',
              'Include actionable takeaways for readers',
              'Add internal links to related articles',
              'Proofread before publishing',
            ]}
          />
        </HubSidebar>
      }
    >
      <ArticleEditorForm
        article={isEditMode ? article ?? undefined : undefined}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={saving}
        onAutoSave={isEditMode ? handleAutoSave : undefined}
      />
    </HubPageLayout>
  );
}
