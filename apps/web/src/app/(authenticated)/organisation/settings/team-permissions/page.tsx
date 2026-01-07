/**
 * Filename: /organisation/settings/team-permissions/page.tsx
 * Purpose: Team Permissions settings page
 * Created: 2026-01-07
 */

'use client';

import React from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getMyOrganisation } from '@/lib/api/organisation';
import { useRouter } from 'next/navigation';
import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import SettingsTabs from '@/components/feature/organisation/settings/SettingsTabs';
import type { SettingsTab } from '@/components/feature/organisation/settings/SettingsTabs';
import styles from './page.module.css';

export default function TeamPermissionsSettingsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();

  const {
    data: organisation,
    isLoading: orgLoading,
    isFetching: orgFetching,
  } = useQuery({
    queryKey: ['organisation', profile?.id],
    queryFn: getMyOrganisation,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const tabs: SettingsTab[] = [
    { id: 'general', label: 'General', href: '/organisation/settings/general' },
    { id: 'billing', label: 'Billing & Subscription', href: '/organisation/settings/billing' },
    { id: 'team-permissions', label: 'Team Permissions', href: '/organisation/settings/team-permissions' },
    { id: 'integrations', label: 'Integrations', href: '/organisation/settings/integrations' },
  ];

  const isLoading = profileLoading || orgLoading;
  const isOwner = organisation?.profile_id === profile?.id;

  // Redirect if not authorized
  if (!isLoading && organisation && !isOwner) {
    router.push('/organisation');
    return null;
  }

  // Redirect if no organisation found
  if (!isLoading && !organisation) {
    router.push('/organisation');
    return null;
  }

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
      tabs={<SettingsTabs tabs={tabs} />}
      sidebar={
        <HubSidebar>
          <div className={styles.sidebarPlaceholder}>
            Settings sidebar widgets coming soon
          </div>
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
            <button
              onClick={() => router.push('/organisation?tab=team')}
              className={styles.buttonSecondary}
            >
              Go to Team Page
            </button>
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
