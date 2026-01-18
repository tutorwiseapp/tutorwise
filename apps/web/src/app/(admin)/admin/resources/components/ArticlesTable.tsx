/**
 * Filename: apps/web/src/app/(admin)/admin/resources/components/ArticlesTable.tsx
 * Purpose: Resource articles table using HubDataTable pattern
 * Created: 2026-01-15
 * Pattern: Follows ListingsTable pattern with filters, search, and bulk actions
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig, BulkAction } from '@/app/components/hub/data';
import { FileText, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import StatusBadge from '@/app/components/admin/badges/StatusBadge';
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

const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: "Building a Successful Tutoring Business in 2026: The Complete Guide",
    slug: "building-successful-tutoring-business",
    category: "for-tutors",
    categoryLabel: "For Tutors",
    author: "James Chen",
    publishedAt: "2026-01-08",
    readTime: "15 min read",
    status: "published",
    views: 1243,
  },
  {
    id: '2',
    title: "How to Find the Perfect Tutor for Your Child: A Complete Guide for Parents",
    slug: "how-to-find-perfect-tutor",
    category: "for-clients",
    categoryLabel: "For Clients",
    author: "Sarah Thompson",
    publishedAt: "2026-01-10",
    readTime: "10 min read",
    status: "published",
    views: 2156,
  },
  {
    id: '3',
    title: "UK Tutoring Market 2026: Trends, Data & Growth Opportunities",
    slug: "uk-tutoring-market-2026",
    category: "education-insights",
    categoryLabel: "Education Insights",
    author: "Dr. Emily Roberts",
    publishedAt: "2026-01-05",
    readTime: "12 min read",
    status: "published",
    views: 3421,
  },
  {
    id: '4',
    title: "How to Price Your Tutoring Services: The Complete Pricing Guide for UK Tutors",
    slug: "how-to-price-tutoring-services",
    category: "for-tutors",
    categoryLabel: "For Tutors",
    author: "James Chen",
    publishedAt: "2025-12-20",
    readTime: "14 min read",
    status: "published",
    views: 1876,
  },
  {
    id: '5',
    title: "Growing Your Tutoring Agency: From Solo Tutor to Scalable Business",
    slug: "growing-tutoring-agency",
    category: "for-agents",
    categoryLabel: "For Agents",
    author: "Rachel Morrison",
    publishedAt: "2025-12-15",
    readTime: "16 min read",
    status: "published",
    views: 987,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  'for-clients': '#dbeafe',
  'for-tutors': '#d1fae5',
  'for-agents': '#fce7f3',
  'education-insights': '#fef3c7',
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
      // TODO: Create /api/admin/resources/articles endpoint
      // For now, use mock data
      setArticles(MOCK_ARTICLES);
      setLoading(false);

      // Uncomment when API is ready:
      // const response = await fetch('/api/admin/resources/articles');
      // if (response.ok) {
      //   const data = await response.json();
      //   setArticles(data.articles || []);
      // } else {
      //   console.error('Failed to fetch articles');
      //   setArticles(MOCK_ARTICLES); // Fallback to mock data
      // }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles(MOCK_ARTICLES); // Fallback to mock data
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
        // Refresh articles list
        fetchArticles();
        // Clear selection if deleted article was selected
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

  // Define table columns
  const columns: Column<Article>[] = [
    {
      key: 'id',
      label: 'ID',
      width: '80px',
      sortable: false,
      render: (article: Article) => <span className={styles.idCell}>#{article.id}</span>,
    },
    {
      key: 'publishedAt',
      label: 'Published',
      width: '120px',
      sortable: true,
      render: (article: Article) => (
        <span className={styles.dateCell}>
          {new Date(article.publishedAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      width: 'auto',
      sortable: true,
      render: (article: Article) => (
        <div className={styles.titleCell}>
          <Link href={`/resources/${article.slug}`} className={styles.titleLink} target="_blank">
            {article.title}
          </Link>
          <div className={styles.readTime}>{article.readTime}</div>
        </div>
      ),
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
      key: 'views',
      label: 'Views',
      width: '100px',
      sortable: true,
      render: (article: Article) => (
        <span className={styles.viewsCell}>{article.views?.toLocaleString() || 0}</span>
      ),
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
      key: 'actions',
      label: 'Actions',
      width: '180px',
      sortable: false,
      render: (article: Article) => (
        <div className={styles.actionsCell}>
          <button
            className={styles.actionButton}
            onClick={() => router.push(`/admin/resources/edit/${article.slug}`)}
            title="Edit article"
          >
            Edit
          </button>
          <button
            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
            onClick={() => handleDelete(article.id)}
            title="Delete article"
          >
            Delete
          </button>
        </div>
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
        { value: 'education-insights', label: 'Education Insights' },
        { value: 'company-news', label: 'Company News' },
      ],
    },
    {
      key: 'author',
      label: 'Author',
      options: [
        { value: 'all', label: 'All Authors' },
        { value: 'james-chen', label: 'James Chen' },
        { value: 'sarah-thompson', label: 'Sarah Thompson' },
        { value: 'emily-roberts', label: 'Dr. Emily Roberts' },
        { value: 'rachel-morrison', label: 'Rachel Morrison' },
      ],
    },
  ];

  // Define bulk actions
  const bulkActions: BulkAction[] = [
    {
      label: 'Unpublish',
      value: 'unpublish',
      onClick: async (ids: string[]) => {
        console.log('Unpublish articles:', ids);
        alert(`Unpublish ${ids.length} article(s) - Coming soon`);
      },
    },
    {
      label: 'Delete',
      value: 'delete',
      onClick: async (ids: string[]) => {
        if (confirm(`Delete ${ids.length} article(s)?`)) {
          console.log('Delete articles:', ids);
          alert(`Delete ${ids.length} article(s) - Coming soon`);
        }
      },
      variant: 'danger',
    },
  ];

  // Pagination config (matching BookingsTable pattern)
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
