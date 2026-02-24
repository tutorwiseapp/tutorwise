/**
 * Filename: apps/web/src/app/(authenticated)/ai-tutors/page.tsx
 * Purpose: AI Tutor Studio dashboard - lists user's AI tutors
 * Route: /ai-tutors
 * Created: 2026-02-23
 * Architecture: Hub Layout pattern with HubPageLayout
 */

'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import Button from '@/app/components/ui/actions/Button';
import AITutorStatsWidget from '@/app/components/feature/ai-tutors/AITutorStatsWidget';
import AITutorLimitsWidget from '@/app/components/feature/ai-tutors/AITutorLimitsWidget';
import AITutorHelpWidget from '@/app/components/feature/ai-tutors/AITutorHelpWidget';
import AITutorTipsWidget from '@/app/components/feature/ai-tutors/AITutorTipsWidget';
import AITutorCard from './AITutorCard';
import AITutorSkeleton from './AITutorSkeleton';
import toast from 'react-hot-toast';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import styles from './page.module.css';

type FilterType = 'all' | 'published' | 'draft' | 'unpublished' | 'archived';
type SortType = 'newest' | 'oldest' | 'price-high' | 'price-low' | 'revenue-high' | 'sessions-high';

const ITEMS_PER_PAGE = 10;

interface AITutor {
  id: string;
  display_name: string;
  subject: string;
  status: string;
  subscription_status: string;
  total_sessions: number;
  total_revenue: number;
  avg_rating: number | null;
  total_reviews: number;
  created_at: string;
  price_per_hour: number;
  archived_at?: string | null;
  avatar_url?: string;
  owner_id?: string;
  created_as_role?: string;
}

export default function AITutorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { profile, activeRole, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);

  const filter = (searchParams?.get('filter') as FilterType) || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // React Query: Fetch AI tutors with automatic retry, caching, and background refetch
  const {
    data: aiTutors = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<AITutor[]>({
    queryKey: ['ai-tutors', profile?.id],
    queryFn: async () => {
      const res = await fetch('/api/ai-tutors');
      if (!res.ok) throw new Error('Failed to fetch AI tutors');
      return res.json();
    },
    enabled: !!profile?.id, // Wait for profile to load before fetching
    staleTime: 3 * 60 * 1000, // 3 minutes (AI tutors change frequently with sessions)
    gcTime: 6 * 60 * 1000, // 6 minutes
    placeholderData: keepPreviousData, // Show cached data instantly while refetching
    refetchOnMount: 'always', // Always refetch when component mounts (page is clicked)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai-tutors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['ai-tutors', profile?.id] });

      // Snapshot current value for rollback
      const previousTutors = queryClient.getQueryData(['ai-tutors', profile?.id]);

      // Optimistically update cache
      queryClient.setQueryData(['ai-tutors', profile?.id], (old: AITutor[] = []) =>
        old.filter((t) => t.id !== id)
      );

      return { previousTutors };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      queryClient.setQueryData(['ai-tutors', profile?.id], context?.previousTutors);
      toast.error('Failed to delete AI tutor');
    },
    onSuccess: () => {
      toast.success('AI tutor deleted successfully');
    },
    onSettled: () => {
      // Always refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ['ai-tutors', profile?.id] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai-tutors/${id}/publish`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to publish');
      }
    },
    onSuccess: () => {
      toast.success('AI tutor published successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tutors', profile?.id] });
    },
  });

  // Unpublish mutation
  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai-tutors/${id}/unpublish`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to unpublish');
    },
    onSuccess: () => {
      toast.success('AI tutor unpublished');
    },
    onError: () => {
      toast.error('Failed to unpublish AI tutor');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tutors', profile?.id] });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai-tutors/${id}/archive`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to archive');
    },
    onSuccess: () => {
      toast.success('AI tutor archived');
    },
    onError: () => {
      toast.error('Failed to archive AI tutor');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tutors', profile?.id] });
    },
  });

  // Filter AI tutors by created_as_role - each role sees ONLY AI tutors they created in that role
  const roleFilteredTutors = useMemo(() => {
    return aiTutors.filter((tutor) => {
      // Show only AI tutors created while in the current active role
      // This creates separate AI tutor inventories per role:
      // - AI tutors created as "client" only visible in client role
      // - AI tutors created as "tutor" only visible in tutor role
      // - AI tutors created as "agent" only visible in agent role
      return tutor.created_as_role === activeRole;
    });
  }, [aiTutors, activeRole]);

  const tabCounts = useMemo(() => ({
    all: roleFilteredTutors.length,
    published: roleFilteredTutors.filter(t => t.status === 'published').length,
    draft: roleFilteredTutors.filter(t => t.status === 'draft').length,
    unpublished: roleFilteredTutors.filter(t => t.status === 'unpublished').length,
    archived: roleFilteredTutors.filter(t => t.status === 'archived').length,
  }), [roleFilteredTutors]);

  // Filter AI tutors based on tab, search (comprehensive search across all relevant fields)
  const filteredTutors = useMemo(() => {
    let result = roleFilteredTutors;
    if (filter !== 'all') {
      result = result.filter(t => t.status === filter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => {
        const displayName = t.display_name?.toLowerCase() || '';
        const subject = t.subject?.toLowerCase() || '';
        const status = t.status?.toLowerCase() || '';
        const subscriptionStatus = t.subscription_status?.toLowerCase() || '';
        const price = `£${t.price_per_hour}`;
        const sessions = `${t.total_sessions || 0}`;
        const revenue = `£${(t.total_revenue || 0).toFixed(2)}`;

        return displayName.includes(query) ||
               subject.includes(query) ||
               status.includes(query) ||
               subscriptionStatus.includes(query) ||
               price.includes(query) ||
               sessions.includes(query) ||
               revenue.includes(query);
      });
    }
    return result;
  }, [roleFilteredTutors, filter, searchQuery]);

  // Sort AI tutors
  const sortedTutors = useMemo(() => {
    const sorted = [...filteredTutors];
    switch (sortBy) {
      case 'newest': return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest': return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'price-high': return sorted.sort((a, b) => (b.price_per_hour || 0) - (a.price_per_hour || 0));
      case 'price-low': return sorted.sort((a, b) => (a.price_per_hour || 0) - (b.price_per_hour || 0));
      case 'revenue-high': return sorted.sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
      case 'sessions-high': return sorted.sort((a, b) => (b.total_sessions || 0) - (a.total_sessions || 0));
      default: return sorted;
    }
  }, [filteredTutors, sortBy]);

  const totalItems = sortedTutors.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTutors = sortedTutors.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  React.useEffect(() => { setCurrentPage(1); }, [filter, searchQuery, sortBy]);

  const handleFilterChange = (newFilter: FilterType) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newFilter === 'all') { params.delete('filter'); } else { params.set('filter', newFilter); }
    router.push(`/ai-tutors${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handlePublish = async (id: string) => {
    // Check if AI tutor has subscription
    const tutor = aiTutors.find(t => t.id === id);
    if (!tutor) return;

    if (tutor.subscription_status !== 'active') {
      // Redirect to subscription checkout
      try {
        const res = await fetch(`/api/ai-tutors/${id}/subscription`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to create checkout session');
        const { url } = await res.json();
        window.location.href = url;
      } catch (error) {
        toast.error('Failed to start subscription checkout');
      }
    } else {
      // Already has subscription, just publish
      publishMutation.mutate(id);
    }
  };

  const handleUnpublish = (id: string) => {
    unpublishMutation.mutate(id);
  };

  const handleEdit = (id: string) => {
    router.push(`/ai-tutors/${id}/edit`);
  };

  const handleArchive = (id: string) => {
    archiveMutation.mutate(id);
  };

  // Export AI tutors to CSV
  const handleExportCSV = () => {
    const headers = ['Name', 'Subject', 'Status', 'Subscription', 'Price/Hour', 'Sessions', 'Revenue', 'Rating', 'Created'];
    const rows = aiTutors.map(t => [
      t.display_name,
      t.subject,
      t.status,
      t.subscription_status,
      `£${t.price_per_hour}`,
      t.total_sessions || 0,
      `£${(t.total_revenue || 0).toFixed(2)}`,
      t.avg_rating ? `${t.avg_rating.toFixed(1)}/5 (${t.total_reviews})` : 'No reviews',
      new Date(t.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-tutors-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('AI tutors exported to CSV');
    setShowActionsMenu(false);
  };

  if (userLoading || roleLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="AI Tutor Studio" />}
        sidebar={
          <HubSidebar>
            <div style={{ padding: '1rem' }}>
              <div style={{ height: 120, background: '#f3f4f6', borderRadius: '8px', marginBottom: '1rem' }} />
              <div style={{ height: 100, background: '#f3f4f6', borderRadius: '8px', marginBottom: '1rem' }} />
              <div style={{ height: 80, background: '#f3f4f6', borderRadius: '8px' }} />
            </div>
          </HubSidebar>
        }
        tabs={
          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ width: 100, height: 32, background: '#f3f4f6', borderRadius: '8px' }} />
              ))}
            </div>
          </div>
        }
      >
        <div style={{ padding: '1rem' }}>
          {[1, 2, 3, 4].map(i => (
            <AITutorSkeleton key={i} />
          ))}
        </div>
      </HubPageLayout>
    );
  }

  if (!isAllowed) return null;

  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="AI Tutor Studio" />}
        sidebar={<HubSidebar><AITutorHelpWidget /></HubSidebar>}
      >
        <HubEmptyState
          title="Error loading AI tutors"
          description={(error as Error).message}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="AI Tutor Studio"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search AI tutors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <UnifiedSelect
                value={sortBy}
                onChange={(value) => setSortBy(String(value) as SortType)}
                options={[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'price-high', label: 'Price: High to Low' },
                  { value: 'price-low', label: 'Price: Low to High' },
                  { value: 'revenue-high', label: 'Revenue: High to Low' },
                  { value: 'sessions-high', label: 'Sessions: High to Low' },
                ]}
                placeholder="Sort by"
              />
            </div>
          }
          actions={
            <>
              <Button variant="primary" size="sm" onClick={() => router.push('/ai-tutors/new')}>
                Create AI Tutor
              </Button>
              <div className={actionStyles.dropdownContainer}>
                <Button variant="secondary" size="sm" square onClick={() => setShowActionsMenu(!showActionsMenu)}>
                  &#8942;
                </Button>
                {showActionsMenu && (
                  <>
                    <div className={actionStyles.backdrop} onClick={() => setShowActionsMenu(false)} />
                    <div className={actionStyles.dropdownMenu}>
                      <button onClick={() => { refetch(); setShowActionsMenu(false); }} className={actionStyles.menuButton}>
                        Refresh
                      </button>
                      <button onClick={handleExportCSV} className={actionStyles.menuButton}>
                        Export CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All', count: tabCounts.all, active: filter === 'all' },
            { id: 'published', label: 'Published', count: tabCounts.published, active: filter === 'published' },
            { id: 'draft', label: 'Drafts', count: tabCounts.draft, active: filter === 'draft' },
            { id: 'unpublished', label: 'Unpublished', count: tabCounts.unpublished, active: filter === 'unpublished' },
            { id: 'archived', label: 'Archived', count: tabCounts.archived, active: filter === 'archived' },
          ]}
          onTabChange={(tabId) => handleFilterChange(tabId as FilterType)}
        />
      }
      sidebar={
        <HubSidebar>
          <AITutorStatsWidget aiTutors={aiTutors} isLoading={isLoading} />
          <AITutorLimitsWidget />
          <AITutorHelpWidget />
          <AITutorTipsWidget />
        </HubSidebar>
      }
    >
      {isFetching && !isLoading && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          padding: '8px 16px',
          background: '#006C67',
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            border: '2px solid white',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }} />
          Updating...
        </div>
      )}

      {isLoading && (
        <div className={styles.tutorsList}>
          {[1, 2, 3, 4].map(i => (
            <AITutorSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && paginatedTutors.length === 0 && !searchQuery && (
        <HubEmptyState
          title="No AI tutors found"
          description={
            filter === 'all'
              ? 'Create your first AI tutor to start earning passive income.'
              : `No ${filter} AI tutors found.`
          }
          actionLabel={filter === 'all' ? 'Create Your First AI Tutor' : undefined}
          onAction={filter === 'all' ? () => router.push('/ai-tutors/new') : undefined}
        />
      )}

      {!isLoading && paginatedTutors.length === 0 && searchQuery && (
        <HubEmptyState
          title="No results found"
          description={`No AI tutors match "${searchQuery}".`}
        />
      )}

      {!isLoading && paginatedTutors.length > 0 && (
        <div className={styles.tutorsList}>
          {paginatedTutors.map((tutor) => (
            <AITutorCard
              key={tutor.id}
              aiTutor={tutor}
              onDelete={handleDelete}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onEdit={handleEdit}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      <div className={styles.paginationContainer}>
        <HubPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </HubPageLayout>
  );
}
