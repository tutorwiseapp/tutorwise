/**
 * Filename: /organisation/settings/team-permissions/page.tsx
 * Purpose: Team Permissions settings page
 * Created: 2026-01-07
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getOrganisationStats, getOrganisationSubscription } from '@/lib/api/organisation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import { useOrganisationSettings } from '@/app/hooks/useOrganisationSettings';
import OrganisationStatsWidget from '@/app/components/feature/organisations/sidebar/OrganisationStatsWidget';
import OrganisationHelpWidget from '@/app/components/feature/organisations/sidebar/OrganisationHelpWidget';
import OrganisationTipWidget from '@/app/components/feature/organisations/sidebar/OrganisationTipWidget';
import OrganisationVideoWidget from '@/app/components/feature/organisations/sidebar/OrganisationVideoWidget';
import styles from './page.module.css';

export default function TeamPermissionsSettingsPage() {
  const router = useRouter();
  const { organisation, profile: _profile, isLoading, tabs, handleTabChange } = useOrganisationSettings({
    currentTab: 'team-permissions',
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

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading team permissions...</p>
      </div>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Team Permissions"
          subtitle="Manage team member roles and access levels"
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
        {/* Roles Overview Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Team Roles</h3>
          <div className={styles.cardContent}>
            <p className={styles.description}>
              Define different access levels and permissions for your team members.
            </p>

            <div className={styles.rolesGrid}>
              {/* Owner Role */}
              <div className={styles.roleCard}>
                <div className={styles.roleHeader}>
                  <h4 className={styles.roleName}>Owner</h4>
                  <span className={styles.roleBadge}>Full Access</span>
                </div>
                <p className={styles.roleDescription}>
                  Complete control over organisation settings, billing, and team management.
                </p>
                <ul className={styles.permissionsList}>
                  <li>Manage billing and subscription</li>
                  <li>Add/remove team members</li>
                  <li>Configure organisation settings</li>
                  <li>Access all features and data</li>
                </ul>
              </div>

              {/* Admin Role */}
              <div className={styles.roleCard}>
                <div className={styles.roleHeader}>
                  <h4 className={styles.roleName}>Admin</h4>
                  <span className={styles.roleBadge}>Most Access</span>
                </div>
                <p className={styles.roleDescription}>
                  Manage team members and organisation operations, except billing.
                </p>
                <ul className={styles.permissionsList}>
                  <li>Add/remove team members</li>
                  <li>View organisation analytics</li>
                  <li>Manage bookings and clients</li>
                  <li>Cannot access billing settings</li>
                </ul>
              </div>

              {/* Member Role */}
              <div className={styles.roleCard}>
                <div className={styles.roleHeader}>
                  <h4 className={styles.roleName}>Member</h4>
                  <span className={styles.roleBadge}>Standard Access</span>
                </div>
                <p className={styles.roleDescription}>
                  Access to bookings, clients, and team features.
                </p>
                <ul className={styles.permissionsList}>
                  <li>Manage own bookings</li>
                  <li>View team members</li>
                  <li>Access shared clients</li>
                  <li>Participate in referral program</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Current Team Members</h3>
          <div className={styles.cardContent}>
            <p className={styles.infoText}>
              Team member management is currently available on the main Organisation Team page.
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push('/organisation?tab=team')}
            >
              Go to Team Page
            </Button>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Advanced Permissions (Coming Soon)</h3>
          <div className={styles.cardContent}>
            <p className={styles.description}>
              We&apos;re working on more granular permission controls:
            </p>
            <ul className={styles.featureList}>
              <li>Custom role creation</li>
              <li>Per-feature access control</li>
              <li>Client-specific permissions</li>
              <li>Temporary access grants</li>
              <li>Audit logs for permission changes</li>
            </ul>
          </div>
        </div>
      </div>
    </HubPageLayout>
  );
}
