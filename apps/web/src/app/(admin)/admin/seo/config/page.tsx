/*
 * Filename: src/app/(admin)/admin/seo/config/page.tsx
 * Purpose: SEO Configuration page for admins
 * Created: 2025-12-23
 * Phase: 1 - SEO Management
 */
'use client';

import React, { useState } from 'react';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminHelpWidget, AdminStatsWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { Save } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminSeoConfigPage() {
  const canUpdate = usePermission('seo', 'update');
  const [activeTab, setActiveTab] = useState<'general'>('general');

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Configuration"
          subtitle="Configure SEO settings and preferences"
          actions={
            canUpdate ? (
              <Button variant="primary" size="sm">
                <Save className={styles.buttonIcon} />
                Save Settings
              </Button>
            ) : undefined
          }
          className={styles.configHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'general', label: 'General', active: activeTab === 'general' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'general')}
          className={styles.configTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Configuration Status"
            stats={[
              { label: 'Settings Configured', value: '0/10' },
              { label: 'Last Updated', value: 'Never' },
            ]}
          />
          <AdminHelpWidget
            title="Configuration Help"
            items={[
              { question: 'What is SEO Configuration?', answer: 'Global settings that control how your SEO content is generated and displayed.' },
              { question: 'What settings can I configure?', answer: 'Default meta tags, URL structures, sitemap settings, and more.' },
            ]}
          />
          <AdminTipWidget
            title="Configuration Tips"
            tips={[
              'Set default meta descriptions',
              'Configure URL patterns',
              'Enable automatic sitemaps',
              'Set up redirects',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* General Tab */}
      {activeTab === 'general' && (
        <div className={styles.configContent}>
          <div className={styles.configSection}>
            <h2 className={styles.sectionTitle}>SEO Configuration</h2>
            <p className={styles.sectionDescription}>
              Configure global SEO settings and preferences for your hub-and-spoke content strategy.
            </p>

            <div className={styles.emptyState}>
              <p className={styles.emptyMessage}>
                Configuration interface coming soon.
              </p>
              <p className={styles.emptyDescription}>
                This page will allow you to configure default SEO settings, URL structures,
                meta tag templates, and other SEO-related preferences.
              </p>
            </div>
          </div>
        </div>
      )}
    </HubPageLayout>
  );
}
