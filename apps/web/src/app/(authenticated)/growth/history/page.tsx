/**
 * Filename: apps/web/src/app/(authenticated)/growth/history/page.tsx
 * Purpose: Growth Agent session history page
 * Route: /growth/history
 * Created: 2026-03-04
 *
 * Architecture: Hub Layout pattern — mirrors sage/history/page.tsx
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/components/hub/layout';
import HubSidebar from '@/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/components/hub/content/HubEmptyState';
import HubDetailCard from '@/components/hub/content/HubDetailCard/HubDetailCard';
import Button from '@/components/ui/actions/Button';
import UnifiedSelect from '@/components/ui/forms/UnifiedSelect';
import {
  GrowthSubscriptionWidget,
  GrowthHelpWidget,
  GrowthTipsWidget,
} from '@/components/feature/growth/widgets';
import { useGrowthBilling } from '@/app/hooks/useGrowthBilling';
import styles from '../page.module.css';
import filterStyles from '@/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/components/hub/styles/hub-actions.module.css';

type SortType = 'date-desc' | 'date-asc' | 'questions';

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'questions', label: 'Most Questions' },
];

const ITEMS_PER_PAGE = 10;

interface GrowthSession {
  sessionId: string;
  questionCount: number;
  startedAt: string;
  lastActivityAt: string;
  modelUsed: string | null;
}

export default function GrowthHistoryPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const { subscription } = useGrowthBilling();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('date-desc');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['growth-history', profile?.id, currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const res = await fetch(`/api/growth/history?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const allSessions: GrowthSession[] = data?.sessions || [];

  const filteredSessions = useMemo(() => {
    let filtered = [...allSessions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        s.sessionId.toLowerCase().includes(query) ||
        (s.modelUsed?.toLowerCase().includes(query) ?? false)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        case 'date-asc':
          return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
        case 'questions':
          return b.questionCount - a.questionCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allSessions, searchQuery, sortBy]);

  const totalItems = data?.total || 0;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Growth" />}
        sidebar={<HubSidebar><div className={styles.skeletonWidget} /></HubSidebar>}
      >
        <div className={styles.loading}>Loading history...</div>
      </HubPageLayout>
    );
  }

  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Growth" />}
        sidebar={<HubSidebar><GrowthHelpWidget /></HubSidebar>}
      >
        <div className={styles.error}>
          <p>Failed to load history. Please try again.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>Try Again</Button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Growth"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <UnifiedSelect
                value={sortBy}
                onChange={(value) => setSortBy(value as SortType)}
                options={SORT_OPTIONS}
                placeholder="Sort by"
              />
            </div>
          }
          actions={
            <Button variant="primary" size="sm" onClick={() => router.push('/growth')}>
              New Session
            </Button>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'chat', label: 'Chat', href: '/growth' },
            { id: 'history', label: 'History', active: true },
            { id: 'billing', label: 'Billing', href: '/growth/billing' },
          ]}
          onTabChange={(tabId) => {
            if (tabId !== 'history') router.push(tabId === 'chat' ? '/growth' : `/growth/${tabId}`);
          }}
        />
      }
      sidebar={
        <HubSidebar>
          <GrowthSubscriptionWidget subscription={subscription} />
          <GrowthHelpWidget />
          <GrowthTipsWidget role={profile?.active_role} />
        </HubSidebar>
      }
    >
      {filteredSessions.length === 0 ? (
        <HubEmptyState
          title={searchQuery ? 'No matching sessions' : 'No sessions yet'}
          description={
            searchQuery
              ? 'Try adjusting your search terms.'
              : 'Start a conversation with Growth to see your history here.'
          }
          actionLabel={searchQuery ? undefined : 'Start Session'}
          onAction={searchQuery ? undefined : () => router.push('/growth')}
        />
      ) : (
        <>
          <div className={styles.sessionList}>
            {filteredSessions.map((session) => (
              <HubDetailCard
                key={session.sessionId}
                image={{ src: '', alt: 'Growth', fallbackChar: 'G' }}
                title={`Growth Session`}
                description={`${session.questionCount} ${session.questionCount === 1 ? 'question' : 'questions'}`}
                details={[
                  { label: 'Started', value: formatDate(session.startedAt) },
                  { label: 'Last Activity', value: formatDate(session.lastActivityAt) },
                  ...(session.modelUsed ? [{ label: 'Model', value: session.modelUsed }] : []),
                ]}
                actions={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push('/growth')}
                  >
                    New Session
                  </Button>
                }
              />
            ))}
          </div>
          {totalItems > ITEMS_PER_PAGE && (
            <HubPagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </HubPageLayout>
  );
}
