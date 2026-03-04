/**
 * Filename: apps/web/src/app/(authenticated)/growth/page.tsx
 * Purpose: Growth Agent main page — business growth advisor chat
 * Route: /growth
 * Created: 2026-03-05
 *
 * Architecture: Hub Layout pattern — mirrors sage/page.tsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import GrowthChat from '@/components/feature/growth/GrowthChat';
import {
  GrowthStatsWidget,
  GrowthSubscriptionWidget,
  GrowthHelpWidget,
  GrowthTipsWidget,
  GrowthVideoWidget,
} from '@/components/feature/growth/widgets';
import { useGrowthBilling } from '@/app/hooks/useGrowthBilling';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

export default function GrowthPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription } = useGrowthBilling();
  const [sessionStarted, setSessionStarted] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const sub = searchParams?.get('subscription');
    if (sub === 'success') {
      console.log('[Growth] Subscription activated');
    }
  }, [searchParams]);

  const handleNewSession = () => {
    setSessionStarted(false);
    setShowActionsMenu(false);
    setTimeout(() => setSessionStarted(true), 100);
  };

  const handleUpgrade = () => {
    router.push('/growth/billing');
    setShowActionsMenu(false);
  };

  if (profileLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Growth" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading Growth advisor...</div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Growth"
          subtitle="AI-powered business growth advisor"
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
                      <button onClick={handleUpgrade} className={actionStyles.menuButton}>
                        {subscription ? 'Manage Subscription' : 'Upgrade to Growth Pro'}
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
            { id: 'billing', label: 'Billing', href: '/growth/billing' },
          ]}
          onTabChange={(tabId) => {
            if (tabId !== 'chat') router.push(`/growth/${tabId}`);
          }}
        />
      }
      sidebar={
        <HubSidebar>
          <GrowthStatsWidget profileId={profile?.id} subscription={subscription} />
          <GrowthSubscriptionWidget subscription={subscription} />
          <GrowthHelpWidget />
          <GrowthTipsWidget role={profile?.active_role} />
          <GrowthVideoWidget role={profile?.active_role} />
        </HubSidebar>
      }
    >
      <div className={styles.chatContainer}>
        {sessionStarted && (
          <GrowthChat
            autoStart={true}
            streaming={true}
            onSessionStart={() => setSessionStarted(true)}
          />
        )}
      </div>
    </HubPageLayout>
  );
}
