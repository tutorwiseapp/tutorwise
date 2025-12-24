/*
 * Filename: src/app/(admin)/admin/listings/page.tsx
 * Purpose: Admin Listings overview page
 * Created: 2025-12-24
 * Phase: 2 - Platform Management
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { FileText, Plus, Filter } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';
import { HubKPIGrid, HubKPICard } from '@/app/components/hub/charts';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminListingsOverviewPage() {
  const router = useRouter();
  const canViewListings = usePermission('listings', 'view');
  const canManageListings = usePermission('listings', 'manage');
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  // Fetch listings metrics with trend data from statistics table
  const totalListingsMetric = useAdminMetric({ metric: 'listings_total', compareWith: 'last_month' });
  const activeListingsMetric = useAdminMetric({ metric: 'listings_active', compareWith: 'last_month' });
  const inactiveListingsMetric = useAdminMetric({ metric: 'listings_inactive', compareWith: 'last_month' });

  // Header actions
  const getHeaderActions = () => {
    if (!canManageListings.hasAccess) return undefined;

    return (
      <div className={styles.headerActions}>
        <Button variant="secondary" size="sm">
          <Filter className={styles.buttonIcon} />
          Filters
        </Button>
      </div>
    );
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Listings"
          subtitle="Manage tutor listings and quality"
          actions={getHeaderActions()}
          className={styles.listingsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' }
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview')}
          className={styles.listingsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Listing Breakdown"
            stats={[
              { label: 'Total Listings', value: totalListingsMetric.value },
              { label: 'Active', value: activeListingsMetric.value },
              { label: 'Inactive/Draft', value: inactiveListingsMetric.value },
              {
                label: 'Active Rate',
                value: totalListingsMetric.value > 0
                  ? `${Math.round((activeListingsMetric.value / totalListingsMetric.value) * 100)}%`
                  : '0%'
              },
            ]}
          />
          <AdminHelpWidget
            title="Listings Help"
            items={[
              { question: 'What is a listing?', answer: 'A listing is a tutor profile that appears in search results and marketplace.' },
              { question: 'Why are some listings inactive?', answer: 'Listings can be inactive if they\'re in draft mode or if the tutor deactivated them.' },
              { question: 'How do I improve listing quality?', answer: 'Review incomplete listings and encourage tutors to add more details, photos, and qualifications.' },
            ]}
          />
          <AdminTipWidget
            title="Listing Tips"
            tips={[
              'Active listings drive platform engagement',
              'High-quality listings convert better',
              'Encourage tutors to complete their profiles',
              'Monitor inactive listings regularly',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <HubKPIGrid>
            <HubKPICard
              label="Total Listings"
              value={totalListingsMetric.value}
              sublabel={formatMetricChange(
                totalListingsMetric.change,
                totalListingsMetric.changePercent,
                'last_month'
              )}
              icon={FileText}
              isLoading={totalListingsMetric.isLoading}
            />
            <HubKPICard
              label="Active Listings"
              value={activeListingsMetric.value}
              sublabel={formatMetricChange(
                activeListingsMetric.change,
                activeListingsMetric.changePercent,
                'last_month'
              )}
              icon={FileText}
              isLoading={activeListingsMetric.isLoading}
            />
            <HubKPICard
              label="Inactive/Draft"
              value={inactiveListingsMetric.value}
              sublabel={formatMetricChange(
                inactiveListingsMetric.change,
                inactiveListingsMetric.changePercent,
                'last_month'
              )}
              icon={FileText}
              isLoading={inactiveListingsMetric.isLoading}
            />
            <HubKPICard
              label="Active Rate"
              value={
                totalListingsMetric.value > 0
                  ? `${Math.round((activeListingsMetric.value / totalListingsMetric.value) * 100)}%`
                  : '0%'
              }
              sublabel={
                totalListingsMetric.previousValue && totalListingsMetric.previousValue > 0
                  ? `${Math.round((activeListingsMetric.previousValue! / totalListingsMetric.previousValue) * 100)}% last month`
                  : undefined
              }
              icon={FileText}
              isLoading={totalListingsMetric.isLoading || activeListingsMetric.isLoading}
            />
          </HubKPIGrid>

          {/* Coming Soon Placeholder */}
          <div className={styles.placeholder}>
            <FileText className={styles.placeholderIcon} />
            <h3 className={styles.placeholderTitle}>Listings Management Coming Soon</h3>
            <p className={styles.placeholderText}>
              Detailed listing analytics, quality scores, and management tools will be available here.
            </p>
          </div>
        </>
      )}
    </HubPageLayout>
  );
}
