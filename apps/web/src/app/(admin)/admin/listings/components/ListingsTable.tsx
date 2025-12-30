/**
 * Filename: ListingsTable.tsx
 * Purpose: Listings-specific instance of HubDataTable with Phase 2 features
 * Created: 2025-12-27
 * Updated: 2025-12-27 (Universal column order standard applied)
 * Pattern: Instantiates generic HubDataTable with listing-specific configuration (mirrors BookingsTable)
 *
 * Features (Phase 1):
 * - 10 columns optimized for admin listings management
 * - Universal column order: ID → Created → Title → Tutor → Subjects → Status → Views → Bookings → Price → Actions
 * - Status, category, location, price filters
 * - CSV export functionality
 * - Mobile fallback to custom card component
 * - Server-side pagination (20 per page)
 * - Sort by date, views, bookings, price
 *
 * Features (Phase 2):
 * - Real-time updates (30s auto-refresh)
 * - Saved filter views
 * - Bulk actions (activate, deactivate, feature, delete)
 * - Advanced filters drawer
 * - Keyboard shortcuts
 *
 * Usage:
 * <ListingsTable />
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig, BulkAction } from '@/app/components/hub/data';
import { Listing } from '@/types';
import AdminListingDetailModal from './AdminListingDetailModal';
import { Star, Eye, Calendar, CheckCircle, XCircle, Trash2, Filter as FilterIcon, MoreVertical } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import styles from './ListingsTable.module.css';
import AdvancedFiltersDrawer, { AdvancedFilters } from './AdvancedFiltersDrawer';
import StatusBadge from '@/app/components/admin/badges/StatusBadge';
import { exportToCSV, CSVFormatters, type CSVColumn } from '@/lib/utils/exportToCSV';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';

// Helper function to map listing status to StatusBadge variant
function getListingStatusVariant(status: string) {
  const statusLower = status?.toLowerCase();
  if (statusLower === 'published') return 'published' as const;
  if (statusLower === 'draft') return 'pending' as const;
  if (statusLower === 'archived') return 'removed' as const;
  return 'neutral' as const;
}

export default function ListingsTable() {
  const supabase = createClient();

  // Table state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationTypeFilter, setLocationTypeFilter] = useState<string>('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Advanced filters state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    minViews: undefined,
    maxViews: undefined,
    minBookings: undefined,
    maxBookings: undefined,
    minRating: undefined,
    maxRating: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    isFeatured: false,
    hasVideo: false,
    hasGallery: false,
    createdAfter: '',
    createdBefore: '',
  });

  // Modal state
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Actions menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Close actions menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.actionsMenu')) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Fetch listings data with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'admin-listings',
      page,
      limit,
      sortKey,
      sortDirection,
      searchQuery,
      statusFilter,
      categoryFilter,
      locationTypeFilter,
      priceRangeFilter,
      advancedFilters,
    ],
    queryFn: async () => {
      let query = supabase
        .from('listings')
        .select(
          `
          *,
          profile:profiles!profile_id(
            id,
            full_name,
            email,
            avatar_url
          )
        `,
          { count: 'exact' }
        );

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply category filter
      if (categoryFilter && categoryFilter !== 'all') {
        query = query.contains('categories', [categoryFilter]);
      }

      // Apply location type filter
      if (locationTypeFilter && locationTypeFilter !== 'all') {
        query = query.eq('location_type', locationTypeFilter);
      }

      // Apply price range filter
      if (priceRangeFilter && priceRangeFilter !== 'all' && priceRangeFilter !== '') {
        const [min, max] = priceRangeFilter.split('-').map(Number);
        query = query.gte('hourly_rate', min);
        if (max) {
          query = query.lte('hourly_rate', max);
        }
      }

      // Apply advanced filters
      if (advancedFilters.minViews !== undefined && advancedFilters.minViews > 0) {
        query = query.gte('view_count', advancedFilters.minViews);
      }
      if (advancedFilters.maxViews !== undefined && advancedFilters.maxViews > 0) {
        query = query.lte('view_count', advancedFilters.maxViews);
      }
      if (advancedFilters.minBookings !== undefined && advancedFilters.minBookings > 0) {
        query = query.gte('booking_count', advancedFilters.minBookings);
      }
      if (advancedFilters.maxBookings !== undefined && advancedFilters.maxBookings > 0) {
        query = query.lte('booking_count', advancedFilters.maxBookings);
      }
      if (advancedFilters.minRating !== undefined && advancedFilters.minRating > 0) {
        query = query.gte('average_rating', advancedFilters.minRating);
      }
      if (advancedFilters.maxRating !== undefined && advancedFilters.maxRating > 0) {
        query = query.lte('average_rating', advancedFilters.maxRating);
      }
      if (advancedFilters.minPrice !== undefined && advancedFilters.minPrice > 0) {
        query = query.gte('hourly_rate', advancedFilters.minPrice);
      }
      if (advancedFilters.maxPrice !== undefined && advancedFilters.maxPrice > 0) {
        query = query.lte('hourly_rate', advancedFilters.maxPrice);
      }
      if (advancedFilters.isFeatured) {
        query = query.eq('is_featured', true);
      }
      if (advancedFilters.hasVideo) {
        query = query.not('video_url', 'is', null);
      }
      if (advancedFilters.hasGallery) {
        query = query.not('gallery_image_urls', 'is', null);
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
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        listings: (data || []) as Listing[],
        total: count || 0,
      };
    },
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
    retry: 2,
  });

  // Handle row click
  const handleRowClick = (listing: Listing) => {
    setSelectedListing(listing);
    setIsModalOpen(true);
  };

  // Handle listing updated (callback from modal)
  const handleListingUpdated = () => {
    refetch();
  };

  // Handle filter changes
  const handleFilterChange = (filterKey: string, value: string | string[]) => {
    const stringValue = Array.isArray(value) ? value[0] || '' : value;

    switch (filterKey) {
      case 'status':
        setStatusFilter(stringValue);
        break;
      case 'category':
        setCategoryFilter(stringValue);
        break;
      case 'location_type':
        setLocationTypeFilter(stringValue);
        break;
      case 'price_range':
        setPriceRangeFilter(stringValue);
        break;
    }
    setPage(1); // Reset to first page
  };

  // Handle advanced filters
  const handleApplyAdvancedFilters = (filters: AdvancedFilters) => {
    setAdvancedFilters(filters);
    setIsDrawerOpen(false);
    setPage(1);
  };

  const handleResetAdvancedFilters = () => {
    setAdvancedFilters({
      minViews: undefined,
      maxViews: undefined,
      minBookings: undefined,
      maxBookings: undefined,
      minRating: undefined,
      maxRating: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      isFeatured: false,
      hasVideo: false,
      hasGallery: false,
      createdAfter: '',
      createdBefore: '',
    });
  };

  // Handle export to CSV
  const handleExport = () => {
    if (!data?.listings) return;

    const columns: CSVColumn<Listing>[] = [
      { key: 'id', header: 'ID', format: (value) => formatIdForDisplay(value as string) },
      { key: 'created_at', header: 'Created', format: CSVFormatters.date },
      { key: 'title', header: 'Title' },
      { key: 'tutor', header: 'Tutor', format: (value: any) => value?.full_name || 'N/A' },
      { key: 'subjects', header: 'Subjects', format: CSVFormatters.array },
      { key: 'status', header: 'Status' },
      { key: 'view_count', header: 'Views', format: (value) => String(value || 0) },
      { key: 'booking_count', header: 'Bookings', format: (value) => String(value || 0) },
      { key: 'hourly_rate', header: 'Price (£/hr)', format: (value) => CSVFormatters.currency(value as number) },
    ];

    exportToCSV(data.listings, columns, 'listings');
  };

  // Define columns - UNIVERSAL COLUMN ORDER: ID → Date → Service → Domain → Actions
  const columns: Column<Listing>[] = [
    // Column 1: ID (100px, monospace, formatIdForDisplay)
    {
      key: 'id',
      label: 'ID',
      width: '100px',
      sortable: true,
      render: (listing) => (
        <div className={styles.idCell}>
          <span className={styles.idText} title={listing.id}>
            {formatIdForDisplay(listing.id)}
          </span>
        </div>
      ),
    },
    // Column 2: Date (140px, primary date field)
    {
      key: 'created_at',
      label: 'Created',
      width: '140px',
      sortable: true,
      render: (listing) => (
        <span className={styles.dateValue}>
          {new Date(listing.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    // Column 3: Service (200px, primary identifier - Title in this case)
    {
      key: 'title',
      label: 'Title',
      width: '200px',
      sortable: true,
      render: (listing) => (
        <div className={styles.titleCell}>
          <div className={styles.titleContent}>
            <span className={styles.titleText}>{listing.title}</span>
            <span className={styles.listingSlug}>{listing.slug}</span>
          </div>
        </div>
      ),
    },
    // Columns 4-9: Domain-specific data
    {
      key: 'tutor',
      label: 'Tutor',
      width: '180px',
      render: (listing) => (
        <div className={styles.tutorCell}>
          {listing.profile?.avatar_url && (
            <img
              src={listing.profile.avatar_url}
              alt={listing.profile.full_name || 'Tutor'}
              className={styles.tutorAvatar}
            />
          )}
          <div className={styles.tutorInfo}>
            <span className={styles.tutorName}>{listing.profile?.full_name || 'N/A'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'subjects',
      label: 'Subjects',
      width: '150px',
      render: (listing) => {
        if (!listing.subjects || listing.subjects.length === 0) {
          return <span className={styles.noSubjects}>—</span>;
        }
        const firstSubject = listing.subjects[0];
        const remainingCount = listing.subjects.length - 1;
        return (
          <div className={styles.subjectsCell}>
            <span className={styles.subjectBadge}>{firstSubject}</span>
            {remainingCount > 0 && (
              <span className={styles.subjectCount}>+{remainingCount}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      sortable: true,
      render: (listing) => (
        <StatusBadge variant={getListingStatusVariant(listing.status)} label={listing.status} />
      ),
    },
    {
      key: 'view_count',
      label: 'Views',
      width: '100px',
      sortable: true,
      render: (listing) => (
        <span className={styles.metricValue}>{listing.view_count || 0}</span>
      ),
    },
    {
      key: 'booking_count',
      label: 'Bookings',
      width: '100px',
      sortable: true,
      render: (listing) => (
        <span className={styles.metricValue}>{listing.booking_count || 0}</span>
      ),
    },
    {
      key: 'hourly_rate',
      label: 'Price',
      width: '100px',
      sortable: true,
      render: (listing) => (
        <span className={styles.priceValue}>£{listing.hourly_rate}/hr</span>
      ),
    },
    // Last Column: Actions (100px, three-dot menu)
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (listing) => (
        <div className={styles.actionsCell}>
          <button
            className={styles.actionsButton}
            onClick={(e) => {
              e.stopPropagation();
              const button = e.currentTarget;
              const rect = button.getBoundingClientRect();

              if (openMenuId === listing.id) {
                setOpenMenuId(null);
                setMenuPosition(null);
              } else {
                setOpenMenuId(listing.id);
                setMenuPosition({
                  top: rect.bottom + 4,
                  left: rect.right - 160, // 160px is menu width
                });
              }
            }}
            aria-label="More actions"
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === listing.id && menuPosition && (
            <div
              className={`${styles.actionsMenu} actionsMenu`}
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              <button
                className={styles.actionMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick(listing);
                  setOpenMenuId(null);
                }}
              >
                View Details
              </button>
              <button
                className={styles.actionMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  // Edit listing - navigate to edit page
                  window.location.href = `/edit-listing/${listing.id}`;
                }}
              >
                Edit Listing
              </button>
              <button
                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm('Delete this listing? This action cannot be undone.')) {
                    const { error } = await supabase.from('listings').delete().eq('id', listing.id);
                    if (error) {
                      alert('Failed to delete listing');
                    } else {
                      alert('Listing deleted successfully');
                      refetch();
                    }
                  }
                  setOpenMenuId(null);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
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
        { value: 'archived', label: 'Archived' },
      ],
    },
    {
      key: 'category',
      label: 'All Categories',
      options: [
        { value: 'academic', label: 'Academic' },
        { value: 'language', label: 'Language' },
        { value: 'music', label: 'Music' },
        { value: 'arts', label: 'Arts' },
        { value: 'sports', label: 'Sports' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      key: 'location_type',
      label: 'All Locations',
      options: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In Person' },
        { value: 'hybrid', label: 'Hybrid' },
      ],
    },
    {
      key: 'price_range',
      label: 'All Prices',
      options: [
        { value: '0-25', label: '£0 - £25/hr' },
        { value: '25-50', label: '£25 - £50/hr' },
        { value: '50-75', label: '£50 - £75/hr' },
        { value: '75-', label: '£75+/hr' },
      ],
    },
  ];

  // Define bulk actions
  const bulkActions: BulkAction[] = [
    {
      value: 'activate',
      label: 'Activate',
      variant: 'primary',
      onClick: async (selectedIds: string[]) => {
        if (!confirm(`Activate ${selectedIds.length} listing(s)?`)) return;

        const { error } = await supabase
          .from('listings')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', selectedIds);

        if (error) {
          alert('Failed to activate listings');
        } else {
          alert(`${selectedIds.length} listing(s) activated successfully`);
          refetch();
          setSelectedRows(new Set());
        }
      },
    },
    {
      value: 'deactivate',
      label: 'Deactivate',
      variant: 'secondary',
      onClick: async (selectedIds: string[]) => {
        if (!confirm(`Deactivate ${selectedIds.length} listing(s)?`)) return;

        const { error } = await supabase
          .from('listings')
          .update({
            status: 'archived',
            updated_at: new Date().toISOString(),
          })
          .in('id', selectedIds);

        if (error) {
          alert('Failed to deactivate listings');
        } else {
          alert(`${selectedIds.length} listing(s) deactivated successfully`);
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
        if (
          !confirm(
            `Delete ${selectedIds.length} listing(s)? This action cannot be undone.`
          )
        )
          return;

        const { error} = await supabase
          .from('listings')
          .delete()
          .in('id', selectedIds);

        if (error) {
          alert('Failed to delete listings');
        } else {
          alert(`${selectedIds.length} listing(s) deleted successfully`);
          refetch();
          setSelectedRows(new Set());
        }
      },
    },
  ];

  // Mobile card render function
  const mobileCard = (listing: Listing) => (
    <div className={styles.mobileCard} onClick={() => handleRowClick(listing)}>
      {/* Card Header */}
      <div className={styles.mobileCardHeader}>
        <div className={styles.mobileCardTitle}>
          <h3>{listing.title}</h3>
          <StatusBadge variant={getListingStatusVariant(listing.status)} label={listing.status} />
        </div>
        <div className={styles.mobileCardSubtitle}>
          <span>#{listing.id.slice(0, 8)}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className={styles.mobileCardBody}>
        {/* Tutor Info */}
        <div className={styles.mobileCardRow}>
          <span className={styles.mobileCardLabel}>Tutor:</span>
          <span className={styles.mobileCardValue}>
            {listing.profile?.full_name || 'N/A'}
          </span>
        </div>

        {/* Subjects */}
        <div className={styles.mobileCardRow}>
          <span className={styles.mobileCardLabel}>Subjects:</span>
          <div className={styles.subjectsCell}>
            {listing.subjects?.slice(0, 2).map((subject, i) => (
              <span key={i} className={styles.subjectTag}>
                {subject}
              </span>
            ))}
            {listing.subjects && listing.subjects.length > 2 && (
              <span className={styles.moreTag}>+{listing.subjects.length - 2}</span>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className={styles.mobileCardMetrics}>
          <div className={styles.metricItem}>
            <Eye className={styles.metricIcon} />
            <span>{listing.view_count || 0} views</span>
          </div>
          <div className={styles.metricItem}>
            <Calendar className={styles.metricIcon} />
            <span>{listing.booking_count || 0} bookings</span>
          </div>
          <div className={styles.metricItem}>
            <Star className={styles.metricIcon} />
            <span>N/A</span>
          </div>
        </div>

        {/* Price */}
        <div className={styles.mobileCardRow}>
          <span className={styles.mobileCardLabel}>Price:</span>
          <span className={styles.priceValue}>£{listing.hourly_rate}/hr</span>
        </div>

        {/* Created Date */}
        <div className={styles.mobileCardRow}>
          <span className={styles.mobileCardLabel}>Created:</span>
          <span className={styles.dateValue}>
            {new Date(listing.created_at).toLocaleDateString('en-GB')}
          </span>
        </div>
      </div>
    </div>
  );

  // Calculate active advanced filters count
  const hasActiveFilters = Object.values(advancedFilters).some((value) => {
    if (typeof value === 'boolean') return value === true;
    if (typeof value === 'string') return value !== '';
    if (typeof value === 'number') return value > 0;
    return false;
  });
  const activeFilterCount = Object.entries(advancedFilters).filter(([key, value]) => {
    if (typeof value === 'boolean') return value === true;
    if (typeof value === 'string') return value !== '';
    if (typeof value === 'number') return value > 0;
    return false;
  }).length;

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
      {/* Advanced Filters Drawer */}
      <AdvancedFiltersDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={advancedFilters}
        onApply={handleApplyAdvancedFilters}
        onReset={handleResetAdvancedFilters}
      />

      {/* Data Table */}
      <HubDataTable
        columns={columns}
        data={data?.listings || []}
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
        savedViewsKey="admin-listings-views"
        searchPlaceholder="Search by title, description..."
        emptyMessage="No listings found"
        mobileCard={mobileCard}
        toolbarActions={
          <button
            className={`${styles.filtersButton} ${hasActiveFilters ? styles.active : ''}`}
            onClick={() => setIsDrawerOpen(true)}
            title={hasActiveFilters ? `${activeFilterCount} filter(s) active` : 'Advanced Filters'}
          >
            <FilterIcon size={16} />
            {hasActiveFilters && (
              <span className={styles.filtersBadge}>{activeFilterCount}</span>
            )}
          </button>
        }
      />

      {/* Detail Modal */}
      <AdminListingDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedListing(null);
        }}
        listing={selectedListing}
        onListingUpdated={handleListingUpdated}
      />
    </>
  );
}
