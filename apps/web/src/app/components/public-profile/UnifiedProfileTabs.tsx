/**
 * Filename: apps/web/src/app/components/public-profile/UnifiedProfileTabs.tsx
 * Purpose: Unified 3-tab structure for all public profiles (v4.8)
 * Created: 2025-11-10
 *
 * Features:
 * - Consistent 3-tab layout: About | Services | Reviews
 * - Role-aware content within each tab
 * - Matches hub page tab styling (underline design)
 */
'use client';

import React, { useState } from 'react';
import type { Profile } from '@/types';
import TutorNarrative from '../profile/TutorNarrative';
import ClientProfessionalInfo from '../profile/ClientProfessionalInfo';
import AgentProfessionalInfo from '../profile/AgentProfessionalInfo';
import styles from './UnifiedProfileTabs.module.css';

interface UnifiedProfileTabsProps {
  profile: Profile;
}

type TabId = 'about' | 'services' | 'reviews';

export function UnifiedProfileTabs({ profile }: UnifiedProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('about');

  const tabs = [
    { id: 'about' as TabId, label: 'About' },
    { id: 'services' as TabId, label: 'Services' },
    { id: 'reviews' as TabId, label: 'Reviews' },
  ];

  const renderAboutTab = () => {
    const role = profile.active_role;

    switch (role) {
      case 'tutor':
        return <TutorNarrative profile={profile} isEditable={false} />;
      case 'client':
        return <ClientProfessionalInfo profile={profile} isEditable={false} />;
      case 'agent':
        return <AgentProfessionalInfo profile={profile} isEditable={false} />;
      default:
        return (
          <div className={styles.emptyState}>
            <p>Profile information not available</p>
          </div>
        );
    }
  };

  const renderServicesTab = () => {
    const role = profile.active_role;

    // TODO: Implement services tab for each role
    return (
      <div className={styles.placeholderContent}>
        <h3>Services</h3>
        {role === 'tutor' && <p>Tutor&apos;s active listings will appear here</p>}
        {role === 'client' && <p>Client&apos;s lesson requests will appear here</p>}
        {role === 'agent' && <p>Agent&apos;s managed tutors and listings will appear here</p>}
        <p className={styles.comingSoon}>Coming in Phase 4</p>
      </div>
    );
  };

  const renderReviewsTab = () => {
    // TODO: Fetch and display reviews
    return (
      <div className={styles.placeholderContent}>
        <h3>Reviews</h3>
        <p>Reviews received by {profile.full_name} will appear here</p>
        <p className={styles.comingSoon}>Coming in Phase 4</p>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return renderAboutTab();
      case 'services':
        return renderServicesTab();
      case 'reviews':
        return renderReviewsTab();
      default:
        return null;
    }
  };

  return (
    <div className={styles.tabsContainer}>
      {/* Tab Headers */}
      <div className={styles.tabHeaders}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {renderTabContent()}
      </div>
    </div>
  );
}
