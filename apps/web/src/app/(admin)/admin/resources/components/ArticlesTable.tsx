/**
 * Filename: apps/web/src/app/(admin)/admin/resources/components/ArticlesTable.tsx
 * Purpose: Resource articles table using HubDataTable pattern
 * Created: 2026-01-15
 * Pattern: Follows UsersTable pattern with 3-dot action menu
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HubDataTable } from '@/components/hub/data';
import type { Column, Filter, PaginationConfig, BulkAction } from '@/components/hub/data';
import Link from 'next/link';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import VerticalDotsMenu, { type MenuAction } from '@/components/ui/actions/VerticalDotsMenu';
import styles from './ArticlesTable.module.css';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryLabel: string;
  author: string;
  publishedAt: string;
  readTime: string;
  status: 'published' | 'draft' | 'scheduled' | 'revising';
  views?: number;
  revisionCount?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  'for-clients': '#dbeafe',
  'for-tutors': '#d1fae5',
  'for-agents': '#fce7f3',
  'for-organisations': '#e0e7ff',
  'getting-started': '#ccfbf1',
  'faqs': '#f3e8ff',
  'best-practices': '#fef9c3',
  'success-stories': '#fee2e2',
  'product-updates': '#dbeafe',
  'pricing-billing': '#fef3c7',
  'safety-trust': '#dcfce7',
  'education-insights': '#fef3c7',
  'content-marketing': '#fbcfe8',
  'about-tutorwise': '#bfdbfe',
  'company-news': '#e9d5ff',
  'thought-leadership': '#c7d2fe',
};

const REVISION_TYPE_LABELS: Record<string, string> = {
  friendlier_tone: 'Friendlier tone',
  more_professional: 'More professional',
  shorter: 'Shorter',
  more_depth: 'More depth',
  better_seo: 'Better SEO',
};

const MAX_REVISIONS = 3;

export default function ArticlesTable() {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviseModalArticle, setReviseModalArticle] = useState<Article | null>(null);
  const [reviseTypes, setReviseTypes] = useState<Set<string>>(new Set());
  const [reviseCustom, setReviseCustom] = useState('');
  const [reviseLoading, setReviseLoading] = useState(false);
  const [approveModalArticle, setApproveModalArticle] = useState<Article | null>(null);
  const [approveDate, setApproveDate] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  // Fetch articles from API
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/resources/articles');
      if (response.ok) {
        const data = await response.json();
        const mapped = (data.articles || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          category: a.category,
          categoryLabel: a.category?.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || '',
          author: a.author_name || 'Unknown',
          publishedAt: a.published_at || '',
          readTime: a.read_time ? `${a.read_time} min read` : '',
          status: a.status || 'draft',
          views: a.views || 0,
          revisionCount: a.revision_count || 0,
        }));
        setArticles(mapped);
      } else {
        console.error('Failed to fetch articles');
        setArticles([]);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/resources/articles/${articleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchArticles();
        setSelectedRows((prev) => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      } else {
        alert('Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Error deleting article');
    }
  };

  const handleStatusToggle = async (article: Article) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      const response = await fetch(`/api/admin/resources/articles/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchArticles();
      } else {
        alert(`Failed to ${newStatus === 'published' ? 'publish' : 'unpublish'} article`);
      }
    } catch (error) {
      console.error('Error updating article status:', error);
    }
  };

  const handleApprove = async (article: Article) => {
    setApproveModalArticle(article);
    setApproveDate('');
  };

  const submitApprove = async () => {
    if (!approveModalArticle) return;
    setApproveLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (approveDate) body.scheduled_for = new Date(approveDate).toISOString();

      const response = await fetch(
        `/api/admin/resources/articles/${approveModalArticle.id}/approve`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      if (response.ok) {
        setApproveModalArticle(null);
        fetchArticles();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve article');
      }
    } catch {
      alert('Error approving article');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRevise = (article: Article) => {
    setReviseModalArticle(article);
    setReviseTypes(new Set());
    setReviseCustom('');
  };

  const submitRevise = async () => {
    if (!reviseModalArticle) return;
    if (reviseTypes.size === 0 && !reviseCustom.trim()) {
      alert('Select at least one revision type or provide custom feedback');
      return;
    }
    setReviseLoading(true);
    try {
      const types = [...reviseTypes];
      if (reviseCustom.trim()) types.push('custom');
      const response = await fetch(
        `/api/admin/resources/articles/${reviseModalArticle.id}/revise`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ types, custom: reviseCustom.trim() || undefined }),
        }
      );
      if (response.ok) {
        setReviseModalArticle(null);
        fetchArticles();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to request revision');
      }
    } catch {
      alert('Error requesting revision');
    } finally {
      setReviseLoading(false);
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Define table columns
  const columns: Column<Article>[] = [
    {
      key: 'id',
      label: 'ID',
      width: '60px',
      sortable: false,
      render: (article: Article) => (
        <span className={styles.idCell}>#{article.id.slice(0, 6)}</span>
      ),
    },
    {
      key: 'publishedAt',
      label: 'Published',
      width: '120px',
      sortable: true,
      render: (article: Article) => (
        <span className={styles.dateCell}>{formatDate(article.publishedAt)}</span>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      width: 'auto',
      sortable: true,
      render: (article: Article) => {
        const isPublished = article.status === 'published';
        const href = isPublished
          ? `/resources/${article.slug}`
          : `/admin/resources/create?slug=${article.slug}`;

        return (
          <div className={styles.titleCell}>
            <Link
              href={href}
              className={styles.titleLink}
              {...(isPublished ? { target: '_blank' } : {})}
            >
              {article.title}
            </Link>
            {article.readTime && <div className={styles.readTime}>{article.readTime}</div>}
          </div>
        );
      },
    },
    {
      key: 'category',
      label: 'Category',
      width: '160px',
      sortable: true,
      render: (article: Article) => (
        <span
          className={styles.categoryBadge}
          style={{ backgroundColor: CATEGORY_COLORS[article.category] }}
        >
          {article.categoryLabel}
        </span>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      width: '180px',
      sortable: true,
      render: (article: Article) => <span className={styles.authorCell}>{article.author}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      sortable: true,
      render: (article: Article) => {
        const variant =
          article.status === 'published' ? 'published' :
          article.status === 'scheduled' ? 'neutral' :
          article.status === 'revising' ? 'warning' :
          'pending';
        const label = article.status === 'revising'
          ? `Revising (${article.revisionCount ?? 0}/${MAX_REVISIONS})`
          : article.status.charAt(0).toUpperCase() + article.status.slice(1);
        return <StatusBadge variant={variant} label={label} />;
      },
    },
    {
      key: 'views',
      label: 'Views',
      width: '80px',
      sortable: true,
      render: (article: Article) => (
        <span className={styles.viewsCell}>{article.views?.toLocaleString() || 0}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      sortable: false,
      render: (article: Article) => {
        const actions: MenuAction[] = [
          {
            label: 'Edit Article',
            onClick: () => router.push(`/admin/resources/create?slug=${article.slug}`),
          },
        ];
        if (article.status === 'draft') {
          actions.push({
            label: 'Approve',
            onClick: () => handleApprove(article),
          });
          if ((article.revisionCount ?? 0) < MAX_REVISIONS) {
            actions.push({
              label: 'Revise',
              onClick: () => handleRevise(article),
            });
          }
        }
        if (article.status === 'published' || article.status === 'draft') {
          actions.push({
            label: article.status === 'published' ? 'Unpublish' : 'Publish',
            onClick: () => handleStatusToggle(article),
          });
        }
        actions.push({
          label: 'Delete Article',
          onClick: () => handleDelete(article.id),
          variant: 'danger',
        });
        return <VerticalDotsMenu actions={actions} />;
      },
    },
  ];

  // Define filters
  const filters: Filter[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'revising', label: 'Revising' },
      ],
    },
    {
      key: 'category',
      label: 'Category',
      options: [
        { value: 'all', label: 'All Categories' },
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
        { value: 'thought-leadership', label: 'Thought Leadership' },
      ],
    },
    {
      key: 'author',
      label: 'Author',
      options: [
        { value: 'all', label: 'All Authors' },
      ],
    },
  ];

  // Define bulk actions
  const bulkActions: BulkAction[] = [
    {
      label: 'Publish',
      value: 'publish',
      onClick: async (ids: string[]) => {
        for (const id of ids) {
          await fetch(`/api/admin/resources/articles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'published' }),
          });
        }
        fetchArticles();
        setSelectedRows(new Set());
      },
    },
    {
      label: 'Unpublish',
      value: 'unpublish',
      onClick: async (ids: string[]) => {
        for (const id of ids) {
          await fetch(`/api/admin/resources/articles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'draft' }),
          });
        }
        fetchArticles();
        setSelectedRows(new Set());
      },
    },
    {
      label: 'Delete',
      value: 'delete',
      onClick: async (ids: string[]) => {
        if (confirm(`Delete ${ids.length} article(s)? This action cannot be undone.`)) {
          for (const id of ids) {
            await fetch(`/api/admin/resources/articles/${id}`, { method: 'DELETE' });
          }
          fetchArticles();
          setSelectedRows(new Set());
        }
      },
      variant: 'danger',
    },
  ];

  // Pagination config
  const pagination: PaginationConfig = {
    page,
    limit,
    total: articles.length,
    onPageChange: setPage,
    onLimitChange: (newLimit) => {
      setLimit(newLimit);
      setPage(1);
    },
    pageSizeOptions: [10, 20, 50, 100],
  };

  return (
    <>
      <HubDataTable
        columns={columns}
        data={articles}
        filters={filters}
        bulkActions={bulkActions}
        pagination={pagination}
        loading={loading}
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        getRowId={(article) => article.id}
        searchPlaceholder="Search articles by title..."
        onSearch={(query) => console.log('Search:', query)}
        onSort={(key, direction) => console.log('Sort:', key, direction)}
        onFilterChange={(key, value) => console.log('Filter:', key, value)}
        emptyMessage="No articles found"
      />

      {/* ── Approve Modal ─────────────────────────────────────────── */}
      {approveModalArticle && (
        <div className={styles.modalOverlay} onClick={() => setApproveModalArticle(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Approve Article</h3>
            <p className={styles.modalSubtitle}>{approveModalArticle.title}</p>

            <label className={styles.fieldLabel}>
              Schedule publish date (leave empty for immediate publish)
            </label>
            <input
              type="datetime-local"
              className={styles.dateInput}
              value={approveDate}
              onChange={(e) => setApproveDate(e.target.value)}
            />

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setApproveModalArticle(null)}
                disabled={approveLoading}
              >
                Cancel
              </button>
              <button
                className={styles.approveBtn}
                onClick={submitApprove}
                disabled={approveLoading}
              >
                {approveLoading ? 'Approving...' : approveDate ? 'Schedule' : 'Publish Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revise Modal ──────────────────────────────────────────── */}
      {reviseModalArticle && (
        <div className={styles.modalOverlay} onClick={() => setReviseModalArticle(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Request Revision</h3>
            <p className={styles.modalSubtitle}>
              {reviseModalArticle.title} — Round {(reviseModalArticle.revisionCount ?? 0) + 1}/{MAX_REVISIONS}
            </p>

            <label className={styles.fieldLabel}>Select revision type(s)</label>
            <div className={styles.reviseTypeGrid}>
              {Object.entries(REVISION_TYPE_LABELS).map(([slug, label]) => (
                <button
                  key={slug}
                  className={`${styles.reviseTypeBtn} ${reviseTypes.has(slug) ? styles.reviseTypeBtnActive : ''}`}
                  onClick={() => toggleReviseType(slug)}
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
              <button
                className={styles.cancelBtn}
                onClick={() => setReviseModalArticle(null)}
                disabled={reviseLoading}
              >
                Cancel
              </button>
              <button
                className={styles.reviseBtn}
                onClick={submitRevise}
                disabled={reviseLoading || (reviseTypes.size === 0 && !reviseCustom.trim())}
              >
                {reviseLoading ? 'Submitting...' : 'Request Revision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
