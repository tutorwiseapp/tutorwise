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
import { useAdminProfile } from '@/lib/rbac';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function PlatformSettingsPage() {
  const router = useRouter();
  const { profile } = useAdminProfile();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // General Settings
    platformName: 'Tutorwise',
    platformUrl: 'tutorwise.io',
    timezone: 'Europe/London',
    defaultCurrency: 'GBP',
    dateFormat: 'DD/MM/YYYY',

    // Feature Flags
    enableBookings: true,
    enableReferrals: true,
    enableOrganisations: true,
    enableNetwork: true,
    enableReviews: true,
    maintenanceMode: false,

    // Platform Limits
    maxListingsPerUser: 10,
    maxBookingsPerDay: 50,
    maxFileUploadSizeMB: 10,
    sessionTimeoutMinutes: 60,
  });

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
      // TODO: Replace with real API call
      // await fetch('/api/admin/settings/platform', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setHasUnsavedChanges(false);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
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
              <select
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
              >
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Asia/Shanghai">Asia/Shanghai (China - Shanghai)</option>
                <option value="Asia/Chongqing">Asia/Chongqing (China - Beijing)</option>
                <option value="Asia/Hong_Kong">Asia/Hong_Kong (Hong Kong)</option>
                <option value="Asia/Hanoi">Asia/Hanoi (Vietnam - Hanoi)</option>
                <option value="Asia/Singapore">Asia/Singapore (Singapore)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (India - New Delhi)</option>
                <option value="Australia/Sydney">Australia/Sydney (Australia)</option>
              </select>
            </HubForm.Field>

            <HubForm.Field label="Default Currency">
              <select
                value={formData.defaultCurrency}
                onChange={(e) => handleChange('defaultCurrency', e.target.value)}
              >
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </HubForm.Field>

            <HubForm.Field label="Date Format">
              <select
                value={formData.dateFormat}
                onChange={(e) => handleChange('dateFormat', e.target.value)}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
              </select>
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
    </HubPageLayout>
  );
}
