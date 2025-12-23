/*
 * Filename: src/app/(admin)/admin/seo/page.tsx
 * Purpose: SEO Management overview page
 * Created: 2025-12-23
 * Phase: 1 - SEO Management
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { FileText, Link as LinkIcon, ExternalLink, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminSeoOverviewPage() {
  const supabase = createClient();
  const router = useRouter();
  const canCreate = usePermission('seo', 'create');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  // Fetch SEO overview stats
  const { data: hubsCount } = useQuery({
    queryKey: ['admin', 'seo-hubs-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('seo_hubs')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: spokesCount } = useQuery({
    queryKey: ['admin', 'seo-spokes-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('seo_spokes')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: publishedHubs } = useQuery({
    queryKey: ['admin', 'seo-hubs-published'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('seo_hubs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: publishedSpokes } = useQuery({
    queryKey: ['admin', 'seo-spokes-published'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('seo_spokes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');
      if (error) throw error;
      return count || 0;
    },
  });

  // Header actions with primary CTA and secondary dropdown
  const getHeaderActions = () => {
    if (!canCreate) return undefined;

    return (
      <div className={styles.headerActions}>
        {/* Primary Action: Create Hub */}
        <Link href="/admin/seo/hubs?action=create">
          <Button variant="primary" size="sm">
            <Plus className={styles.buttonIcon} />
            Create Hub
          </Button>
        </Link>

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
              <div
                className={actionStyles.backdrop}
                onClick={() => setShowActionsMenu(false)}
              />

              {/* Dropdown Menu */}
              <div className={actionStyles.dropdownMenu}>
                <button
                  onClick={() => {
                    router.push('/admin/seo/spokes?action=create');
                    setShowActionsMenu(false);
                  }}
                  className={actionStyles.menuButton}
                >
                  Create Spoke
                </button>
                <button
                  onClick={() => {
                    router.push('/admin/seo/citations?action=create');
                    setShowActionsMenu(false);
                  }}
                  className={actionStyles.menuButton}
                >
                  Add Citation
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Management"
          subtitle="Manage your hub-and-spoke content strategy for better search rankings"
          actions={getHeaderActions()}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview')}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Content Overview"
            stats={[
              { label: 'Total Hubs', value: hubsCount || 0 },
              { label: 'Published Hubs', value: publishedHubs || 0 },
              { label: 'Total Spokes', value: spokesCount || 0 },
              { label: 'Published Spokes', value: publishedSpokes || 0 },
            ]}
          />
          <AdminHelpWidget
            title="SEO Strategy Help"
            items={[
              { question: 'What is Hub & Spoke SEO?', answer: 'A content strategy where hub pages cover broad topics and spoke pages dive deep into specific subtopics, all linked together.' },
              { question: 'Why use this model?', answer: 'It creates a strong internal linking structure, improves topical authority, and helps search engines understand your content hierarchy.' },
              { question: 'Best practices?', answer: 'Start with 3-5 hub topics, create 10-15 spokes per hub, ensure all spokes link back to their hub, and update content regularly.' },
            ]}
          />
          <AdminTipWidget
            title="SEO Tips"
            tips={[
              'Focus on one topic per hub',
              'Keep hub content evergreen',
              'Update old content regularly',
              'Monitor performance metrics',
            ]}
          />
        </HubSidebar>
      }
    >

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards - Hub Pattern */}
          <HubKPIGrid>
            <HubKPICard
              label="Hub Pages"
              value={hubsCount || 0}
              icon={FileText}
              variant="info"
              clickable
              href="/admin/seo/hubs"
            />
            <HubKPICard
              label="Spoke Pages"
              value={spokesCount || 0}
              icon={LinkIcon}
              variant="success"
              clickable
              href="/admin/seo/spokes"
            />
            <HubKPICard
              label="Citations"
              value={0}
              icon={ExternalLink}
              variant="warning"
              clickable
              href="/admin/seo/citations"
            />
            <HubKPICard
              label="Performance"
              value="—"
              sublabel="Coming soon"
              icon={TrendingUp}
              variant="neutral"
            />
          </HubKPIGrid>

          {/* Actionable Widgets Section - Following Dashboard Pattern */}
          <div className={styles.actionableWidgets}>
            {/* Recent Activity Widget */}
            <div className={styles.recentActivityWidget}>
              <h3 className={styles.widgetTitle}>Recent Activity</h3>
              <p className={styles.emptyMessage}>No recent SEO activity to display.</p>
            </div>

            {/* SEO Performance Widget (Placeholder) */}
            <div className={styles.performanceWidget}>
              <h3 className={styles.widgetTitle}>SEO Performance</h3>
              <p className={styles.emptyMessage}>Performance metrics coming soon.</p>
            </div>

            {/* Content Insights Widget (Placeholder) */}
            <div className={styles.insightsWidget}>
              <h3 className={styles.widgetTitle}>Content Insights</h3>
              <p className={styles.emptyMessage}>Insights and recommendations coming soon.</p>
            </div>
          </div>
        </>
      )}
    </HubPageLayout>
  );
}
