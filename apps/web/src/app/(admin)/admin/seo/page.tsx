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

      {/* Quick Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statCardContent}>
              <p className={styles.statCardLabel}>Hub Pages</p>
              <p className={styles.statCardValue}>{hubsCount || 0}</p>
            </div>
            <FileText className={`${styles.statCardIcon} ${styles.iconBlue}`} />
          </div>
          <Link href="/admin/seo/hubs" className={`${styles.statCardLink} ${styles.linkBlue}`}>
            View all hubs →
          </Link>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statCardContent}>
              <p className={styles.statCardLabel}>Spoke Pages</p>
              <p className={styles.statCardValue}>{spokesCount || 0}</p>
            </div>
            <LinkIcon className={`${styles.statCardIcon} ${styles.iconGreen}`} />
          </div>
          <Link href="/admin/seo/spokes" className={`${styles.statCardLink} ${styles.linkGreen}`}>
            View all spokes →
          </Link>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statCardContent}>
              <p className={styles.statCardLabel}>Citations</p>
              <p className={styles.statCardValue}>0</p>
            </div>
            <ExternalLink className={`${styles.statCardIcon} ${styles.iconPurple}`} />
          </div>
          <Link href="/admin/seo/citations" className={`${styles.statCardLink} ${styles.linkPurple}`}>
            View all citations →
          </Link>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <div className={styles.statCardContent}>
              <p className={styles.statCardLabel}>Performance</p>
              <p className={styles.statCardValue}>—</p>
            </div>
            <TrendingUp className={`${styles.statCardIcon} ${styles.iconOrange}`} />
          </div>
          <span className={`${styles.statCardLink} ${styles.linkGray}`}>Coming soon</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActionsSection}>
        <h3 className={styles.sectionTitle}>Quick Actions</h3>
        <div className={styles.actionsGrid}>
          {canCreate && (
            <>
              <Link href="/admin/seo/hubs?action=create">
                <Button className={styles.actionButton}>
                  <Plus className={styles.buttonIcon} />
                  Create Hub Page
                </Button>
              </Link>
              <Link href="/admin/seo/spokes?action=create">
                <Button variant="secondary" className={styles.actionButton}>
                  <Plus className={styles.buttonIcon} />
                  Create Spoke Page
                </Button>
              </Link>
              <Link href="/admin/seo/citations?action=create">
                <Button variant="secondary" className={styles.actionButton}>
                  <Plus className={styles.buttonIcon} />
                  Add Citation
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.recentActivitySection}>
        <h3 className={styles.sectionTitle}>Recent Activity</h3>
        <p className={styles.emptyMessage}>No recent activity to display.</p>
      </div>
    </HubPageLayout>
  );
}
