/**
 * Filename: /organisation/settings/integrations/page.tsx
 * Purpose: Integrations settings page
 * Created: 2026-01-07
 */

'use client';

import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getOrganisationStats, getOrganisationSubscription } from '@/lib/api/organisation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { useOrganisationSettings } from '@/app/hooks/useOrganisationSettings';
import OrganisationStatsWidget from '@/app/components/feature/organisation/sidebar/OrganisationStatsWidget';
import OrganisationHelpWidget from '@/app/components/feature/organisation/sidebar/OrganisationHelpWidget';
import OrganisationTipWidget from '@/app/components/feature/organisation/sidebar/OrganisationTipWidget';
import OrganisationVideoWidget from '@/app/components/feature/organisation/sidebar/OrganisationVideoWidget';
import styles from './page.module.css';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  comingSoon: boolean;
}

const integrations: Integration[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts, deals, and activities with your HubSpot CRM.',
    category: 'CRM',
    comingSoon: true,
  },
  {
    id: 'tutorcruncher',
    name: 'TutorCruncher',
    description: 'Connect your tutoring management platform for seamless data flow.',
    category: 'Tutoring',
    comingSoon: true,
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Automate invoicing and sync financial data with Xero accounting.',
    category: 'Accounting',
    comingSoon: true,
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Connect with QuickBooks for streamlined bookkeeping and invoicing.',
    category: 'Accounting',
    comingSoon: true,
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Sync your contacts and automate email marketing campaigns.',
    category: 'Marketing',
    comingSoon: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications and updates directly in your Slack workspace.',
    category: 'Communication',
    comingSoon: true,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps through powerful automation workflows.',
    category: 'Automation',
    comingSoon: true,
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync bookings and events with your Google Calendar.',
    category: 'Calendar',
    comingSoon: true,
  },
];

export default function IntegrationsSettingsPage() {
  const { organisation, profile, isLoading, tabs, handleTabChange } = useOrganisationSettings({
    currentTab: 'integrations',
  });

  // Fetch organisation stats for sidebar
  const { data: stats } = useQuery({
    queryKey: ['organisation-stats', organisation?.id],
    queryFn: () => getOrganisationStats(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch organisation subscription for sidebar
  const { data: subscription } = useQuery({
    queryKey: ['organisation-subscription', organisation?.id],
    queryFn: () => getOrganisationSubscription(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading integrations...</p>
      </div>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Integrations"
          subtitle="Connect with your favorite tools and automate workflows"
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <OrganisationStatsWidget
            teamSize={stats?.team_size || 0}
            totalClients={stats?.total_clients || 0}
            monthlyRevenue={stats?.monthly_revenue || 0}
          />
          <OrganisationHelpWidget subscription={subscription || null} />
          <OrganisationTipWidget />
          <OrganisationVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.content}>
        {/* Overview Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Available Integrations</h3>
          <div className={styles.cardContent}>
            <p className={styles.description}>
              Connect TutorWise with your existing tools to streamline your workflow.
              All integrations are currently in development and will be available soon.
            </p>
          </div>
        </div>

        {/* Integrations by Category */}
        {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
          <div key={category} className={styles.card}>
            <h3 className={styles.cardTitle}>{category}</h3>
            <div className={styles.cardContent}>
              <div className={styles.integrationsGrid}>
                {categoryIntegrations.map((integration) => (
                  <div key={integration.id} className={styles.integrationCard}>
                    <div className={styles.integrationHeader}>
                      <div className={styles.integrationIcon}>
                        {integration.name.charAt(0)}
                      </div>
                      <div className={styles.integrationInfo}>
                        <h4 className={styles.integrationName}>{integration.name}</h4>
                        {integration.comingSoon && (
                          <span className={styles.comingSoonBadge}>Coming Soon</span>
                        )}
                      </div>
                    </div>
                    <p className={styles.integrationDescription}>
                      {integration.description}
                    </p>
                    <button
                      className={styles.connectButton}
                      disabled={integration.comingSoon}
                    >
                      {integration.comingSoon ? 'Coming Soon' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Request Integration Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Request an Integration</h3>
          <div className={styles.cardContent}>
            <p className={styles.description}>
              Don&apos;t see the integration you need? Let us know what tools you&apos;d like to connect with TutorWise.
            </p>
            <button className={styles.buttonSecondary} disabled>
              Request Integration
            </button>
          </div>
        </div>
      </div>
    </HubPageLayout>
  );
}
