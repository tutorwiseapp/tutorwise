/**
 * Filename: apps/web/src/app/(authenticated)/ai-agents/[id]/page.tsx
 * Purpose: AI Tutor detail page - manage individual AI tutor
 * Route: /ai-agents/[id]
 * Created: 2026-02-23
 * Architecture: Hub Layout pattern with HubPageLayout + HubTabs
 */

'use client';

import React, { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import OverviewTab from '@/app/components/feature/ai-agents/detail/OverviewTab';
import MaterialsTab from '@/app/components/feature/ai-agents/detail/MaterialsTab';
import LinksTab from '@/app/components/feature/ai-agents/detail/LinksTab';
import SessionsTab from '@/app/components/feature/ai-agents/detail/SessionsTab';
import AnalyticsTab from '@/app/components/feature/ai-agents/detail/AnalyticsTab';
import SettingsTab from '@/app/components/feature/ai-agents/detail/SettingsTab';
import AgentTypeBadge from '@/app/components/ai-agents/AgentTypeBadge';
import AIAgentStatsWidget from '@/app/components/feature/ai-agents/AIAgentStatsWidget';
import AIAgentHelpWidget from '@/app/components/feature/ai-agents/AIAgentHelpWidget';
import AIAgentTipsWidget from '@/app/components/feature/ai-agents/AIAgentTipsWidget';
import toast from 'react-hot-toast';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type TabId = 'overview' | 'materials' | 'links' | 'sessions' | 'analytics' | 'settings';

export default function AIAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['tutor', 'agent']);
  const [showActionsMenu, setShowActionsMenu] = React.useState(false);

  const activeTab = (searchParams?.get('tab') as TabId) || 'overview';
  const shouldPublish = searchParams?.get('publish') === 'true';

  const {
    data: aiTutor,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ai-tutor', id],
    queryFn: async () => {
      const res = await fetch(`/api/ai-agents/${id}`);
      if (!res.ok) throw new Error('Failed to fetch AI tutor');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });

  const { data: subscription } = useQuery({
    queryKey: ['ai-tutor-subscription', id],
    queryFn: async () => {
      const res = await fetch(`/api/ai-agents/${id}/subscription`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabId);
    params.delete('publish');
    router.push(`/ai-agents/${id}?${params.toString()}`, { scroll: false });
  };

  const handlePublish = async () => {
    try {
      const res = await fetch(`/api/ai-agents/${id}/publish`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish');
      }
      toast.success('AI tutor published to marketplace!');
      refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleUnpublish = async () => {
    try {
      const res = await fetch(`/api/ai-agents/${id}/unpublish`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to unpublish');
      toast.success('AI tutor unpublished');
      refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this AI tutor? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/ai-agents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('AI tutor deleted');
      router.push('/ai-agents');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (userLoading || roleLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="AI Tutor" />}
        sidebar={<HubSidebar><div style={{ height: 200 }} /></HubSidebar>}
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </HubPageLayout>
    );
  }

  if (!isAllowed) return null;

  if (error || !aiTutor) {
    return (
      <HubPageLayout
        header={<HubHeader title="AI Tutor" />}
        sidebar={<HubSidebar><AIAgentHelpWidget /></HubSidebar>}
      >
        <HubEmptyState
          title="AI Tutor not found"
          description="This AI tutor could not be loaded."
          actionLabel="Back to AI Tutors"
          onAction={() => router.push('/ai-agents')}
        />
      </HubPageLayout>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            aiTutor={aiTutor}
            subscription={subscription}
            shouldPublish={shouldPublish}
            onRefresh={refetch}
          />
        );
      case 'materials':
        return <MaterialsTab aiAgentId={id} hasSubscription={subscription?.status === 'active'} />;
      case 'links':
        return <LinksTab aiAgentId={id} hasSubscription={subscription?.status === 'active'} />;
      case 'sessions':
        return <SessionsTab aiAgentId={id} />;
      case 'analytics':
        return <AnalyticsTab aiAgentId={id} />;
      case 'settings':
        return (
          <SettingsTab
            aiTutor={aiTutor}
            subscription={subscription}
            onDelete={handleDelete}
            onUpdate={() => refetch()}
          />
        );
      default:
        return null;
    }
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {aiTutor.display_name}
              <AgentTypeBadge type={aiTutor.agent_type || 'tutor'} size="md" />
            </span>
          }
          actions={
            <>
              {aiTutor.status === 'draft' && subscription?.status === 'active' && (
                <Button variant="primary" size="sm" onClick={handlePublish}>
                  Publish
                </Button>
              )}
              {aiTutor.status === 'published' && (
                <Button variant="secondary" size="sm" onClick={handleUnpublish}>
                  Unpublish
                </Button>
              )}
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
                      <button onClick={() => { handleDelete(); setShowActionsMenu(false); }} className={actionStyles.menuButton}>
                        Delete AI Tutor
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
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'materials', label: 'Materials', active: activeTab === 'materials' },
            { id: 'links', label: 'Links', active: activeTab === 'links' },
            { id: 'sessions', label: 'Sessions', active: activeTab === 'sessions' },
            { id: 'analytics', label: 'Analytics', active: activeTab === 'analytics' },
            { id: 'settings', label: 'Settings', active: activeTab === 'settings' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <AIAgentStatsWidget aiTutors={[aiTutor]} isLoading={false} />
          <AIAgentHelpWidget />
          <AIAgentTipsWidget />
        </HubSidebar>
      }
    >
      {renderTab()}
    </HubPageLayout>
  );
}
