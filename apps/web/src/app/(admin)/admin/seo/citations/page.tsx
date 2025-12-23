/*
 * Filename: src/app/(admin)/admin/seo/citations/page.tsx
 * Purpose: SEO Citations (backlinks) management page for admins
 * Created: 2025-12-23
 * Phase: 1 - SEO Management
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubTable from '@/app/components/hub/tables/HubTable';
import { AdminHelpWidget, AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { Plus, Edit2, Trash2, ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface SeoCitation {
  id: string;
  source_url: string;
  source_domain: string;
  target_url: string;
  anchor_text: string | null;
  citation_type: 'backlink' | 'mention' | 'review' | 'directory';
  status: 'active' | 'broken' | 'removed' | 'pending';
  domain_authority: number | null;
  discovered_at: string;
  last_checked_at: string | null;
  notes: string | null;
}

export default function AdminSeoCitationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'broken' | 'removed' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'backlink' | 'mention' | 'review' | 'directory'>('all');
  const supabase = createClient();

  // Permission checks
  const canCreate = usePermission('seo', 'create');
  const canUpdate = usePermission('seo', 'update');
  const canDelete = usePermission('seo', 'delete');

  // Mock data for now (replace with actual query when table exists)
  const { data: citations, isLoading } = useQuery({
    queryKey: ['admin', 'seo-citations'],
    queryFn: async () => {
      // TODO: Replace with actual database query when seo_citations table exists
      const mockData: SeoCitation[] = [
        {
          id: '1',
          source_url: 'https://example.com/article',
          source_domain: 'example.com',
          target_url: 'https://tutorwise.io/tutors',
          anchor_text: 'find tutors online',
          citation_type: 'backlink',
          status: 'active',
          domain_authority: 65,
          discovered_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
          notes: 'High-quality educational blog',
        },
        {
          id: '2',
          source_url: 'https://techcrunch.com/mention',
          source_domain: 'techcrunch.com',
          target_url: 'https://tutorwise.io',
          anchor_text: 'TutorWise',
          citation_type: 'mention',
          status: 'active',
          domain_authority: 92,
          discovered_at: new Date(Date.now() - 86400000).toISOString(),
          last_checked_at: new Date().toISOString(),
          notes: 'Media coverage',
        },
      ];
      return mockData;
    },
  });

  // Filter citations
  const filteredCitations = useMemo(() => {
    if (!citations) return [];

    let filtered = citations;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((c) => c.citation_type === typeFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.source_domain.toLowerCase().includes(query) ||
          c.source_url.toLowerCase().includes(query) ||
          c.anchor_text?.toLowerCase().includes(query) ||
          c.target_url.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [citations, statusFilter, typeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    if (!citations) return { total: 0, active: 0, broken: 0, pending: 0, avgDA: 0 };

    const active = citations.filter((c) => c.status === 'active');
    const avgDA = active.length > 0
      ? Math.round(active.reduce((sum, c) => sum + (c.domain_authority || 0), 0) / active.length)
      : 0;

    return {
      total: citations.length,
      active: active.length,
      broken: citations.filter((c) => c.status === 'broken').length,
      pending: citations.filter((c) => c.status === 'pending').length,
      avgDA,
    };
  }, [citations]);

  // Table columns
  const columns = [
    {
      key: 'source_domain',
      label: 'Source',
      sortable: true,
      render: (citation: SeoCitation) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{citation.source_domain}</span>
          <a
            href={citation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ),
    },
    {
      key: 'anchor_text',
      label: 'Anchor Text',
      sortable: true,
      render: (citation: SeoCitation) => (
        <span className="text-sm text-gray-700">{citation.anchor_text || '—'}</span>
      ),
    },
    {
      key: 'citation_type',
      label: 'Type',
      sortable: true,
      render: (citation: SeoCitation) => (
        <span className="text-sm text-gray-900 capitalize">{citation.citation_type}</span>
      ),
    },
    {
      key: 'domain_authority',
      label: 'DA',
      sortable: true,
      render: (citation: SeoCitation) => (
        <span
          className={`font-medium ${
            (citation.domain_authority || 0) >= 70
              ? 'text-green-600'
              : (citation.domain_authority || 0) >= 40
              ? 'text-yellow-600'
              : 'text-gray-600'
          }`}
        >
          {citation.domain_authority || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (citation: SeoCitation) => {
        const statusConfig = {
          active: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
          broken: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
          pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          removed: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100' },
        };
        const config = statusConfig[citation.status];
        const Icon = config.icon;

        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            <Icon className="h-3 w-3" />
            {citation.status.charAt(0).toUpperCase() + citation.status.slice(1)}
          </span>
        );
      },
    },
    {
      key: 'discovered_at',
      label: 'Discovered',
      sortable: true,
      render: (citation: SeoCitation) => (
        <span className="text-sm text-gray-500">
          {new Date(citation.discovered_at).toLocaleDateString('en-US', {
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
      render: (citation: SeoCitation) => (
        <div className="flex items-center gap-2">
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
    { id: 'all', label: 'All Citations', count: stats.total, active: statusFilter === 'all' },
    { id: 'active', label: 'Active', count: stats.active, active: statusFilter === 'active' },
    { id: 'broken', label: 'Broken', count: stats.broken, active: statusFilter === 'broken' },
    { id: 'pending', label: 'Pending', count: stats.pending, active: statusFilter === 'pending' },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Citations"
          subtitle="Track and manage external backlinks and mentions"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search citations by domain, URL, or anchor text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className={filterStyles.filterSelect}
              >
                <option value="all">All Types</option>
                <option value="backlink">Backlinks</option>
                <option value="mention">Mentions</option>
                <option value="review">Reviews</option>
                <option value="directory">Directories</option>
              </select>
            </div>
          }
          actions={
            canCreate ? (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Citation
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
            title="Citations Overview"
            stats={[
              { label: 'Total Citations', value: stats.total },
              { label: 'Active Links', value: stats.active },
              { label: 'Avg Domain Authority', value: stats.avgDA },
              { label: 'Broken Links', value: stats.broken },
            ]}
          />
          <AdminHelpWidget
            title="Citations Help"
            items={[
              { question: 'What are citations?', answer: 'Citations are external websites that link to or mention your content. They\'re crucial for SEO and domain authority.' },
              { question: 'What is Domain Authority?', answer: 'Domain Authority (DA) is a score from 0-100 that predicts how well a website will rank on search engines. Higher is better.' },
              { question: 'How to get more citations?', answer: 'Create high-quality content, engage with industry publications, and build relationships with other websites in your niche.' },
            ]}
          />
          <AdminTipWidget
            title="Citation Tips"
            tips={[
              'Monitor broken links regularly',
              'Focus on high-DA sources',
              'Diversify anchor text',
              'Build relationships for natural links',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Table */}
      <HubTable
        columns={columns}
        data={filteredCitations}
        isLoading={isLoading}
        emptyMessage="No citations found"
        emptyDescription="Add your first citation to start tracking backlinks and mentions."
      />
    </HubPageLayout>
  );
}
