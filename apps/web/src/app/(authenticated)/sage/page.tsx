/**
 * Filename: apps/web/src/app/(authenticated)/sage/page.tsx
 * Purpose: Sage AI Tutor main page - chat interface with subject selection
 * Route: /sage
 * Created: 2026-02-14
 * Design: Hub Layout pattern with HubPageLayout
 *
 * Architecture: Hub Layout pattern - top-level feature
 * Shell: HubPageLayout + HubHeader + HubTabs + HubSidebar
 */

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import { SageChat } from '@/components/feature/sage';
import SageProgressWidget from '../../../components/feature/sage/widgets/SageProgressWidget';
import SageHelpWidget from '../../../components/feature/sage/widgets/SageHelpWidget';
import SageTipsWidget from '../../../components/feature/sage/widgets/SageTipsWidget';
import SageVideoWidget from '../../../components/feature/sage/widgets/SageVideoWidget';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type SubjectType = 'maths' | 'english' | 'science' | 'general';
type LevelType = 'primary' | 'ks3' | 'gcse' | 'a-level' | 'university' | 'adult';

const SUBJECTS = [
  { value: 'maths', label: 'Mathematics' },
  { value: 'english', label: 'English' },
  { value: 'science', label: 'Science' },
  { value: 'general', label: 'General' },
];

const LEVELS = [
  { value: 'primary', label: 'Primary (KS1-KS2)' },
  { value: 'ks3', label: 'Key Stage 3' },
  { value: 'gcse', label: 'GCSE' },
  { value: 'a-level', label: 'A-Level' },
  { value: 'university', label: 'University' },
  { value: 'adult', label: 'Adult Learner' },
];

export default function SagePage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [subject, setSubject] = useState<SubjectType>(
    (searchParams?.get('subject') as SubjectType) || 'general'
  );
  const [level, setLevel] = useState<LevelType>(
    (searchParams?.get('level') as LevelType) || 'gcse'
  );
  const [sessionStarted, setSessionStarted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Capabilities query with gold standard config
  const { data: _capabilities } = useQuery({
    queryKey: ['sage-capabilities'],
    queryFn: async () => {
      const res = await fetch('/api/sage/capabilities');
      if (!res.ok) throw new Error('Failed to fetch capabilities');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Update URL when subject/level changes
  const handleSubjectChange = (value: string | number) => {
    const strValue = String(value);
    setSubject(strValue as SubjectType);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('subject', strValue);
    router.push(`/sage?${params.toString()}`);
  };

  const handleLevelChange = (value: string | number) => {
    const strValue = String(value);
    setLevel(strValue as LevelType);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('level', strValue);
    router.push(`/sage?${params.toString()}`);
  };

  const handleNewSession = () => {
    setSessionStarted(false);
    setShowActionsMenu(false);
    // Reset and start fresh
    setTimeout(() => setSessionStarted(true), 100);
  };

  const handleViewHistory = () => {
    router.push('/sage/history');
    setShowActionsMenu(false);
  };

  const handleViewProgress = () => {
    router.push('/sage/progress');
    setShowActionsMenu(false);
  };

  // Loading state
  if (profileLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Sage" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading Sage...</div>
      </HubPageLayout>
    );
  }

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
                value={subject}
                onChange={handleSubjectChange}
                options={SUBJECTS}
                placeholder="Subject"
              />
              <UnifiedSelect
                value={level}
                onChange={handleLevelChange}
                options={LEVELS}
                placeholder="Level"
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
                  ⋮
                </Button>
                {showActionsMenu && (
                  <>
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={handleViewHistory}
                        className={actionStyles.menuButton}
                      >
                        View History
                      </button>
                      <button
                        onClick={handleViewProgress}
                        className={actionStyles.menuButton}
                      >
                        View Progress
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
            { id: 'chat', label: 'Chat', active: true },
            { id: 'history', label: 'History', href: '/sage/history' },
            { id: 'progress', label: 'Progress', href: '/sage/progress' },
            { id: 'materials', label: 'Materials', href: '/sage/materials' },
          ]}
          onTabChange={(tabId) => {
            if (tabId !== 'chat') {
              router.push(`/sage/${tabId}`);
            }
          }}
        />
      }
      sidebar={
        <HubSidebar>
          <SageProgressWidget studentId={profile?.id} />
          <SageHelpWidget />
          <SageTipsWidget subject={subject} />
          <SageVideoWidget subject={subject} />
        </HubSidebar>
      }
    >
      {!sessionStarted ? (
        <HubEmptyState
          title="Ready to Learn with Sage"
          description={`Select a subject and level above, then start your AI tutoring session. Sage will help you with ${subject === 'general' ? 'any subject' : subject}.`}
          actionLabel="Start Session"
          onAction={() => setSessionStarted(true)}
        />
      ) : (
        <div className={styles.chatContainer}>
          <SageChat
            subject={subject}
            level={level}
            autoStart={true}
            streaming={true}
            onSessionStart={() => setSessionStarted(true)}
          />
        </div>
      )}
    </HubPageLayout>
  );
}
