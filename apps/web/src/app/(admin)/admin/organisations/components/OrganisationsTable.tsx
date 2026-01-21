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
import type { Column, Filter } from '@/app/components/hub/data';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { formatDate as formatDateUtil, formatDaysRemaining, calculateDaysRemaining } from '@/lib/utils/format-date';
import { MoreVertical, Filter as FilterIcon } from 'lucide-react';
import AdminOrganisationDetailModal from './AdminOrganisationDetailModal';
import AdvancedFiltersDrawer, { type AdvancedFilters } from './AdvancedFiltersDrawer';
import styles from './OrganisationsTable.module.css';
import { exportToCSV, CSVFormatters, type CSVColumn } from '@/lib/utils/exportToCSV';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';

// Organisation interface (from connection_groups + organisation_subscriptions)
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
  // Subscription data
  subscription?: {
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'none';
    trial_start: string | null;
    trial_end: string | null;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
  } | null;
}

export default function OrganisationsTable() {
  const supabase = createClient();

  // State
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
          owner:profile_id(id, full_name, email, avatar_url),
          subscription:organisation_subscriptions!organisation_id(
            stripe_subscription_id,
            stripe_customer_id,
            status,
            trial_start,
            trial_end,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            canceled_at
          )
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
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
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

  // Handle export to CSV
  const handleExport = () => {
    if (!organisations || organisations.length === 0) return;

    const columns: CSVColumn<Organisation>[] = [
      { key: 'id', header: 'ID', format: (value) => formatIdForDisplay(value as string) },
      { key: 'created_at', header: 'Created', format: CSVFormatters.date },
      { key: 'name', header: 'Name' },
      { key: 'slug', header: 'Slug', format: (value) => value || 'N/A' },
      { key: 'owner', header: 'Owner', format: (value: any) => value?.full_name || 'N/A' },
      { key: 'member_count', header: 'Members', format: (value) => String(value || 0) },
      {
        key: 'subscription',
        header: 'Trial Start',
        format: (value: any) => {
          const sub = Array.isArray(value) ? value[0] : value;
          return sub?.trial_start ? formatDateUtil(sub.trial_start) : 'N/A';
        },
      },
      {
        key: 'subscription',
        header: 'Trial End',
        format: (value: any) => {
          const sub = Array.isArray(value) ? value[0] : value;
          return sub?.trial_end ? formatDateUtil(sub.trial_end) : 'N/A';
        },
      },
      {
        key: 'subscription',
        header: 'Trial Status',
        format: (value: any) => {
          const sub = Array.isArray(value) ? value[0] : value;
          if (!sub?.trial_end) return 'N/A';
          const days = calculateDaysRemaining(sub.trial_end);
          return days > 0 ? `${days} days left` : `Expired ${Math.abs(days)} days ago`;
        },
      },
      {
        key: 'subscription',
        header: 'Subscription Status',
        format: (value: any) => {
          const sub = Array.isArray(value) ? value[0] : value;
          return sub?.status || 'none';
        },
      },
      {
        key: 'subscription',
        header: 'Next Billing',
        format: (value: any) => {
          const sub = Array.isArray(value) ? value[0] : value;
          return sub?.current_period_end ? formatDateUtil(sub.current_period_end) : 'N/A';
        },
      },
      {
        key: 'subscription',
        header: 'Billing Action',
        format: (value: any) => {
          const sub = Array.isArray(value) ? value[0] : value;
          if (!sub) return 'N/A';
          return sub.cancel_at_period_end ? 'Cancels' : 'Renews';
        },
      },
      { key: 'website', header: 'Website', format: (value) => value || 'N/A' },
      { key: 'contact_name', header: 'Contact Name', format: (value) => value || 'N/A' },
      { key: 'contact_email', header: 'Contact Email', format: (value) => value || 'N/A' },
      { key: 'contact_phone', header: 'Contact Phone', format: (value) => value || 'N/A' },
    ];

    exportToCSV(organisations, columns, 'organisations');
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
        <span style={{ fontSize: '0.875rem', color: '#374151' }}>
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
      key: 'trial_start',
      label: 'Trial Start',
      width: '110px',
      sortable: true,
      render: (org) => {
        const sub = Array.isArray(org.subscription) ? org.subscription[0] : org.subscription;
        return sub?.trial_start ? (
          <span className={styles.dateCell}>{formatDateUtil(sub.trial_start)}</span>
        ) : (
          <span className={styles.emptyCell}>—</span>
        );
      },
    },
    {
      key: 'trial_end',
      label: 'Trial End',
      width: '110px',
      sortable: true,
      render: (org) => {
        const sub = Array.isArray(org.subscription) ? org.subscription[0] : org.subscription;
        if (!sub?.trial_end) return <span className={styles.emptyCell}>—</span>;

        const daysRemaining = calculateDaysRemaining(sub.trial_end);
        const textColor = daysRemaining <= 3 ? '#dc2626' : daysRemaining <= 7 ? '#ea580c' : '#374151';

        return (
          <span className={styles.dateCell} style={{ color: textColor, fontWeight: daysRemaining <= 3 ? 600 : 400 }}>
            {formatDateUtil(sub.trial_end)}
          </span>
        );
      },
    },
    {
      key: 'trial_status',
      label: 'Trial Status',
      width: '110px',
      sortable: true,
      render: (org) => {
        const sub = Array.isArray(org.subscription) ? org.subscription[0] : org.subscription;
        if (!sub?.trial_end) return <span className={styles.emptyCell}>—</span>;

        const daysRemaining = calculateDaysRemaining(sub.trial_end);

        return (
          <div className={styles.trialStatusCell}>
            {daysRemaining > 0 ? (
              <>
                <div className={`${styles.statusDot} ${styles.statusActive}`} />
                <span className={styles.trialDays}>{daysRemaining}d left</span>
              </>
            ) : (
              <>
                <div className={`${styles.statusDot} ${styles.statusExpired}`} />
                <span className={styles.trialExpired}>Expired</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'subscription_status',
      label: 'Subscription',
      width: '110px',
      sortable: true,
      render: (org) => {
        const sub = Array.isArray(org.subscription) ? org.subscription[0] : org.subscription;
        if (!sub) return <span className={styles.emptyCell}>—</span>;

        const statusLabels: Record<string, string> = {
          trialing: 'trialing',
          active: 'active',
          canceled: 'canceled',
          past_due: 'past_due',
          incomplete: 'incomplete',
          unpaid: 'unpaid',
          none: 'none',
        };

        return (
          <span className={styles.statusText}>
            {statusLabels[sub.status] || sub.status}
          </span>
        );
      },
    },
    {
      key: 'next_billing',
      label: 'Next Billing',
      width: '130px',
      sortable: true,
      render: (org) => {
        const sub = Array.isArray(org.subscription) ? org.subscription[0] : org.subscription;
        if (!sub?.current_period_end) return <span className={styles.emptyCell}>—</span>;

        return (
          <span className={styles.dateCell}>{formatDateUtil(sub.current_period_end)}</span>
        );
      },
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
                  window.open(`/org/${org.slug}`, '_blank');
                  setActionsMenuOpen(null);
                }}
              >
                View Public Page
              </button>

              {/* Subscription Management Actions - Always show all 3 */}
              {(() => {
                const sub = Array.isArray(org.subscription) ? org.subscription[0] : org.subscription;
                const hasSubscription = !!sub;
                const isActiveOrTrialing = sub && ['active', 'trialing'].includes(sub.status);
                const isInactive = sub && !['active', 'trialing'].includes(sub.status);

                // Determine disabled states
                const resetDisabled = !isInactive; // Can only reset inactive subscriptions
                const activateDisabled = isActiveOrTrialing; // Can't activate already active/trialing
                const deleteDisabled = !hasSubscription; // Can't delete if no subscription

                return (
                  <>
                    {/* Reset Trial - Always show */}
                    <button
                      className={styles.menuItem}
                      disabled={resetDisabled}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (resetDisabled) return;
                        setActionsMenuOpen(null);

                        if (!confirm(`Reset trial period for "${org.name}"?\n\nThis will delete the current subscription record and allow them to start a fresh 14-day trial.`)) {
                          return;
                        }

                        try {
                          const response = await fetch(`/api/admin/org/${org.id}/reset-trial`, {
                            method: 'DELETE',
                          });

                          const data = await response.json();

                          if (!response.ok) {
                            throw new Error(data.error || 'Failed to reset trial');
                          }

                          alert(data.message);
                          refetch();
                        } catch (error: any) {
                          alert(`Error: ${error.message}`);
                        }
                      }}
                      style={{ color: resetDisabled ? '#9ca3af' : '#ea580c' }}
                      title={resetDisabled ? 'No inactive subscription to reset' : 'Delete subscription and allow fresh trial'}
                    >
                      Reset Trial Period
                    </button>

                    {/* Force Activate - Always show */}
                    <button
                      className={styles.menuItem}
                      disabled={activateDisabled}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (activateDisabled) return;
                        setActionsMenuOpen(null);

                        if (!confirm(`Force activate subscription for "${org.name}"?\n\nThis will grant them free premium access for 1 year without requiring payment.`)) {
                          return;
                        }

                        try {
                          const response = await fetch(`/api/admin/org/${org.id}/force-activate`, {
                            method: 'POST',
                          });

                          const data = await response.json();

                          if (!response.ok) {
                            throw new Error(data.error || 'Failed to force activate');
                          }

                          alert(data.message);
                          refetch();
                        } catch (error: any) {
                          alert(`Error: ${error.message}`);
                        }
                      }}
                      style={{ color: activateDisabled ? '#9ca3af' : '#059669' }}
                      title={activateDisabled ? 'Subscription already active' : 'Grant 1 year free access'}
                    >
                      Force Activate (Free)
                    </button>

                    {/* Delete Subscription - Always show */}
                    <button
                      className={styles.menuItem}
                      disabled={deleteDisabled}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (deleteDisabled) return;
                        setActionsMenuOpen(null);

                        if (!confirm(`Delete subscription for "${org.name}"?\n\nThis will permanently remove the subscription record. They will need to start a new trial.${sub?.stripe_subscription_id ? '\n\nWARNING: This will NOT cancel the Stripe subscription. You must do that manually in Stripe dashboard.' : ''}`)) {
                          return;
                        }

                        try {
                          const response = await fetch(`/api/admin/org/${org.id}/subscription`, {
                            method: 'DELETE',
                          });

                          const data = await response.json();

                          if (!response.ok) {
                            throw new Error(data.error || 'Failed to delete subscription');
                          }

                          alert(data.message);
                          refetch();
                        } catch (error: any) {
                          alert(`Error: ${error.message}`);
                        }
                      }}
                      style={{ color: deleteDisabled ? '#9ca3af' : '#dc2626' }}
                      title={deleteDisabled ? 'No subscription to delete' : 'Permanently remove subscription record'}
                    >
                      Delete Subscription
                    </button>
                  </>
                );
              })()}
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
        const selectedOrgs = organisations.filter(org => selectedRows.has(org.id));
        if (selectedOrgs.length === 0) return;

        const columns: CSVColumn<Organisation>[] = [
          { key: 'id', header: 'ID', format: (value) => formatIdForDisplay(value as string) },
          { key: 'name', header: 'Name' },
          { key: 'owner', header: 'Owner', format: (value: any) => value?.full_name || 'N/A' },
          { key: 'member_count', header: 'Members', format: (value) => String(value || 0) },
        ];

        exportToCSV(selectedOrgs, columns, 'selected-organisations');
      },
    },
  ];

  // Filters for dropdown
  const filters: Filter[] = [
    {
      key: 'memberRange',
      label: 'All Sizes',
      options: [
        { label: '1-5 members', value: '1-5' },
        { label: '6-10 members', value: '6-10' },
        { label: '11-50 members', value: '11-50' },
        { label: '50+ members', value: '50+' },
      ],
    },
    {
      key: 'dateRange',
      label: 'All Time',
      options: [
        { label: 'Last 7 days', value: 'last-7-days' },
        { label: 'Last 30 days', value: 'last-30-days' },
        { label: 'Last 90 days', value: 'last-90-days' },
        { label: 'This year', value: 'this-year' },
      ],
    },
  ];

  // Count active filters
  const activeFiltersCount = Object.values(advancedFilters).filter((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') return value !== '';
    return false;
  }).length;

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
        autoRefreshInterval={ADMIN_TABLE_DEFAULTS.REFRESH_FAST}
        filters={filters}
        bulkActions={bulkActions}
        onRowClick={handleRowClick}
        emptyMessage="No organisations found"
        toolbarActions={
          <button
            className={`${styles.filtersButton} ${showAdvancedFilters ? styles.active : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            aria-label="Advanced filters"
          >
            <FilterIcon size={16} />
            {activeFiltersCount > 0 && (
              <span className={styles.filtersBadge}>{activeFiltersCount}</span>
            )}
          </button>
        }
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
