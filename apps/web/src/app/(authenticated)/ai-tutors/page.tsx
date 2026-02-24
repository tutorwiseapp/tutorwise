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
import toast from 'react-hot-toast';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import styles from './page.module.css';

type FilterType = 'all' | 'published' | 'draft' | 'unpublished';
type SortType = 'newest' | 'oldest' | 'revenue-high' | 'sessions-high';

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
}

export default function AITutorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { profile, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);

  const filter = (searchParams?.get('filter') as FilterType) || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const {
    data: aiTutors = [],
    isLoading,
    error,
    refetch,
  } = useQuery<AITutor[]>({
    queryKey: ['ai-tutors'],
    queryFn: async () => {
      const res = await fetch('/api/ai-tutors');
      if (!res.ok) throw new Error('Failed to fetch AI tutors');
      return res.json();
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    retry: 2,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai-tutors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      toast.success('AI tutor deleted');
      queryClient.invalidateQueries({ queryKey: ['ai-tutors'] });
    },
    onError: () => toast.error('Failed to delete AI tutor'),
  });

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
      queryClient.invalidateQueries({ queryKey: ['ai-tutors'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai-tutors/${id}/unpublish`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to unpublish');
    },
    onSuccess: () => {
      toast.success('AI tutor unpublished');
      queryClient.invalidateQueries({ queryKey: ['ai-tutors'] });
    },
    onError: () => toast.error('Failed to unpublish AI tutor'),
  });

  const tabCounts = useMemo(() => ({
    all: aiTutors.length,
    published: aiTutors.filter(t => t.status === 'published').length,
    draft: aiTutors.filter(t => t.status === 'draft').length,
    unpublished: aiTutors.filter(t => t.status === 'unpublished').length,
  }), [aiTutors]);

  const filteredTutors = useMemo(() => {
    let result = aiTutors;
    if (filter !== 'all') {
      result = result.filter(t => t.status === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.display_name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
      );
    }
    return result;
  }, [aiTutors, filter, searchQuery]);

  const sortedTutors = useMemo(() => {
    const sorted = [...filteredTutors];
    switch (sortBy) {
      case 'newest': return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest': return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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

  if (userLoading || roleLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="AI Tutor Studio" />}
        sidebar={<HubSidebar><div style={{ height: 200 }} /></HubSidebar>}
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
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
      {paginatedTutors.length === 0 && !searchQuery && (
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

      {paginatedTutors.length === 0 && searchQuery && (
        <HubEmptyState
          title="No results found"
          description={`No AI tutors match "${searchQuery}".`}
        />
      )}

      {paginatedTutors.length > 0 && (
        <div className={styles.tutorsList}>
          {paginatedTutors.map((tutor) => (
            <AITutorCard
              key={tutor.id}
              aiTutor={tutor}
              onDelete={handleDelete}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
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
