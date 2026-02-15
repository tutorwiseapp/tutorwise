/**
 * VirtualSpace Session List Page (v5.9)
 *
 * Shows the user's VirtualSpace sessions with ability to:
 * - Create new standalone sessions
 * - View active/completed sessions
 * - Join existing sessions
 *
 * @path /virtualspace
 * Architecture: Hub Gold Standard (following bookings pattern)
 */

'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { Plus, Video, Users, Clock, ExternalLink, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import type { VirtualSpaceSessionListItem } from '@/lib/virtualspace';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import VirtualSpaceSkeleton from './components/VirtualSpaceSkeleton';
import VirtualSpaceStatsWidget from './components/VirtualSpaceStatsWidget';
import VirtualSpaceHelpWidget from './components/VirtualSpaceHelpWidget';
import VirtualSpaceTipWidget from './components/VirtualSpaceTipWidget';
import VirtualSpaceVideoWidget from './components/VirtualSpaceVideoWidget';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type FilterType = 'all' | 'active' | 'completed';
type SortType = 'date-desc' | 'date-asc' | 'name';

const ITEMS_PER_PAGE = 6;

// Fetch sessions from API
async function fetchSessions(status?: string): Promise<VirtualSpaceSessionListItem[]> {
  const params = new URLSearchParams();
  if (status && status !== 'all') {
    params.set('status', status);
  }

  const response = await fetch(`/api/virtualspace/sessions?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }

  const data = await response.json();
  return data.sessions || [];
}

export default function VirtualSpaceListPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('date-desc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Read filter from URL (URL is single source of truth)
  const filter = (searchParams?.get('filter') as FilterType) || 'all';

  // React Query: Fetch sessions with automatic retry, caching, and background refetch
  const {
    data: sessions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['virtualspace-sessions', profile?.id],
    queryFn: () => fetchSessions(),
    enabled: !!profile?.id,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    // Tab-based filtering
    if (filter === 'active') {
      filtered = filtered.filter((s) => s.status === 'active');
    } else if (filter === 'completed') {
      filtered = filtered.filter((s) => s.status === 'completed');
    }

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) => s.title?.toLowerCase().includes(query));
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        case 'date-asc':
          return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [sessions, filter, searchQuery, sortBy]);

  // Calculate tab counts
  const tabCounts = useMemo(
    () => ({
      all: sessions.length,
      active: sessions.filter((s) => s.status === 'active').length,
      completed: sessions.filter((s) => s.status === 'completed').length,
    }),
    [sessions]
  );

  // Pagination logic
  const totalItems = filteredSessions.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filter, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, sortBy]);

  // Update URL when filter changes
  const handleFilterChange = (newFilter: FilterType) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', newFilter);
    }
    router.push(`/virtualspace${params.toString() ? `?${params.toString()}` : ''}`, {
      scroll: false,
    });
  };

  // Create new standalone session
  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/virtualspace/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Whiteboard Session' }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Session created!');
        router.push(`/virtualspace/${data.sessionId}`);
      } else {
        throw new Error('Failed to create session');
      }
    } catch (err) {
      toast.error('Failed to create session');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  // Copy invite link
  const handleCopyInviteLink = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/virtualspace/${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Session link copied!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
    setShowActionsMenu(false);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get mode badge color (using design system colors)
  const getModeStyles = (mode: string) => {
    switch (mode) {
      case 'standalone':
        return styles.modeStandalone;
      case 'booking':
        return styles.modeBooking;
      case 'free_help':
        return styles.modeFreeHelp;
      default:
        return styles.modeDefault;
    }
  };

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="VirtualSpace" />}
        sidebar={
          <HubSidebar>
            <VirtualSpaceStatsWidget active={0} completed={0} total={0} />
            <VirtualSpaceHelpWidget />
            <VirtualSpaceTipWidget />
            <VirtualSpaceVideoWidget />
          </HubSidebar>
        }
      >
        <VirtualSpaceSkeleton />
      </HubPageLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="VirtualSpace" />}
        sidebar={
          <HubSidebar>
            <VirtualSpaceStatsWidget active={0} completed={0} total={0} />
            <VirtualSpaceHelpWidget />
            <VirtualSpaceTipWidget />
            <VirtualSpaceVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.errorContainer}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#ef4444' }}>
            error
          </span>
          <h2>Failed to load sessions</h2>
          <p>{(error as Error).message || 'Please try again.'}</p>
          <Button variant="primary" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="VirtualSpace"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />

              {/* Sort Dropdown */}
              <UnifiedSelect
                value={sortBy}
                onChange={(value) => setSortBy(value as SortType)}
                options={[
                  { value: 'date-desc', label: 'Recent First' },
                  { value: 'date-asc', label: 'Oldest First' },
                  { value: 'name', label: 'By Name' },
                ]}
                placeholder="Sort by"
              />
            </div>
          }
          actions={
            <>
              {/* Primary Action Button */}
              <Button variant="primary" size="sm" onClick={handleCreateSession} disabled={isCreating}>
                <Plus size={16} />
                {isCreating ? 'Creating...' : 'New Session'}
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  square
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div className={actionStyles.backdrop} onClick={() => setShowActionsMenu(false)} />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={() => {
                          refetch();
                          toast.success('Sessions refreshed');
                          setShowActionsMenu(false);
                        }}
                        className={actionStyles.menuButton}
                      >
                        Refresh Sessions
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
            { id: 'all', label: 'All Sessions', count: tabCounts.all, active: filter === 'all' },
            { id: 'active', label: 'Active', count: tabCounts.active, active: filter === 'active' },
            {
              id: 'completed',
              label: 'Completed',
              count: tabCounts.completed,
              active: filter === 'completed',
            },
          ]}
          onTabChange={(tabId) => handleFilterChange(tabId as FilterType)}
        />
      }
      sidebar={
        <HubSidebar>
          {/* VirtualSpace stats widget - always visible */}
          <VirtualSpaceStatsWidget
            active={tabCounts.active}
            completed={tabCounts.completed}
            total={tabCounts.all}
          />

          {/* Help, Tip, Video widgets */}
          <VirtualSpaceHelpWidget />
          <VirtualSpaceTipWidget />
          <VirtualSpaceVideoWidget />
        </HubSidebar>
      }
    >
      {/* Empty State */}
      {paginatedSessions.length === 0 && (
        <HubEmptyState
          icon={<Video size={48} />}
          title="No sessions found"
          description={
            filter === 'active'
              ? 'You have no active sessions.'
              : filter === 'completed'
                ? 'You have no completed sessions.'
                : 'Create your first whiteboard session to get started.'
          }
          actionLabel="Create Session"
          onAction={handleCreateSession}
        />
      )}

      {/* Sessions Grid */}
      {paginatedSessions.length > 0 && (
        <div className={styles.sessionsGrid}>
          {paginatedSessions.map((session) => (
            <div
              key={session.id}
              className={styles.sessionCard}
              onClick={() => router.push(`/virtualspace/${session.id}`)}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.sessionTitle}>{session.title}</h3>
                <span className={`${styles.modeBadge} ${getModeStyles(session.mode)}`}>
                  {session.mode.replace('_', ' ')}
                </span>
              </div>

              <div className={styles.sessionMeta}>
                <span className={styles.metaItem}>
                  <Users size={14} />
                  {session.participantCount}
                </span>
                <span className={styles.metaItem}>
                  <Clock size={14} />
                  {formatRelativeTime(session.lastActivityAt)}
                </span>
                {session.isOwner && <span className={styles.ownerBadge}>Owner</span>}
              </div>

              <div className={styles.cardActions}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    router.push(`/virtualspace/${session.id}`);
                  }}
                >
                  <ExternalLink size={14} />
                  Join
                </Button>
                {session.mode === 'standalone' && session.isOwner && (
                  <Button
                    variant="secondary"
                    size="sm"
                    square
                    onClick={(e: React.MouseEvent) => handleCopyInviteLink(session.id, e)}
                    title="Copy invite link"
                  >
                    <Copy size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
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
