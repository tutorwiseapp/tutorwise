/**
 * Filename: apps/web/src/app/(authenticated)/sage/history/page.tsx
 * Purpose: Sage session history page
 * Route: /sage/history
 * Created: 2026-02-14
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import SageProgressWidget from '../../../../components/feature/sage/widgets/SageProgressWidget';
import SageHelpWidget from '../../../../components/feature/sage/widgets/SageHelpWidget';
import SageTipsWidget from '../../../../components/feature/sage/widgets/SageTipsWidget';
import SageVideoWidget from '../../../../components/feature/sage/widgets/SageVideoWidget';
import styles from '../page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type SortType = 'date-desc' | 'date-asc' | 'messages';

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'messages', label: 'Most Messages' },
];

const ITEMS_PER_PAGE = 10;

interface SessionSummary {
  sessionId: string;
  subject?: string;
  level?: string;
  topicsCovered: string[];
  messageCount: number;
  startedAt: string;
  lastActivityAt: string;
  status: string;
}

export default function SageHistoryPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('date-desc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Fetch history with gold standard react-query config
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sage-history', profile?.id, currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const res = await fetch(`/api/sage/history?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
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

  const allSessions: SessionSummary[] = data?.sessions || [];

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = [...allSessions];

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((session) => {
        const subject = session.subject?.toLowerCase() || '';
        const topics = session.topicsCovered.join(' ').toLowerCase();
        return subject.includes(query) || topics.includes(query);
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        case 'date-asc':
          return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
        case 'messages':
          return b.messageCount - a.messageCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [allSessions, searchQuery, sortBy]);

  const totalItems = data?.total || 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSubjectLabel = (subject?: string) => {
    switch (subject) {
      case 'maths': return 'Mathematics';
      case 'english': return 'English';
      case 'science': return 'Science';
      default: return 'General';
    }
  };

  // Loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Sage" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading history...</div>
      </HubPageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Sage" />}
        sidebar={<HubSidebar><SageHelpWidget /></HubSidebar>}
      >
        <div className={styles.error}>
          <p>Failed to load history. Please try again.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  const handleNewSession = () => {
    router.push('/sage');
    setShowActionsMenu(false);
  };

  const handleExportHistory = () => {
    // TODO: Implement export
    setShowActionsMenu(false);
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Sage"
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
            <>
              <Button variant="primary" size="sm" onClick={handleNewSession}>
                New Session
              </Button>
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  square
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ...
                </Button>
                {showActionsMenu && (
                  <>
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={handleExportHistory}
                        className={actionStyles.menuButton}
                      >
                        Export History
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
            { id: 'chat', label: 'Chat', href: '/sage' },
            { id: 'history', label: 'History', active: true },
            { id: 'progress', label: 'Progress', href: '/sage/progress' },
            { id: 'materials', label: 'Materials', href: '/sage/materials' },
          ]}
          onTabChange={(tabId) => {
            if (tabId !== 'history') {
              router.push(tabId === 'chat' ? '/sage' : `/sage/${tabId}`);
            }
          }}
        />
      }
      sidebar={
        <HubSidebar>
          <SageProgressWidget studentId={profile?.id} />
          <SageHelpWidget />
          <SageTipsWidget />
          <SageVideoWidget />
        </HubSidebar>
      }
    >
      {filteredSessions.length === 0 ? (
        <HubEmptyState
          title={searchQuery ? "No matching sessions" : "No sessions yet"}
          description={searchQuery
            ? "Try adjusting your search terms."
            : "Start a learning session with Sage to see your history here."
          }
          actionLabel={searchQuery ? undefined : "Start Learning"}
          onAction={searchQuery ? undefined : () => router.push('/sage')}
        />
      ) : (
        <>
          <div className={styles.sessionList}>
            {filteredSessions.map((session) => (
              <HubDetailCard
                key={session.sessionId}
                image={{
                  src: '/images/sage-avatar.png',
                  alt: 'Sage',
                  fallbackChar: 'S',
                }}
                title={getSubjectLabel(session.subject)}
                status={{
                  label: session.status === 'active' ? 'Active' : 'Ended',
                  variant: session.status === 'active' ? 'success' : 'neutral',
                }}
                description={`${session.messageCount} messages`}
                details={[
                  { label: 'Started', value: formatDate(session.startedAt) },
                  { label: 'Last Activity', value: formatDate(session.lastActivityAt) },
                  { label: 'Level', value: session.level || 'Not set' },
                  {
                    label: 'Topics',
                    value: session.topicsCovered.length > 0
                      ? session.topicsCovered.slice(0, 3).join(', ')
                      : 'None recorded',
                  },
                ]}
                actions={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/sage?session=${session.sessionId}`)}
                  >
                    View Session
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
