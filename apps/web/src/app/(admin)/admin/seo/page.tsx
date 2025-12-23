/*
 * Filename: src/app/(admin)/admin/seo/page.tsx
 * Purpose: SEO Hubs management page - main SEO landing page showing hubs table
 * Created: 2025-12-23
 * Updated: 2025-12-23 - Changed from overview page to hubs table (matches Financials pattern)
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
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface SeoHub {
  id: string;
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
  spoke_count?: number;
  view_count?: number;
}

export default function AdminSeoPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Permission checks
  const canCreate = usePermission('seo', 'create');
  const canUpdate = usePermission('seo', 'update');
  const canDelete = usePermission('seo', 'delete');
  const canPublish = usePermission('seo', 'publish');

  // Fetch SEO hubs
  const { data: hubs, isLoading } = useQuery({
    queryKey: ['admin', 'seo-hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_hubs')
        .select(`
          *,
          spoke_count:seo_spokes(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SeoHub[];
    },
  });

  // Filter and search hubs
  const filteredHubs = useMemo(() => {
    if (!hubs) return [];

    let filtered = hubs;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((hub) => hub.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (hub) =>
          hub.title.toLowerCase().includes(query) ||
          hub.slug.toLowerCase().includes(query) ||
          hub.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [hubs, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    if (!hubs) return { total: 0, published: 0, draft: 0, archived: 0 };

    return {
      total: hubs.length,
      published: hubs.filter((h) => h.status === 'published').length,
      draft: hubs.filter((h) => h.status === 'draft').length,
      archived: hubs.filter((h) => h.status === 'archived').length,
    };
  }, [hubs]);

  // Table columns
  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (hub: SeoHub) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{hub.title}</span>
          <span className="text-sm text-gray-500">/{hub.slug}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (hub: SeoHub) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            hub.status === 'published'
              ? 'bg-green-100 text-green-800'
              : hub.status === 'draft'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {hub.status.charAt(0).toUpperCase() + hub.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'spoke_count',
      label: 'Spokes',
      sortable: true,
      render: (hub: SeoHub) => <span className="text-gray-900">{hub.spoke_count || 0}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (hub: SeoHub) => (
        <span className="text-sm text-gray-500">
          {new Date(hub.created_at).toLocaleDateString('en-US', {
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
      render: (hub: SeoHub) => (
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
    { id: 'all', label: 'All Hubs', count: stats.total, active: statusFilter === 'all' },
    { id: 'published', label: 'Published', count: stats.published, active: statusFilter === 'published' },
    { id: 'draft', label: 'Drafts', count: stats.draft, active: statusFilter === 'draft' },
    { id: 'archived', label: 'Archived', count: stats.archived, active: statusFilter === 'archived' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Hubs"
          subtitle="Manage your hub-and-spoke SEO content strategy"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search hubs by title, slug, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
            </div>
          }
          actions={
            canCreate ? (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Hub
              </Button>
            ) : undefined
          }
        />
      }
      tabs={
        <HubTabs
          tabs={tabs}
          onTabChange={(tabId) => setStatusFilter(tabId as typeof statusFilter)}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="SEO Hubs Overview"
            stats={[
              { label: 'Total Hubs', value: stats.total },
              { label: 'Published', value: stats.published },
              { label: 'Drafts', value: stats.draft },
              { label: 'Archived', value: stats.archived },
            ]}
          />
          <AdminHelpWidget
            title="SEO Hubs Help"
            items={[
              { question: 'What are SEO Hubs?', answer: 'Hub pages are pillar content pages that serve as the main topic authority for a subject area.' },
              { question: 'How do I create a hub?', answer: 'Click the "Create Hub" button to start. Fill in the title, description, and SEO metadata.' },
              { question: 'Best practices?', answer: 'Keep titles under 60 characters, meta descriptions under 160 characters, and link to related spokes.' },
            ]}
          />
          <AdminTipWidget
            title="SEO Tips"
            tips={[
              'Use keyword-rich titles',
              'Internal link to spoke pages',
              'Update content regularly',
              'Monitor performance metrics',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Table */}
      <HubTable
        columns={columns}
        data={filteredHubs}
        isLoading={isLoading}
        emptyMessage="No SEO hubs found"
        emptyDescription="Create your first hub to start building your SEO content strategy."
      />
    </HubPageLayout>
  );
}
