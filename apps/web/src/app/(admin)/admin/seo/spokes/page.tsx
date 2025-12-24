/*
 * Filename: src/app/(admin)/admin/seo/spokes/page.tsx
 * Purpose: SEO Spokes management page for admins
 * Created: 2025-12-23
 * Phase: 1 - SEO Management
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubTable from '@/app/components/hub/tables/HubTable';
import { AdminHelpWidget, AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { Plus, Edit2, Trash2, Eye, Link as LinkIcon } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface SeoSpoke {
  id: string;
  hub_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  published_by: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  view_count?: number;
  hub?: {
    title: string;
    slug: string;
  };
}

export default function AdminSeoSpokesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Permission checks
  const canCreate = usePermission('seo', 'create');
  const canUpdate = usePermission('seo', 'update');
  const canDelete = usePermission('seo', 'delete');

  // Fetch SEO spokes
  const { data: spokes, isLoading } = useQuery({
    queryKey: ['admin', 'seo-spokes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_spokes')
        .select(`
          *,
          hub:seo_hubs!hub_id(title, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SeoSpoke[];
    },
  });

  // Filter and search spokes
  const filteredSpokes = useMemo(() => {
    if (!spokes) return [];

    let filtered = spokes;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((spoke) => spoke.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (spoke) =>
          spoke.title.toLowerCase().includes(query) ||
          spoke.slug.toLowerCase().includes(query) ||
          spoke.description?.toLowerCase().includes(query) ||
          spoke.hub?.title.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [spokes, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    if (!spokes) return { total: 0, published: 0, draft: 0, archived: 0 };

    return {
      total: spokes.length,
      published: spokes.filter((s) => s.status === 'published').length,
      draft: spokes.filter((s) => s.status === 'draft').length,
      archived: spokes.filter((s) => s.status === 'archived').length,
    };
  }, [spokes]);

  // Table columns
  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (spoke: SeoSpoke) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{spoke.title}</span>
          <span className="text-sm text-gray-500">/{spoke.slug}</span>
        </div>
      ),
    },
    {
      key: 'hub',
      label: 'Parent Hub',
      sortable: true,
      render: (spoke: SeoSpoke) => (
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-900">{spoke.hub?.title || 'Orphaned'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (spoke: SeoSpoke) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            spoke.status === 'published'
              ? 'bg-green-100 text-green-800'
              : spoke.status === 'draft'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {spoke.status.charAt(0).toUpperCase() + spoke.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (spoke: SeoSpoke) => (
        <span className="text-sm text-gray-500">
          {new Date(spoke.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (spoke: SeoSpoke) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" title="View">
            <Eye className="h-4 w-4" />
          </Button>
          {canUpdate && (
            <Button variant="ghost" size="sm" title="Edit">
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" title="Delete">
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Tabs configuration
  const tabs = [
    { id: 'all', label: 'All Spokes', count: stats.total, active: statusFilter === 'all' },
    { id: 'published', label: 'Published', count: stats.published, active: statusFilter === 'published' },
    { id: 'draft', label: 'Drafts', count: stats.draft, active: statusFilter === 'draft' },
    { id: 'archived', label: 'Archived', count: stats.archived, active: statusFilter === 'archived' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Spokes"
          subtitle="Manage spoke pages that support your hub content"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search spokes by title, slug, description, or hub..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
            </div>
          }
          actions={
            canCreate ? (
              <Button>
                <Plus className={styles.buttonIcon} />
                Create Spoke
              </Button>
            ) : undefined
          }
          className={styles.spokesHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={tabs}
          onTabChange={(tabId) => setStatusFilter(tabId as typeof statusFilter)}
          className={styles.spokesTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="SEO Spokes Overview"
            stats={[
              { label: 'Total Spokes', value: stats.total },
              { label: 'Published', value: stats.published },
              { label: 'Drafts', value: stats.draft },
              { label: 'Archived', value: stats.archived },
            ]}
          />
          <AdminHelpWidget
            title="SEO Spokes Help"
            items={[
              { question: 'What are SEO Spokes?', answer: 'Spoke pages are supporting content pages that dive deep into specific subtopics of a hub page.' },
              { question: 'How do spokes work?', answer: 'Each spoke links back to its parent hub and to related spokes, creating a strong internal linking structure.' },
              { question: 'Best practices?', answer: 'Focus on long-tail keywords, provide detailed answers, and always link back to the parent hub.' },
            ]}
          />
          <AdminTipWidget
            title="Content Tips"
            tips={[
              'Target long-tail keywords',
              'Link to parent hub',
              'Cross-link related spokes',
              'Answer specific questions',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Table */}
      <HubTable
        columns={columns}
        data={filteredSpokes}
        isLoading={isLoading}
        emptyMessage="No SEO spokes found"
        emptyDescription="Create your first spoke to support your hub content."
      />
    </HubPageLayout>
  );
}
