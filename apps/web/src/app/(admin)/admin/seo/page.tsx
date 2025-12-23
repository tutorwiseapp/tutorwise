/*
 * Filename: src/app/(admin)/admin/seo/page.tsx
 * Purpose: SEO Management overview page
 * Created: 2025-12-23
 * Phase: 1 - SEO Management
 */
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { FileText, Link as LinkIcon, ExternalLink, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminSeoOverviewPage() {
  const supabase = createClient();
  const canCreate = usePermission('seo', 'create');

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

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Management"
          subtitle="Manage your hub-and-spoke content strategy for better search rankings"
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
        {/* Quick Actions Widget */}
        {canCreate && (
          <div className={styles.quickActionsWidget}>
            <h3 className={styles.widgetTitle}>Quick Actions</h3>
            <div className={styles.actionsGrid}>
              <Link href="/admin/seo/hubs?action=create">
                <Button className={styles.actionButton}>
                  <Plus className={styles.buttonIcon} />
                  Create Hub
                </Button>
              </Link>
              <Link href="/admin/seo/spokes?action=create">
                <Button variant="secondary" className={styles.actionButton}>
                  <Plus className={styles.buttonIcon} />
                  Create Spoke
                </Button>
              </Link>
              <Link href="/admin/seo/citations?action=create">
                <Button variant="secondary" className={styles.actionButton}>
                  <Plus className={styles.buttonIcon} />
                  Add Citation
                </Button>
              </Link>
            </div>
          </div>
        )}

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
      </div>
    </HubPageLayout>
  );
}
