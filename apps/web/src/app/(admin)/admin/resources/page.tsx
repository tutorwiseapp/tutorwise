/**
 * Filename: apps/web/src/app/(admin)/admin/resources/page.tsx
 * Purpose: Admin resource management - All Articles view
 * Created: 2026-01-15
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import Button from '@/app/components/ui/actions/Button';
import ArticlesTable from './components/ArticlesTable';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type TabFilter = 'all' | 'published' | 'draft' | 'scheduled';

export default function AdminBlogPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  return (
    <ErrorBoundary>
      <HubPageLayout
      header={
        <HubHeader
          title="Resource Articles"
          subtitle="Manage resource content and publications"
          actions={
            <Button variant="primary" size="sm" onClick={() => router.push('/admin/resources/new')}>
              New Article
            </Button>
          }
          className={styles.blogHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Articles', count: 5, active: activeTab === 'all' },
            { id: 'published', label: 'Published', count: 5, active: activeTab === 'published' },
            { id: 'draft', label: 'Drafts', count: 0, active: activeTab === 'draft' },
            { id: 'scheduled', label: 'Scheduled', count: 0, active: activeTab === 'scheduled' },
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as TabFilter)}
          className={styles.blogTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Resource Statistics"
            stats={[
              { label: 'Total Articles', value: 5 },
              { label: 'Published', value: 5 },
              { label: 'Drafts', value: 0 },
              { label: 'Categories', value: 5 },
            ]}
          />
          <AdminHelpWidget
            title="Resource Management"
            items={[
              { question: 'How to create an article?', answer: 'Click "New Article" button to create a new resource article with our MDX editor.' },
              { question: 'What are categories?', answer: 'Categories help organize articles by audience (For Clients, For Tutors, etc.).' },
              { question: 'Can I schedule posts?', answer: 'Yes, set a future publish date when creating or editing an article.' },
            ]}
          />
          <AdminTipWidget
            title="Content Tips"
            tips={[
              'Use clear, descriptive titles for better SEO',
              'Include featured images for social sharing',
              'Add meta descriptions under 160 characters',
              'Publish consistently to build audience engagement',
            ]}
          />
        </HubSidebar>
      }
    >
      {activeTab === 'all' || activeTab === 'published' ? (
        <ArticlesTable />
      ) : (
        <HubEmptyState
          title={`No ${activeTab} articles`}
          description={activeTab === 'draft' ? 'You don\'t have any draft articles yet. Click "New Article" to start writing.' : 'No scheduled articles at this time.'}
        />
      )}
      </HubPageLayout>
    </ErrorBoundary>
  );
}
