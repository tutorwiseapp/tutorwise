/**
 * Filename: apps/web/src/app/(admin)/admin/resources/components/ArticlesTable.tsx
 * Purpose: Resource articles table using HubDataTable pattern
 * Created: 2026-01-15
 * Pattern: Follows UsersTable pattern with 3-dot action menu
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig, BulkAction } from '@/app/components/hub/data';
import Link from 'next/link';
import StatusBadge from '@/app/components/admin/badges/StatusBadge';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
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
  status: 'published' | 'draft' | 'scheduled';
  views?: number;
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
};

export default function ArticlesTable() {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
      render: (article: Article) => (
        <StatusBadge
          variant={article.status === 'published' ? 'published' : article.status === 'draft' ? 'pending' : 'neutral'}
          label={article.status.charAt(0).toUpperCase() + article.status.slice(1)}
        />
      ),
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
      render: (article: Article) => (
        <VerticalDotsMenu
          actions={[
            {
              label: 'Edit Article',
              onClick: () => router.push(`/admin/resources/create?slug=${article.slug}`),
            },
            {
              label: article.status === 'published' ? 'Unpublish' : 'Publish',
              onClick: () => handleStatusToggle(article),
            },
            {
              label: 'Delete Article',
              onClick: () => handleDelete(article.id),
              variant: 'danger',
            },
          ]}
        />
      ),
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
  );
}
