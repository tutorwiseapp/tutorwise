/**
 * Filename: apps/web/src/app/(admin)/admin/blog/edit/[slug]/page.tsx
 * Purpose: Edit blog article page
 * Created: 2026-01-15
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import ArticleEditorForm from '../../components/ArticleEditorForm';
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

export default function EditBlogArticlePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/blog/articles/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setArticle(data.article);
      } else {
        setError('Article not found');
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedArticle: Partial<Article>) => {
    if (!article) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/blog/articles/${article.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedArticle),
      });

      if (response.ok) {
        router.push('/admin/blog');
      } else {
        alert('Failed to save article');
      }
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Error saving article');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/blog');
  };

  const handleDelete = async () => {
    if (!article) return;

    if (
      !confirm('Are you sure you want to delete this article? This action cannot be undone.')
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/blog/articles/${article.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/blog');
      } else {
        alert('Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
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

  if (error || !article) {
    return (
      <HubPageLayout
        header={
          <HubHeader
            title="Error"
            subtitle={error || 'Article not found'}
            className={styles.blogHeader}
          />
        }
      >
        <div className={styles.errorState}>
          <p>{error || 'Article not found'}</p>
          <Button variant="primary" size="md" onClick={() => router.push('/admin/blog')}>
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
          title="Edit Article"
          subtitle={article.title}
          actions={
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Delete Article
            </Button>
          }
          className={styles.blogHeader}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Article Editor"
            items={[
              {
                question: 'What is MDX?',
                answer:
                  'MDX allows you to write markdown with embedded React components for rich, interactive content.',
              },
              {
                question: 'How to add images?',
                answer:
                  'Upload a featured image for social sharing, and embed images directly in MDX content.',
              },
              {
                question: 'SEO best practices?',
                answer:
                  'Write descriptive titles, add meta descriptions, use proper headings, and include relevant keywords naturally.',
              },
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
        article={article}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={saving}
      />
    </HubPageLayout>
  );
}
