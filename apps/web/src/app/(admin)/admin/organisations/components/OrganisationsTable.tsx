/**
 * Filename: OrganisationsTable.tsx
 * Purpose: Admin organisations data table with filtering, sorting, and bulk actions
 * Created: 2025-12-27
 * Pattern: Follows ReferralsTable/ListingsTable/BookingsTable structure
 * Applies: All 12 critical lessons from referrals implementation
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column } from '@/app/components/hub/data';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { MoreVertical } from 'lucide-react';
import AdminOrganisationDetailModal from './AdminOrganisationDetailModal';
import AdvancedFiltersDrawer, { type AdvancedFilters } from './AdvancedFiltersDrawer';
import styles from './OrganisationsTable.module.css';

// Organisation interface (from connection_groups)
interface Organisation {
  id: string;
  profile_id: string;
  name: string;
  slug: string | null;
  type: 'personal' | 'organisation';
  avatar_url: string | null;
  description: string | null;
  website: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  // Joined data
  owner?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export default function OrganisationsTable() {
  const supabase = createClient();

  // State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedOrganisation, setSelectedOrganisation] = useState<Organisation | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    hasWebsite: false,
    hasContact: false,
    createdAfter: '',
    createdBefore: '',
  });
  const [actionsMenuOpen, setActionsMenuOpen] = useState<string | null>(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Fetch organisations
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'admin-organisations',
      page,
      limit,
      sortKey,
      sortDirection,
      searchQuery,
      advancedFilters,
    ],
    queryFn: async () => {
      let query = supabase
        .from('connection_groups')
        .select(
          `
          *,
          owner:profile_id(id, full_name, email, avatar_url)
        `,
          { count: 'exact' }
        )
        .eq('type', 'organisation'); // Only fetch organisations, not personal groups

      // Apply search filter
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,contact_email.ilike.%${searchQuery}%`);
      }

      // Apply advanced filters
      if (advancedFilters.minMembers !== undefined && advancedFilters.minMembers > 0) {
        query = query.gte('member_count', advancedFilters.minMembers);
      }
      if (advancedFilters.maxMembers !== undefined && advancedFilters.maxMembers > 0) {
        query = query.lte('member_count', advancedFilters.maxMembers);
      }
      if (advancedFilters.hasWebsite) {
        query = query.not('website', 'is', null);
      }
      if (advancedFilters.hasContact) {
        query = query.not('contact_email', 'is', null);
      }
      if (advancedFilters.createdAfter) {
        query = query.gte('created_at', advancedFilters.createdAfter);
      }
      if (advancedFilters.createdBefore) {
        query = query.lte('created_at', advancedFilters.createdBefore);
      }

      // Apply sorting
      query = query.order(sortKey, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      // Flatten foreign key arrays (Supabase returns arrays for single joins)
      const organisations = (data || []).map((item: any) => ({
        ...item,
        owner: Array.isArray(item.owner) ? item.owner[0] : item.owner,
      })) as Organisation[];

      return {
        organisations,
        total: count || 0,
      };
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  const organisations = data?.organisations || [];
  const total = data?.total || 0;

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Handle row click
  const handleRowClick = (org: Organisation) => {
    setSelectedOrganisation(org);
  };

  // Handle export
  const handleExport = () => {
    console.log('Export organisations');
    // TODO: Implement CSV export
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Close actions menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.actionsMenu') && !target.closest(`.${styles.actionsButton}`)) {
        setActionsMenuOpen(null);
        setActionsMenuPosition(null);
      }
    };

    if (actionsMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionsMenuOpen]);

  // Columns following Universal Column Order: ID → Date → Service → Domain → Actions
  const columns: Column<Organisation>[] = [
    {
      key: 'id',
      label: 'ID',
      width: '100px',
      sortable: true,
      render: (org) => (
        <span className={styles.idCell}>
          {formatIdForDisplay(org.id)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '140px',
      sortable: true,
      render: (org) => (
        <span className={styles.dateCell}>
          {formatDate(org.created_at)}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Organisation',
      width: '250px',
      sortable: true,
      render: (org) => (
        <div className={styles.orgNameCell}>
          {org.avatar_url && (
            <img
              src={org.avatar_url}
              alt={org.name}
              className={styles.avatar}
            />
          )}
          <div className={styles.orgName}>{org.name}</div>
        </div>
      ),
    },
    {
      key: 'owner',
      label: 'Owner',
      width: '150px',
      sortable: false,
      render: (org) => org.owner ? (
        <span className={styles.ownerName}>{org.owner.full_name || 'Unknown'}</span>
      ) : (
        <span className={styles.emptyCell}>N/A</span>
      ),
    },
    {
      key: 'member_count',
      label: 'Members',
      width: '100px',
      sortable: true,
      render: (org) => (
        <span className={styles.memberCount}>
          {org.member_count}
        </span>
      ),
    },
    {
      key: 'client_count',
      label: 'Client',
      width: '100px',
      sortable: false,
      render: (org) => (
        <span className={styles.clientCount}>
          —
        </span>
      ),
    },
    {
      key: 'website',
      label: 'Website',
      width: '180px',
      sortable: false,
      render: (org) => org.website ? (
        <a
          href={org.website}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.websiteLink}
          onClick={(e) => e.stopPropagation()}
        >
          {org.website.replace(/^https?:\/\//, '')}
        </a>
      ) : (
        <span className={styles.emptyCell}>—</span>
      ),
    },
    {
      key: 'contact_email',
      label: 'Contact Email',
      width: '200px',
      sortable: false,
      render: (org) => org.contact_email ? (
        <span className={styles.contactEmail}>{org.contact_email}</span>
      ) : (
        <span className={styles.emptyCell}>—</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      sortable: false,
      render: (org) => (
        <div className={styles.actionsCell}>
          <button
            className={`${styles.actionsButton} ${actionsMenuOpen === org.id ? styles.actionsButtonActive : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              const button = e.currentTarget;
              const rect = button.getBoundingClientRect();

              if (actionsMenuOpen === org.id) {
                setActionsMenuOpen(null);
                setActionsMenuPosition(null);
              } else {
                setActionsMenuOpen(org.id);
                setActionsMenuPosition({
                  top: rect.bottom + 4,
                  left: rect.right - 160,
                });
              }
            }}
            aria-label="More actions"
          >
            <MoreVertical size={16} />
          </button>
          {actionsMenuOpen === org.id && actionsMenuPosition && (
            <div
              className={`${styles.actionsMenu} actionsMenu`}
              style={{
                top: `${actionsMenuPosition.top}px`,
                left: `${actionsMenuPosition.left}px`,
              }}
            >
              <button
                className={styles.menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick(org);
                  setActionsMenuOpen(null);
                }}
              >
                View Details
              </button>
              <button
                className={styles.menuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/organisation?id=${org.id}`, '_blank');
                  setActionsMenuOpen(null);
                }}
              >
                View Public Page
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: 'Export Selected',
      value: 'export',
      onClick: () => {
        console.log('Export selected:', selectedRows);
      },
    },
  ];

  return (
    <>
      <HubDataTable
        columns={columns}
        data={organisations}
        loading={isLoading}
        error={error?.message}
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
        selectable={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onSort={(key: string, direction: 'asc' | 'desc') => {
          setSortKey(key);
          setSortDirection(direction);
        }}
        onSearch={setSearchQuery}
        searchPlaceholder="Search by name, slug, or contact email..."
        onExport={handleExport}
        onRefresh={handleRefresh}
        bulkActions={bulkActions}
        onRowClick={handleRowClick}
        emptyMessage="No organisations found"
      />

      {/* Detail Modal */}
      {selectedOrganisation && (
        <AdminOrganisationDetailModal
          organisation={selectedOrganisation}
          isOpen={!!selectedOrganisation}
          onClose={() => setSelectedOrganisation(null)}
          onUpdate={refetch}
        />
      )}

      {/* Advanced Filters Drawer */}
      <AdvancedFiltersDrawer
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        onApply={() => {
          setShowAdvancedFilters(false);
          setPage(1);
        }}
        onReset={() => {
          setAdvancedFilters({
            hasWebsite: false,
            hasContact: false,
            createdAfter: '',
            createdBefore: '',
          });
          setPage(1);
        }}
      />
    </>
  );
}
