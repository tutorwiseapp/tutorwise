/**
 * Filename: apps/web/src/app/(admin)/admin/resources/create/page.tsx
 * Purpose: Admin resource - Create new article or edit existing article
 * Created: 2026-01-15
 * Updated: 2026-03-16
 *
 * Handles both create and edit:
 * - /admin/resources/create → Create new article
 * - /admin/resources/create?slug=my-article → Edit existing article
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HubPageLayout, HubHeader, HubTabs } from '@/components/hub/layout';
import HubSidebar from '@/components/hub/sidebar/HubSidebar';
import { AdminHelpWidget, AdminTipWidget } from '@/components/admin/widgets';
import Button from '@/components/ui/actions/Button';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import Message from '@/components/ui/feedback/Message';
import Input from '@/components/ui/forms/Input';
import { SkeletonLine, SkeletonRect } from '@/components/ui/feedback/LoadingSkeleton';
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
  revision_count?: number;
}

const REVISION_TYPE_LABELS: Record<string, string> = {
  friendlier_tone: 'Friendlier tone',
  more_professional: 'More professional',
  shorter: 'Shorter',
  more_depth: 'More depth',
  better_seo: 'Better SEO',
};

const MAX_REVISIONS = 3;

export default function NewBlogArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(!!slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Approve/Revise modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveDate, setApproveDate] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [reviseTypes, setReviseTypes] = useState<Set<string>>(new Set());
  const [reviseCustom, setReviseCustom] = useState('');
  const [reviseLoading, setReviseLoading] = useState(false);

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
      setSaveError(null);

      if (isEditMode && article) {
        const response = await fetch(`/api/admin/resources/articles/${article.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleData),
        });

        if (response.ok) {
          router.push('/admin/resources');
        } else {
          setSaveError('Failed to save article');
        }
      } else {
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
          setSaveError(`Failed to create article: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error saving article:', err);
      setSaveError('Error saving article');
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
        setSaveError('Failed to delete article');
      }
    } catch (err) {
      console.error('Error deleting article:', err);
      setSaveError('Error deleting article');
    }
  };

  const handleApprove = async () => {
    if (!article) return;
    setApproveLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (approveDate) body.scheduled_for = new Date(approveDate).toISOString();

      const response = await fetch(`/api/admin/resources/articles/${article.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setShowApproveModal(false);
        router.push('/admin/resources');
      } else {
        const data = await response.json();
        setSaveError(data.error || 'Failed to approve article');
      }
    } catch {
      setSaveError('Error approving article');
    } finally {
      setApproveLoading(false);
    }
  };

  const toggleReviseType = (type: string) => {
    setReviseTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleRevise = async () => {
    if (!article) return;
    if (reviseTypes.size === 0 && !reviseCustom.trim()) {
      setSaveError('Select at least one revision type or provide custom feedback');
      return;
    }
    setReviseLoading(true);
    try {
      const types = [...reviseTypes];
      if (reviseCustom.trim()) types.push('custom');
      const response = await fetch(`/api/admin/resources/articles/${article.id}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types, custom: reviseCustom.trim() || undefined }),
      });
      if (response.ok) {
        setShowReviseModal(false);
        router.push('/admin/resources');
      } else {
        const data = await response.json();
        setSaveError(data.error || 'Failed to request revision');
      }
    } catch {
      setSaveError('Error requesting revision');
    } finally {
      setReviseLoading(false);
    }
  };

  const isDraft = article?.status === 'draft';
  const canRevise = isDraft && (article?.revision_count ?? 0) < MAX_REVISIONS;

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
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonRect />
          <SkeletonLine />
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
          <Message type="error">{error}</Message>
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
              <>
                {article?.status && (
                  <StatusBadge
                    variant={
                      article.status === 'published' ? 'published' :
                      article.status === 'scheduled' ? 'scheduled' :
                      article.status === 'revising' ? 'warning' :
                      'pending'
                    }
                    label={
                      article.status === 'revising'
                        ? `Revising (${article.revision_count ?? 0}/${MAX_REVISIONS})`
                        : article.status.charAt(0).toUpperCase() + article.status.slice(1)
                    }
                    size="sm"
                  />
                )}
                {isDraft && (
                  <Button variant="primary" size="sm" onClick={() => { setApproveDate(''); setShowApproveModal(true); }}>
                    Approve
                  </Button>
                )}
                {canRevise && (
                  <Button variant="secondary" size="sm" onClick={() => { setReviseTypes(new Set()); setReviseCustom(''); setShowReviseModal(true); }}>
                    Revise
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  Delete Article
                </Button>
              </>
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
      {saveError && (
        <Message type="error">{saveError}</Message>
      )}
      <ArticleEditorForm
        article={isEditMode ? article ?? undefined : undefined}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={saving}
        onAutoSave={isEditMode ? handleAutoSave : undefined}
      />

      {/* ── Approve Modal ─────────────────────────────────────────── */}
      {showApproveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowApproveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Approve Article</h3>
            <p className={styles.modalSubtitle}>{article?.title}</p>

            <label className={styles.fieldLabel}>
              Schedule publish date (leave empty for immediate publish)
            </label>
            <Input
              type="datetime-local"
              value={approveDate}
              onChange={(e) => setApproveDate(e.target.value)}
            />

            <div className={styles.modalActions}>
              <Button variant="secondary" size="sm" onClick={() => setShowApproveModal(false)} disabled={approveLoading}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleApprove} isLoading={approveLoading}>
                {approveDate ? 'Schedule' : 'Publish Now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revise Modal ──────────────────────────────────────────── */}
      {showReviseModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReviseModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Request Revision</h3>
            <p className={styles.modalSubtitle}>
              {article?.title} — Round {(article?.revision_count ?? 0) + 1}/{MAX_REVISIONS}
            </p>

            <label className={styles.fieldLabel}>Select revision type(s)</label>
            <div className={styles.reviseTypeGrid}>
              {Object.entries(REVISION_TYPE_LABELS).map(([slug, label]) => (
                <button
                  key={slug}
                  className={`${styles.reviseTypeBtn} ${reviseTypes.has(slug) ? styles.reviseTypeBtnActive : ''}`}
                  onClick={() => toggleReviseType(slug)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <label className={styles.fieldLabel}>Custom feedback (optional)</label>
            <textarea
              className={styles.reviseTextarea}
              value={reviseCustom}
              onChange={(e) => setReviseCustom(e.target.value)}
              placeholder="e.g., Also mention the UK market specifically..."
              rows={3}
            />

            <div className={styles.modalActions}>
              <Button variant="secondary" size="sm" onClick={() => setShowReviseModal(false)} disabled={reviseLoading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRevise}
                isLoading={reviseLoading}
                disabled={reviseTypes.size === 0 && !reviseCustom.trim()}
              >
                Request Revision
              </Button>
            </div>
          </div>
        </div>
      )}
    </HubPageLayout>
  );
}
