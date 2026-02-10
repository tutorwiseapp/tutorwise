/*
 * Filename: src/app/(admin)/admin/settings/page.tsx
 * Purpose: Admin Platform Settings page
 * Created: 2025-12-28
 * Pattern: Uses HubForm for form layout, separate routes for tabs
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubForm from '@/app/components/hub/form/HubForm';
import HubToggle from '@/app/components/hub/form/HubToggle';
import { AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import { useAdminProfile } from '@/lib/rbac';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function PlatformSettingsPage() {
  const router = useRouter();
  const { profile: _profile } = useAdminProfile();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // General Settings
    platformName: '',
    platformUrl: '',
    timezone: '',
    defaultCurrency: '',
    dateFormat: '',

    // Feature Flags
    enableBookings: true,
    enableReferrals: true,
    enableOrganisations: true,
    enableNetwork: true,
    enableReviews: true,
    maintenanceMode: false,

    // Platform Limits
    maxListingsPerUser: 0,
    maxBookingsPerDay: 0,
    maxFileUploadSizeMB: 0,
    sessionTimeoutMinutes: 0,
  });

  // Fetch real platform configuration from API on mount
  useEffect(() => {
    async function fetchPlatformConfig() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/platform-config');

        if (!response.ok) {
          throw new Error('Failed to fetch platform config');
        }

        const config = await response.json();

        setFormData(prev => ({
          ...prev,
          platformName: config.general.platformName,
          platformUrl: config.general.platformUrl,
          timezone: config.general.timezone,
          defaultCurrency: config.general.defaultCurrency,
          dateFormat: config.general.dateFormat,
          enableBookings: config.features.enableBookings,
          enableReferrals: config.features.enableReferrals,
          enableOrganisations: config.features.enableOrganisations,
          enableNetwork: config.features.enableNetwork,
          enableReviews: config.features.enableReviews,
          maintenanceMode: config.features.maintenanceMode,
          maxListingsPerUser: config.limits.maxListingsPerUser,
          maxBookingsPerDay: config.limits.maxBookingsPerDay,
          maxFileUploadSizeMB: config.limits.maxFileUploadSizeMB,
          sessionTimeoutMinutes: config.limits.sessionTimeoutMinutes,
        }));
      } catch (error) {
        console.error('Error fetching platform config:', error);
        alert('Failed to load platform configuration. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlatformConfig();
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.platformName || formData.platformName.trim() === '') {
      newErrors.platformName = 'Platform name is required';
    }

    if (formData.maxListingsPerUser < 1) {
      newErrors.maxListingsPerUser = 'Must be at least 1';
    }

    if (formData.maxBookingsPerDay < 1) {
      newErrors.maxBookingsPerDay = 'Must be at least 1';
    }

    if (formData.maxFileUploadSizeMB < 1 || formData.maxFileUploadSizeMB > 100) {
      newErrors.maxFileUploadSizeMB = 'Must be between 1-100 MB';
    }

    if (formData.sessionTimeoutMinutes < 5) {
      newErrors.sessionTimeoutMinutes = 'Must be at least 5 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/platform-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          general: {
            platformName: formData.platformName,
            platformUrl: formData.platformUrl,
            timezone: formData.timezone,
            defaultCurrency: formData.defaultCurrency,
            dateFormat: formData.dateFormat,
          },
          features: {
            enableBookings: formData.enableBookings,
            enableReferrals: formData.enableReferrals,
            enableOrganisations: formData.enableOrganisations,
            enableNetwork: formData.enableNetwork,
            enableReviews: formData.enableReviews,
            maintenanceMode: formData.maintenanceMode,
          },
          limits: {
            maxListingsPerUser: formData.maxListingsPerUser,
            maxBookingsPerDay: formData.maxBookingsPerDay,
            maxFileUploadSizeMB: formData.maxFileUploadSizeMB,
            sessionTimeoutMinutes: formData.sessionTimeoutMinutes,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      setHasUnsavedChanges(false);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(error instanceof Error ? error.message : 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && !confirm('Discard unsaved changes?')) return;
    // Reset form to initial values or refetch from API
    setHasUnsavedChanges(false);
  };

  const handleTabChange = (tabId: string) => {
    if (hasUnsavedChanges && !confirm('Discard unsaved changes?')) return;

    const routes: Record<string, string> = {
      platform: '/admin/settings',
      email: '/admin/settings/email',
      payments: '/admin/settings/payments',
      subscriptions: '/admin/settings/subscriptions',
      security: '/admin/settings/security',
      integrations: '/admin/settings/integrations',
    };

    router.push(routes[tabId]);
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Settings"
          subtitle="Configure platform settings and preferences"
          className={styles.settingsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'platform', label: 'Platform', active: true },
            { id: 'email', label: 'Email', active: false },
            { id: 'payments', label: 'Payments', active: false },
            { id: 'subscriptions', label: 'Subscriptions', active: false },
            { id: 'security', label: 'Security', active: false },
            { id: 'integrations', label: 'Integrations', active: false },
          ]}
          onTabChange={handleTabChange}
          className={styles.settingsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Platform Settings"
            items={[
              {
                question: 'What is maintenance mode?',
                answer: 'Temporarily disables platform access for non-admin users during updates or maintenance.',
              },
              {
                question: 'How do feature flags work?',
                answer: 'Toggle features on/off platform-wide instantly without code changes.',
              },
              {
                question: 'What are platform limits?',
                answer: 'Set maximum values to prevent abuse and ensure fair usage across all users.',
              },
            ]}
          />
          <AdminTipWidget
            title="Tips"
            tips={[
              'Changes take effect immediately after saving',
              'Test feature flags in staging before production',
              'Notify users before enabling maintenance mode',
              'Keep session timeout reasonable for security',
            ]}
          />
        </HubSidebar>
      }
    >
      {isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
          Loading platform configuration...
        </div>
      ) : (
        <HubForm.Root>
        {/* Section 1: General Settings */}
        <HubForm.Section title="General Settings">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="Platform Name" required error={errors.platformName}>
              <input
                type="text"
                value={formData.platformName}
                onChange={(e) => handleChange('platformName', e.target.value)}
                placeholder="e.g., Tutorwise"
              />
            </HubForm.Field>

            <HubForm.Field label="Platform URL">
              <input
                type="text"
                value={formData.platformUrl}
                readOnly
                disabled
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
              />
            </HubForm.Field>

            <HubForm.Field label="Timezone">
              <UnifiedSelect
                value={formData.timezone}
                onChange={(value) => handleChange('timezone', String(value))}
                options={[
                  { value: 'Europe/London', label: 'Europe/London (GMT)' },
                  { value: 'America/New_York', label: 'America/New_York (EST)' },
                  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
                  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
                  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
                  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (China - Shanghai)' },
                  { value: 'Asia/Chongqing', label: 'Asia/Chongqing (China - Beijing)' },
                  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (Hong Kong)' },
                  { value: 'Asia/Hanoi', label: 'Asia/Hanoi (Vietnam - Hanoi)' },
                  { value: 'Asia/Singapore', label: 'Asia/Singapore (Singapore)' },
                  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (India - New Delhi)' },
                  { value: 'Australia/Sydney', label: 'Australia/Sydney (Australia)' }
                ]}
                placeholder="Select timezone"
              />
            </HubForm.Field>

            <HubForm.Field label="Default Currency">
              <UnifiedSelect
                value={formData.defaultCurrency}
                onChange={(value) => handleChange('defaultCurrency', String(value))}
                options={[
                  { value: 'GBP', label: 'GBP (£)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' }
                ]}
                placeholder="Select currency"
              />
            </HubForm.Field>

            <HubForm.Field label="Date Format">
              <UnifiedSelect
                value={formData.dateFormat}
                onChange={(value) => handleChange('dateFormat', String(value))}
                options={[
                  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)' },
                  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' }
                ]}
                placeholder="Select date format"
              />
            </HubForm.Field>
          </HubForm.Grid>
        </HubForm.Section>

        {/* Section 2: Feature Flags */}
        <HubForm.Section title="Feature Flags">
          <div className={styles.toggleGrid}>
            <HubToggle
              checked={formData.enableBookings}
              onChange={(checked) => handleChange('enableBookings', checked)}
              label="Enable Bookings"
              description="Allow users to create and manage bookings"
            />

            <HubToggle
              checked={formData.enableReferrals}
              onChange={(checked) => handleChange('enableReferrals', checked)}
              label="Enable Referrals"
              description="Allow users to refer others and earn rewards"
            />

            <HubToggle
              checked={formData.enableOrganisations}
              onChange={(checked) => handleChange('enableOrganisations', checked)}
              label="Enable Organisations"
              description="Allow creation and management of organisations"
            />

            <HubToggle
              checked={formData.enableNetwork}
              onChange={(checked) => handleChange('enableNetwork', checked)}
              label="Enable Network Features"
              description="Enable connections, chat, and networking"
            />

            <HubToggle
              checked={formData.enableReviews}
              onChange={(checked) => handleChange('enableReviews', checked)}
              label="Enable Reviews"
              description="Allow users to leave reviews and ratings"
            />

            <HubToggle
              checked={formData.maintenanceMode}
              onChange={(checked) => {
                if (checked && !confirm('This will disable access for all non-admin users. Continue?')) {
                  return;
                }
                handleChange('maintenanceMode', checked);
              }}
              label="Maintenance Mode"
              description="Disable access for non-admin users (use with caution)"
            />
          </div>
        </HubForm.Section>

        {/* Section 3: Platform Limits */}
        <HubForm.Section title="Platform Limits">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="Max Listings per User" error={errors.maxListingsPerUser}>
              <input
                type="number"
                min="1"
                value={formData.maxListingsPerUser}
                onChange={(e) => handleChange('maxListingsPerUser', parseInt(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="Max Bookings per Day" error={errors.maxBookingsPerDay}>
              <input
                type="number"
                min="1"
                value={formData.maxBookingsPerDay}
                onChange={(e) => handleChange('maxBookingsPerDay', parseInt(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="Max File Upload Size (MB)" error={errors.maxFileUploadSizeMB}>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.maxFileUploadSizeMB}
                onChange={(e) => handleChange('maxFileUploadSizeMB', parseInt(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="Session Timeout (minutes)" error={errors.sessionTimeoutMinutes}>
              <input
                type="number"
                min="5"
                value={formData.sessionTimeoutMinutes}
                onChange={(e) => handleChange('sessionTimeoutMinutes', parseInt(e.target.value) || 0)}
              />
            </HubForm.Field>
          </HubForm.Grid>
        </HubForm.Section>

        {/* Save Actions */}
        <HubForm.Actions>
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={!hasUnsavedChanges || isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            isLoading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </HubForm.Actions>
      </HubForm.Root>
      )}
    </HubPageLayout>
  );
}
