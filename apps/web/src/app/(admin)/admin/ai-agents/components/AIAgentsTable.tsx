/**
 * Filename: AIAgentsTable.tsx
 * Purpose: AI Tutors-specific instance of HubDataTable
 * Created: 2026-02-24
 * Pattern: Mirrors ListingsTable structure for AI tutor management
 *
 * Features:
 * - 10 columns optimized for admin AI tutor management
 * - Universal column order: ID → Created → Name → Owner → Subject → Status → Sessions → Revenue → Rating → Actions
 * - Status, subject, ownership, subscription filters
 * - CSV export functionality
 * - Mobile fallback to custom card component
 * - Server-side pagination (20 per page)
 * - Real-time updates (30s auto-refresh)
 * - Bulk actions (delete, publish, unpublish)
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig, BulkAction } from '@/app/components/hub/data';
import AdminAIAgentDetailModal from './AdminAIAgentDetailModal';
import { Bot, Activity, DollarSign } from 'lucide-react';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import styles from './AIAgentsTable.module.css';
import StatusBadge from '@/app/components/admin/badges/StatusBadge';
import { exportToCSV, CSVFormatters, type CSVColumn } from '@/lib/utils/exportToCSV';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';

interface AITutor {
  id: string;
  name: string;
  display_name: string;
  subject: string;
  description: string;
  status: string;
  subscription_status: string;
  price_per_hour: number;
  total_sessions: number;
  total_revenue: number;
  avg_rating: number | null;
  total_reviews: number;
  created_at: string;
  published_at: string | null;
  is_platform_owned?: boolean;
  owner?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

// Helper function to map AI tutor status to StatusBadge variant
function getAIAgentStatusVariant(status: string) {
  const statusLower = status?.toLowerCase();
  if (statusLower === 'published') return 'published' as const;
  if (statusLower === 'draft') return 'pending' as const;
  if (statusLower === 'unpublished') return 'removed' as const;
  if (statusLower === 'suspended') return 'removed' as const;
  return 'neutral' as const;
}

export default function AIAgentsTable() {
  const supabase = createClient();

  // Table state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Modal state
  const [selectedAIAgent, setSelectedAIAgent] = useState<AITutor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch AI tutors data with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'admin-ai-agents',
      page,
      limit,
      sortKey,
      sortDirection,
      searchQuery,
      statusFilter,
      subjectFilter,
      ownershipFilter,
      subscriptionFilter,
    ],
    queryFn: async () => {
      // Fetch AI tutors first (without join to avoid schema cache issues)
      let query = supabase
        .from('ai_agents')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchQuery) {
        query = query.or(`display_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`);
      }

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply subject filter
      if (subjectFilter && subjectFilter !== 'all') {
        query = query.eq('subject', subjectFilter);
      }

      // Apply ownership filter
      if (ownershipFilter && ownershipFilter !== 'all') {
        const isPlatform = ownershipFilter === 'platform';
        query = query.eq('is_platform_owned', isPlatform);
      }

      // Apply subscription filter
      if (subscriptionFilter && subscriptionFilter !== 'all') {
        query = query.eq('subscription_status', subscriptionFilter);
      }

      // Apply sorting
      query = query.order(sortKey, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      // Fetch owner data separately (to avoid schema cache issues)
      const aiAgents = data || [];
      const ownerIds = [...new Set(aiAgents.map(t => t.owner_id).filter(Boolean))];

      let ownersMap = new Map();
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', ownerIds);

        if (owners) {
          ownersMap = new Map(owners.map(o => [o.id, o]));
        }
      }

      // Attach owner data to each AI tutor
      const aiAgentsWithOwners = aiAgents.map(tutor => ({
        ...tutor,
        owner: ownersMap.get(tutor.owner_id) || null,
      }));

      return {
        aiAgents: aiAgentsWithOwners as AITutor[],
        total: count || 0,
      };
    },
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Handle row click
  const handleRowClick = (aiTutor: AITutor) => {
    setSelectedAIAgent(aiTutor);
    setIsModalOpen(true);
  };

  // Handle AI tutor updated (callback from modal)
  const handleAIAgentUpdated = () => {
    refetch();
  };

  // Handle filter changes
  const handleFilterChange = (filterKey: string, value: string | string[]) => {
    const stringValue = Array.isArray(value) ? value[0] || '' : value;

    switch (filterKey) {
      case 'status':
        setStatusFilter(stringValue);
        break;
      case 'subject':
        setSubjectFilter(stringValue);
        break;
      case 'ownership':
        setOwnershipFilter(stringValue);
        break;
      case 'subscription':
        setSubscriptionFilter(stringValue);
        break;
    }
    setPage(1); // Reset to first page
  };

  // Handle export to CSV
  const handleExport = () => {
    if (!data?.aiAgents) return;

    const columns: CSVColumn<AITutor>[] = [
      { key: 'id', header: 'ID', format: (value) => formatIdForDisplay(value as string) },
      { key: 'created_at', header: 'Created', format: CSVFormatters.date },
      { key: 'display_name', header: 'Name' },
      { key: 'owner', header: 'Owner', format: (value: any) => value?.full_name || value?.email || 'Platform' },
      { key: 'subject', header: 'Subject' },
      { key: 'status', header: 'Status' },
      { key: 'subscription_status', header: 'Subscription' },
      { key: 'total_sessions', header: 'Sessions', format: (value) => String(value || 0) },
      { key: 'total_revenue', header: 'Revenue (£)', format: (value) => CSVFormatters.currency(value as number) },
      { key: 'avg_rating', header: 'Rating', format: (value) => value ? String(value) : 'N/A' },
    ];

    exportToCSV(data.aiAgents, columns, 'ai-agents');
  };

  // Define columns
  const columns: Column<AITutor>[] = [
    // Column 1: ID
    {
      key: 'id',
      label: 'ID',
      width: '100px',
      sortable: true,
      render: (aiTutor) => (
        <div className={styles.idCell}>
          <span className={styles.idText} title={aiTutor.id}>
            {formatIdForDisplay(aiTutor.id)}
          </span>
        </div>
      ),
    },
    // Column 2: Date
    {
      key: 'created_at',
      label: 'Created',
      width: '140px',
      sortable: true,
      render: (aiTutor) => (
        <span className={styles.dateValue}>
          {new Date(aiTutor.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    // Column 3: Name (primary identifier)
    {
      key: 'display_name',
      label: 'Name',
      width: '200px',
      sortable: true,
      render: (aiTutor) => (
        <div className={styles.nameCell}>
          <div className={styles.nameContent}>
            <span className={styles.nameText}>{aiTutor.display_name}</span>
            {aiTutor.is_platform_owned && (
              <span className={styles.platformBadge}>Platform</span>
            )}
            <span className={styles.slugText}>/{aiTutor.name}</span>
          </div>
        </div>
      ),
    },
    // Column 4: Owner
    {
      key: 'owner',
      label: 'Owner',
      width: '180px',
      render: (aiTutor) => (
        <div className={styles.ownerCell}>
          {aiTutor.is_platform_owned ? (
            <span className={styles.platformOwner}>
              <Bot size={16} className={styles.platformIcon} />
              Platform
            </span>
          ) : (
            <>
              {aiTutor.owner?.avatar_url && (
                <img
                  src={aiTutor.owner.avatar_url}
                  alt={aiTutor.owner.full_name || 'Owner'}
                  className={styles.ownerAvatar}
                />
              )}
              <div className={styles.ownerInfo}>
                <span className={styles.ownerName}>
                  {aiTutor.owner?.full_name || aiTutor.owner?.email || 'Unknown'}
                </span>
              </div>
            </>
          )}
        </div>
      ),
    },
    // Column 5: Subject
    {
      key: 'subject',
      label: 'Subject',
      width: '120px',
      sortable: true,
      render: (aiTutor) => (
        <span className={styles.subjectBadge}>{aiTutor.subject}</span>
      ),
    },
    // Column 6: Status
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      sortable: true,
      render: (aiTutor) => (
        <StatusBadge variant={getAIAgentStatusVariant(aiTutor.status)} label={aiTutor.status} />
      ),
    },
    // Column 7: Sessions
    {
      key: 'total_sessions',
      label: 'Sessions',
      width: '100px',
      sortable: true,
      render: (aiTutor) => (
        <span className={styles.metricValue}>{aiTutor.total_sessions || 0}</span>
      ),
    },
    // Column 8: Revenue
    {
      key: 'total_revenue',
      label: 'Revenue',
      width: '100px',
      sortable: true,
      render: (aiTutor) => (
        <span className={styles.revenueValue}>£{(aiTutor.total_revenue || 0).toFixed(0)}</span>
      ),
    },
    // Column 9: Rating
    {
      key: 'avg_rating',
      label: 'Rating',
      width: '100px',
      sortable: true,
      render: (aiTutor) => (
        <span className={styles.ratingValue}>
          {aiTutor.avg_rating ? `${aiTutor.avg_rating.toFixed(1)}/5` : 'N/A'}
        </span>
      ),
    },
    // Column 10: Priority (Phase 2A)
    {
      key: 'priority_rank',
      label: 'Priority',
      width: '100px',
      sortable: true,
      render: (aiTutor) => <PriorityCell tutor={aiTutor} onUpdate={refetch} />,
    },
    // Column 11: Actions
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (aiTutor) => (
        <VerticalDotsMenu
          actions={[
            { label: 'View Details', onClick: () => handleRowClick(aiTutor) },
            {
              label: aiTutor.status === 'published' ? 'Unpublish' : 'Publish',
              onClick: async () => {
                const newStatus = aiTutor.status === 'published' ? 'unpublished' : 'published';
                const { error } = await supabase
                  .from('ai_agents')
                  .update({
                    status: newStatus,
                    published_at: newStatus === 'published' ? new Date().toISOString() : null
                  })
                  .eq('id', aiTutor.id);

                if (error) {
                  alert('Failed to update status');
                } else {
                  refetch();
                }
              },
            },
            {
              label: 'Delete',
              variant: 'danger' as const,
              onClick: async () => {
                if (confirm('Delete this AI tutor? This action cannot be undone.')) {
                  const { error } = await supabase.from('ai_agents').delete().eq('id', aiTutor.id);
                  if (error) {
                    alert('Failed to delete AI tutor');
                  } else {
                    alert('AI tutor deleted successfully');
                    refetch();
                  }
                }
              },
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
      label: 'All Statuses',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
        { value: 'unpublished', label: 'Unpublished' },
        { value: 'suspended', label: 'Suspended' },
      ],
    },
    {
      key: 'subject',
      label: 'All Subjects',
      options: [
        { value: 'maths', label: 'Maths' },
        { value: 'english', label: 'English' },
        { value: 'science', label: 'Science' },
        { value: 'biology', label: 'Biology' },
        { value: 'chemistry', label: 'Chemistry' },
        { value: 'physics', label: 'Physics' },
        { value: 'computing', label: 'Computing' },
        { value: 'history', label: 'History' },
        { value: 'geography', label: 'Geography' },
        { value: 'languages', label: 'Languages' },
        { value: 'business', label: 'Business' },
        { value: 'economics', label: 'Economics' },
        { value: 'psychology', label: 'Psychology' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      key: 'ownership',
      label: 'All Ownership',
      options: [
        { value: 'platform', label: 'Platform-Owned' },
        { value: 'user', label: 'User-Created' },
      ],
    },
    {
      key: 'subscription',
      label: 'All Subscriptions',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'past_due', label: 'Past Due' },
        { value: 'canceled', label: 'Canceled' },
      ],
    },
  ];

  // Define bulk actions
  const bulkActions: BulkAction[] = [
    {
      value: 'publish',
      label: 'Publish',
      variant: 'primary',
      onClick: async (selectedIds: string[]) => {
        if (!confirm(`Publish ${selectedIds.length} AI tutor(s)?`)) return;

        const { error } = await supabase
          .from('ai_agents')
          .update({
            status: 'published',
            published_at: new Date().toISOString()
          })
          .in('id', selectedIds);

        if (error) {
          alert('Failed to publish AI tutors');
        } else {
          alert(`${selectedIds.length} AI tutor(s) published successfully`);
          refetch();
          setSelectedRows(new Set());
        }
      },
    },
    {
      value: 'unpublish',
      label: 'Unpublish',
      variant: 'secondary',
      onClick: async (selectedIds: string[]) => {
        if (!confirm(`Unpublish ${selectedIds.length} AI tutor(s)?`)) return;

        const { error } = await supabase
          .from('ai_agents')
          .update({ status: 'unpublished' })
          .in('id', selectedIds);

        if (error) {
          alert('Failed to unpublish AI tutors');
        } else {
          alert(`${selectedIds.length} AI tutor(s) unpublished successfully`);
          refetch();
          setSelectedRows(new Set());
        }
      },
    },
    {
      value: 'delete',
      label: 'Delete',
      variant: 'danger',
      onClick: async (selectedIds: string[]) => {
        if (!confirm(`Delete ${selectedIds.length} AI tutor(s)? This action cannot be undone.`)) return;

        const { error } = await supabase
          .from('ai_agents')
          .delete()
          .in('id', selectedIds);

        if (error) {
          alert('Failed to delete AI tutors');
        } else {
          alert(`${selectedIds.length} AI tutor(s) deleted successfully`);
          refetch();
          setSelectedRows(new Set());
        }
      },
    },
  ];

  // Mobile card render function
  const mobileCard = (aiTutor: AITutor) => (
    <div className={styles.mobileCard} onClick={() => handleRowClick(aiTutor)}>
      <div className={styles.mobileCardHeader}>
        <div className={styles.mobileCardTitle}>
          <h3>{aiTutor.display_name}</h3>
          {aiTutor.is_platform_owned && <span className={styles.platformBadge}>⭐</span>}
          <StatusBadge variant={getAIAgentStatusVariant(aiTutor.status)} label={aiTutor.status} />
        </div>
        <div className={styles.mobileCardSubtitle}>
          <span>#{aiTutor.id.slice(0, 8)}</span>
        </div>
      </div>

      <div className={styles.mobileCardBody}>
        <div className={styles.mobileCardRow}>
          <span className={styles.mobileCardLabel}>Owner:</span>
          <span className={styles.mobileCardValue}>
            {aiTutor.is_platform_owned ? 'Platform' : aiTutor.owner?.full_name || aiTutor.owner?.email || 'Unknown'}
          </span>
        </div>

        <div className={styles.mobileCardRow}>
          <span className={styles.mobileCardLabel}>Subject:</span>
          <span className={styles.subjectBadge}>{aiTutor.subject}</span>
        </div>

        <div className={styles.mobileCardMetrics}>
          <div className={styles.metricItem}>
            <Activity className={styles.metricIcon} />
            <span>{aiTutor.total_sessions || 0} sessions</span>
          </div>
          <div className={styles.metricItem}>
            <DollarSign className={styles.metricIcon} />
            <span>£{(aiTutor.total_revenue || 0).toFixed(0)}</span>
          </div>
        </div>

        <div className={styles.mobileCardRow}>
          <span className={styles.mobileCardLabel}>Created:</span>
          <span className={styles.dateValue}>
            {new Date(aiTutor.created_at).toLocaleDateString('en-GB')}
          </span>
        </div>
      </div>
    </div>
  );

  // Pagination config
  const paginationConfig: PaginationConfig = {
    page,
    limit,
    total: data?.total || 0,
    onPageChange: setPage,
    onLimitChange: setLimit,
  };

  return (
    <>
      {/* Data Table */}
      <HubDataTable
        columns={columns}
        data={data?.aiAgents || []}
        loading={isLoading}
        error={error?.message}
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onRowClick={handleRowClick}
        pagination={paginationConfig}
        filters={filters}
        onSearch={setSearchQuery}
        onFilterChange={handleFilterChange}
        onSort={(key, direction) => {
          setSortKey(key);
          setSortDirection(direction);
        }}
        bulkActions={bulkActions}
        autoRefreshInterval={ADMIN_TABLE_DEFAULTS.REFRESH_FAST}
        onRefresh={() => refetch()}
        onExport={handleExport}
        enableSavedViews={true}
        savedViewsKey="admin-ai-agents-views"
        searchPlaceholder="Search by name, description..."
        emptyMessage="No AI tutors found"
        mobileCard={mobileCard}
      />

      {/* Detail Modal */}
      <AdminAIAgentDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAIAgent(null);
        }}
        aiTutor={selectedAIAgent}
        onAIAgentUpdated={handleAIAgentUpdated}
      />
    </>
  );
}

// PriorityCell Component - Inline editable priority field (Phase 2A)
interface PriorityCellProps {
  tutor: any; // AITutor type
  onUpdate: () => void;
}

function PriorityCell({ tutor, onUpdate }: PriorityCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(tutor.priority_rank || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (value === tutor.priority_rank) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/ai-agents/${tutor.id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority_rank: value }),
      });

      if (!response.ok) throw new Error('Failed to update priority');

      onUpdate(); // Refresh table
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating priority:', error);
      setValue(tutor.priority_rank || 0); // Revert on error
      alert('Failed to update priority');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(tutor.priority_rank || 0);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className={styles.priorityEdit}>
        <input
          type="number"
          min="0"
          max="1000"
          value={value}
          onChange={(e) => setValue(parseInt(e.target.value) || 0)}
          onKeyDown={handleKeyDown}
          className={styles.priorityInput}
          disabled={isSaving}
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={styles.saveBtn}
          title="Save"
        >
          {isSaving ? '...' : '✓'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className={styles.cancelBtn}
          title="Cancel"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      className={styles.priorityDisplay}
      onClick={() => setIsEditing(true)}
      title="Click to edit priority (higher = appears first)"
    >
      {tutor.priority_rank > 0 ? (
        <span className={styles.priorityBadge}>{tutor.priority_rank}</span>
      ) : (
        <span className={styles.priorityDefault}>0</span>
      )}
    </div>
  );
}
