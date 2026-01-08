/**
 * Filename: /organisation/settings/general/page.tsx
 * Purpose: General settings page for organisation
 * Created: 2026-01-07
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient, useQuery, keepPreviousData } from '@tanstack/react-query';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import { createClient } from '@/utils/supabase/client';
import { useOrganisationSettings } from '@/app/hooks/useOrganisationSettings';
import { getOrganisationStats, getOrganisationSubscription } from '@/lib/api/organisation';
import OrganisationStatsWidget from '@/app/components/feature/organisation/sidebar/OrganisationStatsWidget';
import OrganisationHelpWidget from '@/app/components/feature/organisation/sidebar/OrganisationHelpWidget';
import OrganisationTipWidget from '@/app/components/feature/organisation/sidebar/OrganisationTipWidget';
import OrganisationVideoWidget from '@/app/components/feature/organisation/sidebar/OrganisationVideoWidget';
import toast from 'react-hot-toast';
import styles from './page.module.css';

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { organisation, profile, isLoading, tabs, handleTabChange } = useOrganisationSettings({
    currentTab: 'general',
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('Europe/London');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  // Initialize form when organisation loads
  useEffect(() => {
    if (organisation) {
      setName(organisation.name || '');
      setDescription(organisation.description || '');
      setTimezone(organisation.timezone || 'Europe/London');
      setHasChanges(false);
    }
  }, [organisation]);

  // Track changes
  useEffect(() => {
    if (organisation) {
      const changed =
        name !== (organisation.name || '') ||
        description !== (organisation.description || '') ||
        timezone !== (organisation.timezone || 'Europe/London');
      setHasChanges(changed);
    }
  }, [name, description, timezone, organisation]);

  // Handle save
  const handleSave = async () => {
    if (!organisation) {
      toast.error('Organisation not found');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('connection_groups')
        .update({
          name,
          description,
          timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organisation.id);

      if (error) throw error;

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['organisation', profile?.id] });

      toast.success('Settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (organisation) {
      setName(organisation.name || '');
      setDescription(organisation.description || '');
      setTimezone(organisation.timezone || 'Europe/London');
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Organisation Settings"
          subtitle="Manage your organisation profile, preferences, and configuration"
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
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>General Settings</h3>
          <div className={styles.cardContent}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Organisation Name</label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className={styles.helpText}>
                This is your organisation name as it appears to team members and clients.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                rows={4}
                placeholder="Add a description for your organisation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className={styles.helpText}>
                A brief description of your organisation and what you offer.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Timezone</label>
              <select
                className={styles.select}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="America/New_York">America/New York (EST)</option>
                <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
              </select>
              <p className={styles.helpText}>
                Used for scheduling and displaying dates across your organisation.
              </p>
            </div>

            <div className={styles.formActions}>
              <Button
                variant="secondary"
                size="md"
                onClick={handleCancel}
                disabled={!hasChanges || isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                isLoading={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Branding</h3>
          <div className={styles.cardContent}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Organisation Logo</label>
              <div className={styles.logoUpload}>
                <div className={styles.logoPreview}>
                  <span className={styles.logoPlaceholder}>
                    {organisation?.name?.charAt(0) || 'O'}
                  </span>
                </div>
                <Button variant="secondary" size="md" disabled>
                  Upload Logo
                </Button>
              </div>
              <p className={styles.helpText}>
                Recommended size: 200x200px. Max file size: 2MB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </HubPageLayout>
  );
}
