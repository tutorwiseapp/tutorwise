/**
 * Filename: apps/web/src/app/(admin)/admin/blog/settings/page.tsx
 * Purpose: Admin blog - Global settings
 * Created: 2026-01-15
 */
'use client';

import React, { useState } from 'react';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type SettingsTab = 'general' | 'seo' | 'authors' | 'newsletter';

const SETTINGS_SECTIONS = {
  general: {
    title: 'General Settings',
    items: ['Resource title and tagline', 'Posts per page', 'Default post status', 'Comment settings'],
  },
  seo: {
    title: 'SEO Settings',
    items: ['Default meta description template', 'Social sharing defaults (OG images, Twitter cards)', 'Sitemap configuration', 'RSS feed settings'],
  },
  authors: {
    title: 'Author Settings',
    items: ['Default author information', 'Author bio display options', 'Multiple author support'],
  },
  newsletter: {
    title: 'Newsletter Integration',
    items: ['Email service provider integration', 'Subscription form settings', 'Newsletter widget configuration'],
  },
};

export default function BlogSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <ErrorBoundary>
      <HubPageLayout
      header={
        <HubHeader
          title="Resource Settings"
          subtitle="Configure global resource preferences"
          actions={
            <Button variant="primary" size="sm" disabled>
              Save Changes
            </Button>
          }
          className={styles.blogHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'general', label: 'General', active: activeTab === 'general' },
            { id: 'seo', label: 'SEO', active: activeTab === 'seo' },
            { id: 'authors', label: 'Authors', active: activeTab === 'authors' },
            { id: 'newsletter', label: 'Newsletter', active: activeTab === 'newsletter' },
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as SettingsTab)}
          className={styles.blogTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Settings Help"
            items={[
              { question: 'What are general settings?', answer: 'General settings control the basic behavior and appearance of your resource center.' },
              { question: 'Why configure SEO?', answer: 'SEO settings help your resource content rank better in search engines and look good when shared on social media.' },
              { question: 'Newsletter integration?', answer: 'Connect your email service provider to capture resource subscribers and send automated newsletters.' },
            ]}
          />
          <AdminTipWidget
            title="Configuration Tips"
            tips={[
              'Set default meta descriptions to improve SEO',
              'Configure OG images for better social sharing',
              'Enable author bios to build credibility',
              'Test newsletter forms before going live',
            ]}
          />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        <div className={styles.settingsCard}>
          <h2 className={styles.settingsTitle}>{SETTINGS_SECTIONS[activeTab].title}</h2>
          <ul className={styles.settingsList}>
            {SETTINGS_SECTIONS[activeTab].items.map((item, index) => (
              <li key={index} className={styles.settingsItem}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HubEmptyState
          title="Settings Configuration Coming Soon"
          description="Interactive forms to configure all blog settings will be available here."
        />
      </div>
      </HubPageLayout>
    </ErrorBoundary>
  );
}
