/**
 * Filename: ReviewsTable.tsx
 * Purpose: Admin reviews data table with 11 columns following Universal Column Order Standard
 * Created: 2025-12-27
 * Pattern: Mirrors ListingsTable.tsx with Reviews-specific adaptations
 *
 * Column Order: ID → Reviewed → Service → Reviewer → Reviewee → Rating → Sentiment → Status → Helpful → Verified → Actions
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column } from '@/app/components/hub/data';
import { AdminReviewDetailModal } from './AdminReviewDetailModal';
import { AdvancedFiltersDrawer } from './AdvancedFiltersDrawer';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import type { ProfileReview } from '@/types/reviews';
import styles from './ReviewsTable.module.css';
import { Star, StarOff, CheckCircle, XCircle } from 'lucide-react';

// Local date formatting helper
const formatDate = (dateString: string, format?: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// Advanced filters interface
export interface AdvancedFilters {
  minRating?: number;
  maxRating?: number;
  minHelpful?: number;
  maxHelpful?: number;
  subjects?: string[];
  locationType?: string;
  hasComment?: boolean;
  hasResponse?: boolean;
  verifiedOnly?: boolean;
  reviewedAfter?: string;
  reviewedBefore?: string;
}

interface ReviewsTableProps {
  className?: string;
}

export function ReviewsTable({ className }: ReviewsTableProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Modal state
  const [selectedReview, setSelectedReview] = useState<ProfileReview | null>(null);

  // Helper function to calculate sentiment from rating
  const getSentiment = (rating: number): 'positive' | 'neutral' | 'negative' => {
    if (rating >= 4) return 'positive';
    if (rating >= 3) return 'neutral';
    return 'negative';
  };

  // Data fetching with React Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'admin-reviews',
      page,
      limit,
      sortKey,
      sortDirection,
      searchQuery,
      statusFilter,
      ratingFilter,
      verifiedFilter,
      sentimentFilter,
      advancedFilters,
    ],
    queryFn: async () => {
      let query = supabase
        .from('profile_reviews')
        .select(
          `
          *,
          reviewer:profiles!reviewer_id(id, full_name, email, avatar_url, active_role),
          reviewee:profiles!reviewee_id(id, full_name, email, avatar_url, active_role),
          session:booking_review_sessions(id, status, publish_at, published_at, booking_id)
        `,
          { count: 'exact' }
        );

      // Apply search filter (comment or service_name)
      if (searchQuery) {
        query = query.or(`comment.ilike.%${searchQuery}%,service_name.ilike.%${searchQuery}%`);
      }

      // Apply status filter (from session)
      if (statusFilter && statusFilter !== 'all') {
        // Note: This requires filtering after fetch since session is a join
        // We'll handle this in post-processing
      }

      // Apply rating filter
      if (ratingFilter && ratingFilter !== 'all') {
        const rating = parseInt(ratingFilter);
        query = query.eq('rating', rating);
      }

      // Apply sentiment filter (calculated from rating)
      if (sentimentFilter && sentimentFilter !== 'all') {
        if (sentimentFilter === 'positive') {
          query = query.gte('rating', 4);
        } else if (sentimentFilter === 'neutral') {
          query = query.eq('rating', 3);
        } else if (sentimentFilter === 'negative') {
          query = query.lte('rating', 2);
        }
      }

      // Apply advanced filters
      if (advancedFilters.minRating !== undefined) {
        query = query.gte('rating', advancedFilters.minRating);
      }
      if (advancedFilters.maxRating !== undefined) {
        query = query.lte('rating', advancedFilters.maxRating);
      }
      if (advancedFilters.hasComment) {
        query = query.not('comment', 'is', null);
      }
      if (advancedFilters.locationType) {
        query = query.eq('location_type', advancedFilters.locationType);
      }
      if (advancedFilters.reviewedAfter) {
        query = query.gte('created_at', advancedFilters.reviewedAfter);
      }
      if (advancedFilters.reviewedBefore) {
        query = query.lte('created_at', advancedFilters.reviewedBefore);
      }

      // Apply sorting
      query = query.order(sortKey, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      // Flatten foreign key arrays (Supabase returns arrays for foreign keys)
      let reviews = (data || []).map((item: any) => ({
        ...item,
        reviewer: Array.isArray(item.reviewer) ? item.reviewer[0] : item.reviewer,
        reviewee: Array.isArray(item.reviewee) ? item.reviewee[0] : item.reviewee,
        session: Array.isArray(item.session) ? item.session[0] : item.session,
      })) as ProfileReview[];

      // Post-process filters that require joined data
      if (statusFilter && statusFilter !== 'all') {
        reviews = reviews.filter((review) => review.session?.status === statusFilter);
      }

      if (verifiedFilter && verifiedFilter !== 'all') {
        if (verifiedFilter === 'verified') {
          reviews = reviews.filter((review) => review.metadata?.verified === true);
        } else if (verifiedFilter === 'unverified') {
          reviews = reviews.filter((review) => review.metadata?.verified !== true);
        }
      }

      // Apply advanced subject filter
      if (advancedFilters.subjects && advancedFilters.subjects.length > 0) {
        reviews = reviews.filter((review) => {
          if (!review.subjects) return false;
          return advancedFilters.subjects!.some((subject) => review.subjects?.includes(subject));
        });
      }

      return {
        reviews,
        total: count || 0,
      };
    },
    staleTime: 60 * 1000, // 60s
    retry: 2,
  });

  // Bulk approve mutation
  const approveMutation = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      // Get session IDs for these reviews
      const reviews = data?.reviews.filter((r) => reviewIds.includes(r.id));
      const sessionIds = reviews?.map((r) => r.session?.id).filter(Boolean) || [];

      const { error } = await supabase
        .from('booking_review_sessions')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .in('id', sessionIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setSelectedRows(new Set());
    },
  });

  // Bulk flag mutation
  const flagMutation = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      // Add moderation flag to metadata
      const reviews = data?.reviews.filter((r) => reviewIds.includes(r.id));

      for (const review of reviews || []) {
        await supabase
          .from('profile_reviews')
          .update({
            metadata: {
              ...review.metadata,
              flagged: true,
              flagged_at: new Date().toISOString(),
            },
          })
          .eq('id', review.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setSelectedRows(new Set());
    },
  });

  // Bulk hide mutation
  const hideMutation = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      // Get session IDs for these reviews
      const reviews = data?.reviews.filter((r) => reviewIds.includes(r.id));
      const sessionIds = reviews?.map((r) => r.session?.id).filter(Boolean) || [];

      const { error } = await supabase
        .from('booking_review_sessions')
        .update({ status: 'expired' })
        .in('id', sessionIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setSelectedRows(new Set());
    },
  });

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      const { error } = await supabase.from('profile_reviews').delete().in('id', reviewIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setSelectedRows(new Set());
    },
  });

  // Column definitions following Universal Column Order Standard
  const columns: Column<ProfileReview>[] = useMemo(
    () => [
      // 1. ID (100px) - 8-char truncated UUID with # prefix
      {
        id: 'id',
        header: 'ID',
        width: 100,
        sortable: true,
        cell: (review) => (
          <span className={styles.idCell}>{formatIdForDisplay(review.id)}</span>
        ),
      },

      // 2. Reviewed (140px) - Review submission date
      {
        id: 'created_at',
        header: 'Reviewed',
        width: 140,
        sortable: true,
        cell: (review) => (
          <span className={styles.dateCell}>{formatDate(review.created_at, 'dd MMM yyyy')}</span>
        ),
      },

      // 3. Service (200px) - Service name from snapshot
      {
        id: 'service_name',
        header: 'Service',
        width: 200,
        sortable: true,
        cell: (review) => (
          <span className={styles.serviceCell}>{review.service_name || '—'}</span>
        ),
      },

      // 4. Reviewer (150px) - Avatar + name + role
      {
        id: 'reviewer',
        header: 'Reviewer',
        width: 150,
        sortable: false,
        cell: (review) => (
          <div className={styles.profileCell}>
            {review.reviewer?.avatar_url && (
              <img
                src={review.reviewer.avatar_url}
                alt={review.reviewer.full_name || 'Reviewer'}
                className={styles.avatar}
              />
            )}
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{review.reviewer?.full_name || '—'}</span>
              {review.reviewer?.active_role && (
                <span className={styles.roleBadge}>{review.reviewer.active_role}</span>
              )}
            </div>
          </div>
        ),
      },

      // 5. Reviewee (150px) - Avatar + name + role
      {
        id: 'reviewee',
        header: 'Reviewee',
        width: 150,
        sortable: false,
        cell: (review) => (
          <div className={styles.profileCell}>
            {review.reviewee?.avatar_url && (
              <img
                src={review.reviewee.avatar_url}
                alt={review.reviewee.full_name || 'Reviewee'}
                className={styles.avatar}
              />
            )}
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{review.reviewee?.full_name || '—'}</span>
              {review.reviewee?.active_role && (
                <span className={styles.roleBadge}>{review.reviewee.active_role}</span>
              )}
            </div>
          </div>
        ),
      },

      // 6. Rating (100px) - Star icons + numeric value
      {
        id: 'rating',
        header: 'Rating',
        width: 100,
        sortable: true,
        cell: (review) => (
          <div className={styles.ratingCell}>
            <div className={styles.stars}>
              {Array.from({ length: 5 }, (_, i) =>
                i < review.rating ? (
                  <Star key={i} className={styles.starFilled} size={14} />
                ) : (
                  <StarOff key={i} className={styles.starEmpty} size={14} />
                )
              )}
            </div>
            <span className={styles.ratingValue}>{review.rating.toFixed(1)}</span>
          </div>
        ),
      },

      // 7. Sentiment (120px) - Badge based on rating
      {
        id: 'sentiment',
        header: 'Sentiment',
        width: 120,
        sortable: true,
        cell: (review) => {
          const sentiment = getSentiment(review.rating);
          return (
            <span className={styles[`sentiment${sentiment.charAt(0).toUpperCase()}${sentiment.slice(1)}`]}>
              {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
            </span>
          );
        },
      },

      // 8. Status (120px) - Badge from session
      {
        id: 'status',
        header: 'Status',
        width: 120,
        sortable: true,
        cell: (review) => {
          const status = review.session?.status || 'pending';
          return (
            <span className={styles[`status${status.charAt(0).toUpperCase()}${status.slice(1)}`]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          );
        },
      },

      // 9. Helpful (100px) - Thumbs-up count
      {
        id: 'helpful_count',
        header: 'Helpful',
        width: 100,
        sortable: true,
        cell: (review) => (
          <span className={styles.helpfulCell}>
            {review.metadata?.helpful_count || 0}
          </span>
        ),
      },

      // 10. Verified (100px) - Checkmark badge
      {
        id: 'verified',
        header: 'Verified',
        width: 100,
        sortable: false,
        cell: (review) => (
          <div className={styles.verifiedCell}>
            {review.metadata?.verified ? (
              <CheckCircle className={styles.verifiedIcon} size={16} />
            ) : (
              <XCircle className={styles.unverifiedIcon} size={16} />
            )}
          </div>
        ),
      },

      // 11. Actions (100px) - Three-dot menu
      {
        id: 'actions',
        header: 'Actions',
        width: 100,
        sortable: false,
        cell: (review) => null, // Handled by HubDataTable row actions
      },
    ],
    []
  );

  // Bulk actions
  const bulkActions = useMemo(
    () => [
      {
        label: 'Approve',
        onClick: () => {
          if (window.confirm(`Approve ${selectedRows.size} review(s)?`)) {
            approveMutation.mutate(Array.from(selectedRows));
          }
        },
      },
      {
        label: 'Flag',
        onClick: () => {
          if (window.confirm(`Flag ${selectedRows.size} review(s) for moderation?`)) {
            flagMutation.mutate(Array.from(selectedRows));
          }
        },
      },
      {
        label: 'Hide',
        onClick: () => {
          if (window.confirm(`Hide ${selectedRows.size} review(s)?`)) {
            hideMutation.mutate(Array.from(selectedRows));
          }
        },
      },
      {
        label: 'Delete',
        onClick: () => {
          if (window.confirm(`Permanently delete ${selectedRows.size} review(s)? This cannot be undone.`)) {
            deleteMutation.mutate(Array.from(selectedRows));
          }
        },
        variant: 'danger' as const,
      },
    ],
    [selectedRows, approveMutation, flagMutation, hideMutation, deleteMutation]
  );

  // Filters configuration
  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: 'Status',
        value: statusFilter,
        onChange: setStatusFilter,
        options: [
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'published', label: 'Published' },
          { value: 'expired', label: 'Expired' },
        ],
      },
      {
        id: 'rating',
        label: 'Rating',
        value: ratingFilter,
        onChange: setRatingFilter,
        options: [
          { value: 'all', label: 'All' },
          { value: '5', label: '5 Stars' },
          { value: '4', label: '4 Stars' },
          { value: '3', label: '3 Stars' },
          { value: '2', label: '2 Stars' },
          { value: '1', label: '1 Star' },
        ],
      },
      {
        id: 'verified',
        label: 'Verified',
        value: verifiedFilter,
        onChange: setVerifiedFilter,
        options: [
          { value: 'all', label: 'All' },
          { value: 'verified', label: 'Verified Only' },
          { value: 'unverified', label: 'Unverified Only' },
        ],
      },
      {
        id: 'sentiment',
        label: 'Sentiment',
        value: sentimentFilter,
        onChange: setSentimentFilter,
        options: [
          { value: 'all', label: 'All' },
          { value: 'positive', label: 'Positive (4-5★)' },
          { value: 'neutral', label: 'Neutral (3★)' },
          { value: 'negative', label: 'Negative (1-2★)' },
        ],
      },
    ],
    [statusFilter, ratingFilter, verifiedFilter, sentimentFilter]
  );

  // Mobile card renderer
  const renderMobileCard = useCallback((review: ProfileReview) => {
    const sentiment = getSentiment(review.rating);
    const status = review.session?.status || 'pending';

    return (
      <div className={styles.mobileCard} onClick={() => setSelectedReview(review)}>
        <div className={styles.mobileCardHeader}>
          <span className={styles.mobileId}>{formatIdForDisplay(review.id)}</span>
          <span className={styles[`status${status.charAt(0).toUpperCase()}${status.slice(1)}`]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        <div className={styles.mobileCardBody}>
          <div className={styles.mobileService}>{review.service_name || '—'}</div>

          <div className={styles.mobileProfiles}>
            <div className={styles.mobileProfile}>
              <span className={styles.mobileLabel}>Reviewer:</span>
              <span>{review.reviewer?.full_name || '—'}</span>
            </div>
            <div className={styles.mobileProfile}>
              <span className={styles.mobileLabel}>Reviewee:</span>
              <span>{review.reviewee?.full_name || '—'}</span>
            </div>
          </div>

          <div className={styles.mobileRating}>
            <div className={styles.stars}>
              {Array.from({ length: 5 }, (_, i) =>
                i < review.rating ? (
                  <Star key={i} className={styles.starFilled} size={16} />
                ) : (
                  <StarOff key={i} className={styles.starEmpty} size={16} />
                )
              )}
            </div>
            <span className={styles[`sentiment${sentiment.charAt(0).toUpperCase()}${sentiment.slice(1)}`]}>
              {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
            </span>
          </div>

          <div className={styles.mobileDate}>
            {formatDate(review.created_at, 'dd MMM yyyy')}
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <>
      <HubDataTable
        columns={columns}
        data={data?.reviews || []}
        loading={isLoading}
        error={error?.message}
        pagination={{
          page,
          limit,
          total: data?.total || 0,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
        sorting={{
          sortKey,
          sortDirection,
          onSortChange: (key, direction) => {
            setSortKey(key);
            setSortDirection(direction);
          },
        }}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Search reviews by comment or service...',
        }}
        filters={filters}
        bulkActions={bulkActions}
        selection={{
          selectedRows,
          onSelectionChange: setSelectedRows,
        }}
        onRowClick={(review) => setSelectedReview(review)}
        autoRefreshInterval={30000}
        enableSavedViews
        savedViewsKey="admin-reviews-views"
        mobileCard={renderMobileCard}
        toolbarActions={
          <button
            className={styles.advancedFiltersButton}
            onClick={() => setShowAdvancedFilters(true)}
          >
            Advanced Filters
            {Object.keys(advancedFilters).length > 0 && (
              <span className={styles.filterBadge}>{Object.keys(advancedFilters).length}</span>
            )}
          </button>
        }
        className={className}
      />

      {selectedReview && (
        <AdminReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onUpdate={() => {
            refetch();
            setSelectedReview(null);
          }}
        />
      )}

      {showAdvancedFilters && (
        <AdvancedFiltersDrawer
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
        />
      )}
    </>
  );
}
