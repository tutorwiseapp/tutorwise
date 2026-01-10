/*
 * Filename: src/app/(admin)/admin/settings/subscriptions/page.tsx
 * Purpose: Admin Subscription Settings page
 * Created: 2026-01-07
 * Pattern: Uses HubForm for form layout (copied from payments page)
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Circle } from 'lucide-react';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubForm from '@/app/components/hub/form/HubForm';
import HubToggle from '@/app/components/hub/form/HubToggle';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import { useAdminProfile } from '@/lib/rbac';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const { profile } = useAdminProfile();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Subscription statistics state
  const [subscriptionStats, setSubscriptionStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    trialingSubscriptions: 0,
    monthlyRecurringRevenue: 0,
  });

  // Only superadmins can edit subscription config
  const canEditSubscriptionConfig = profile?.admin_role === 'superadmin';

  const [formData, setFormData] = useState({
    // Stripe Product Configuration - Test Mode
    stripeTestPriceId: '',
    testPriceConnectionStatus: 'Not Connected' as 'Connected' | 'Not Connected' | 'Invalid',

    // Stripe Product Configuration - Live Mode
    stripeLivePriceId: '',
    livePriceConnectionStatus: 'Not Connected' as 'Connected' | 'Not Connected' | 'Invalid',

    // Subscription Pricing
    monthlyPrice: 50,
    currency: 'GBP',

    // Trial Configuration
    trialEnabled: true,
    trialDays: 14,

    // Subscription Settings
    allowCancellation: true,
    prorationEnabled: true,
    sendTrialEndingReminders: true,
    trialReminderDays: 3,
  });

  // Fetch real subscription configuration and stats from API on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch subscription config and stats in parallel
        const [configResponse, statsResponse] = await Promise.all([
          fetch('/api/admin/subscription-config'),
          fetch('/api/admin/subscription-stats'),
        ]);

        // Only update if API exists and returns successfully
        if (configResponse.ok) {
          const config = await configResponse.json();

          setFormData(prev => ({
            ...prev,
            // Stripe Product - Test Mode
            stripeTestPriceId: config.testMode?.priceId || '',
            testPriceConnectionStatus: config.testMode?.connectionStatus || 'Not Connected',

            // Stripe Product - Live Mode
            stripeLivePriceId: config.liveMode?.priceId || '',
            livePriceConnectionStatus: config.liveMode?.connectionStatus || 'Not Connected',

            // Pricing
            monthlyPrice: config.monthlyPrice || 50,
            currency: config.currency || 'GBP',

            // Trial
            trialEnabled: config.trialEnabled !== false,
            trialDays: config.trialDays || 14,

            // Settings
            allowCancellation: config.allowCancellation !== false,
            prorationEnabled: config.prorationEnabled !== false,
            sendTrialEndingReminders: config.sendTrialEndingReminders !== false,
            trialReminderDays: config.trialReminderDays || 3,
          }));
        }

        // Set subscription stats if response is ok
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setSubscriptionStats({
            totalSubscriptions: stats.totalSubscriptions || 0,
            activeSubscriptions: stats.activeSubscriptions || 0,
            trialingSubscriptions: stats.trialingSubscriptions || 0,
            monthlyRecurringRevenue: stats.monthlyRecurringRevenue || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Don't show error alert - just use default values
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.monthlyPrice < 1) {
      newErrors.monthlyPrice = 'Must be at least £1';
    }

    if (formData.trialDays < 0 || formData.trialDays > 90) {
      newErrors.trialDays = 'Must be between 0-90 days';
    }

    if (formData.trialReminderDays < 1 || formData.trialReminderDays > formData.trialDays) {
      newErrors.trialReminderDays = 'Must be between 1 and trial days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/subscription-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyPrice: formData.monthlyPrice,
          currency: formData.currency,
          trialEnabled: formData.trialEnabled,
          trialDays: formData.trialDays,
          allowCancellation: formData.allowCancellation,
          prorationEnabled: formData.prorationEnabled,
          sendTrialEndingReminders: formData.sendTrialEndingReminders,
          trialReminderDays: formData.trialReminderDays,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      setHasUnsavedChanges(false);
      alert('Subscription settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(error instanceof Error ? error.message : 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && !confirm('Discard unsaved changes?')) return;
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
          subtitle="Configure organisation subscription pricing and trial settings"
          className={styles.settingsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'platform', label: 'Platform', active: false },
            { id: 'email', label: 'Email', active: false },
            { id: 'payments', label: 'Payments', active: false },
            { id: 'subscriptions', label: 'Subscriptions', active: true },
            { id: 'security', label: 'Security', active: false },
            { id: 'integrations', label: 'Integrations', active: false },
          ]}
          onTabChange={handleTabChange}
          className={styles.settingsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Subscriptions (All Time)"
            stats={[
              {
                label: 'Total Subscriptions',
                value: isLoading ? 'Loading...' : subscriptionStats.totalSubscriptions.toString()
              },
              {
                label: 'Active Subscriptions',
                value: isLoading ? 'Loading...' : subscriptionStats.activeSubscriptions.toString()
              },
              {
                label: 'Active Trials',
                value: isLoading ? 'Loading...' : subscriptionStats.trialingSubscriptions.toString()
              },
              {
                label: 'Monthly Recurring Revenue',
                value: isLoading ? 'Loading...' : `£${subscriptionStats.monthlyRecurringRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              },
            ]}
          />
          <AdminHelpWidget
            title="Subscription Settings"
            items={[
              {
                question: 'Where do I find the Stripe Price ID?',
                answer: 'Go to Stripe Dashboard > Products > Organisation Premium > Pricing. Copy the Price ID.',
              },
              {
                question: 'What is a trial period?',
                answer: 'Number of days organisations can use premium features before payment is required.',
              },
              {
                question: 'Where can I view subscriptions?',
                answer: 'Go to the Organisations page to see all organisation subscriptions and their status.',
              },
            ]}
          />
          <AdminTipWidget
            title="Tips"
            tips={[
              'Set STRIPE_PREMIUM_PRICE_ID in .env.local',
              'Enable trial reminders for better conversion',
              'Monitor trial-to-paid conversion rate',
              'Test subscription flow before launch',
            ]}
          />
        </HubSidebar>
      }
    >
      {isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
          Loading subscription configuration...
        </div>
      ) : (
        <HubForm.Root>
        {/* Section 1: Stripe Product Configuration */}
        <HubForm.Section title="Stripe Product Configuration">
          {!canEditSubscriptionConfig && (
            <div className={styles.permissionWarning}>
              ⚠️ Only superadmins can edit subscription configuration. Contact your superadmin to make changes.
            </div>
          )}

          {/* Test Mode */}
          <div className={styles.modeContainer}>
            <div className={styles.modeHeader}>
              <h3 className={styles.modeTitle}>Test Mode <span>(Requires Stripe API keys configured in Payments settings)</span></h3>
              <span className={styles.modeBadge} data-mode="test">TEST</span>
            </div>
            <HubForm.Grid columns={1}>
              <HubForm.Field label="Stripe Price ID">
                <input
                  type="text"
                  value={formData.stripeTestPriceId || 'Not set - check STRIPE_PREMIUM_PRICE_ID in .env.local'}
                  onChange={(e) => handleChange('stripeTestPriceId', e.target.value)}
                  disabled={!canEditSubscriptionConfig}
                  placeholder="price_..."
                />
              </HubForm.Field>
            </HubForm.Grid>
            <div className={styles.connectionStatus}>
              <span className={`${styles.statusBadge} ${
                formData.testPriceConnectionStatus === 'Connected' ? styles.connected :
                formData.testPriceConnectionStatus === 'Invalid' ? styles.invalid :
                styles.disconnected
              }`}>
                {formData.testPriceConnectionStatus === 'Connected' ? (
                  <CheckCircle size={16} style={{ marginRight: '6px' }} />
                ) : formData.testPriceConnectionStatus === 'Invalid' ? (
                  <XCircle size={16} style={{ marginRight: '6px' }} />
                ) : (
                  <Circle size={16} style={{ marginRight: '6px' }} />
                )}
                Test: {formData.testPriceConnectionStatus}
              </span>
            </div>
          </div>

          {/* Live Mode */}
          <div className={styles.modeContainer}>
            <div className={styles.modeHeader}>
              <h3 className={styles.modeTitle}>Live Mode <span>(Requires Stripe API keys configured in Payments settings)</span></h3>
              <span className={styles.modeBadge} data-mode="live">LIVE</span>
            </div>
            <HubForm.Grid columns={1}>
              <HubForm.Field label="Stripe Price ID">
                <input
                  type="text"
                  value={formData.stripeLivePriceId || 'Not set - check STRIPE_PREMIUM_PRICE_ID in .env.local'}
                  onChange={(e) => handleChange('stripeLivePriceId', e.target.value)}
                  disabled={!canEditSubscriptionConfig}
                  placeholder="price_..."
                />
              </HubForm.Field>
            </HubForm.Grid>
            <div className={styles.connectionStatus}>
              <span className={`${styles.statusBadge} ${
                formData.livePriceConnectionStatus === 'Connected' ? styles.connected :
                formData.livePriceConnectionStatus === 'Invalid' ? styles.invalid :
                styles.disconnected
              }`}>
                {formData.livePriceConnectionStatus === 'Connected' ? (
                  <CheckCircle size={16} style={{ marginRight: '6px' }} />
                ) : formData.livePriceConnectionStatus === 'Invalid' ? (
                  <XCircle size={16} style={{ marginRight: '6px' }} />
                ) : (
                  <Circle size={16} style={{ marginRight: '6px' }} />
                )}
                Live: {formData.livePriceConnectionStatus}
              </span>
            </div>
          </div>
        </HubForm.Section>

        {/* Section 2: Pricing Structure */}
        <HubForm.Section title="Pricing Structure">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="Monthly Price (£)" required error={errors.monthlyPrice}>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formData.monthlyPrice}
                onChange={(e) => handleChange('monthlyPrice', parseFloat(e.target.value) || 0)}
                disabled={!canEditSubscriptionConfig}
              />
            </HubForm.Field>

            <HubForm.Field label="Currency">
              <UnifiedSelect
                value={formData.currency}
                onChange={(value) => handleChange('currency', String(value))}
                options={[
                  { value: 'GBP', label: 'GBP (£)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' }
                ]}
                placeholder="Select currency"
                disabled={!canEditSubscriptionConfig}
              />
            </HubForm.Field>
          </HubForm.Grid>
        </HubForm.Section>

        {/* Section 3: Trial Configuration */}
        <HubForm.Section title="Trial Configuration">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="Trial Period (days)" required error={errors.trialDays}>
              <input
                type="number"
                min="0"
                max="90"
                value={formData.trialDays}
                onChange={(e) => handleChange('trialDays', parseInt(e.target.value) || 0)}
                disabled={!canEditSubscriptionConfig}
              />
            </HubForm.Field>

            <HubForm.Field label="Trial Reminder (days before end)" error={errors.trialReminderDays}>
              <input
                type="number"
                min="1"
                max={formData.trialDays}
                value={formData.trialReminderDays}
                onChange={(e) => handleChange('trialReminderDays', parseInt(e.target.value) || 0)}
                disabled={!canEditSubscriptionConfig || !formData.sendTrialEndingReminders}
              />
            </HubForm.Field>
          </HubForm.Grid>

          <div style={{ marginTop: '16px' }}>
            <HubToggle
              checked={formData.trialEnabled}
              onChange={(checked) => {
                if (!checked && !confirm('Disabling trials means new organisations must pay immediately. Continue?')) {
                  return;
                }
                handleChange('trialEnabled', checked);
              }}
              label="Enable Trial Period"
              description="Allow new organisations to start with a free trial"
              disabled={!canEditSubscriptionConfig}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <HubToggle
              checked={formData.sendTrialEndingReminders}
              onChange={(checked) => handleChange('sendTrialEndingReminders', checked)}
              label="Send Trial Ending Reminders"
              description="Email organisations before their trial expires"
              disabled={!canEditSubscriptionConfig || !formData.trialEnabled}
            />
          </div>
        </HubForm.Section>

        {/* Section 4: Subscription Policies */}
        <HubForm.Section title="Subscription Policies">
          <div>
            <HubToggle
              checked={formData.allowCancellation}
              onChange={(checked) => {
                if (!checked && !confirm('Preventing cancellation may violate consumer protection laws. Continue?')) {
                  return;
                }
                handleChange('allowCancellation', checked);
              }}
              label="Allow Cancellation"
              description="Let organisations cancel their subscription at any time"
              disabled={!canEditSubscriptionConfig}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <HubToggle
              checked={formData.prorationEnabled}
              onChange={(checked) => handleChange('prorationEnabled', checked)}
              label="Enable Proration"
              description="Charge or credit proportionally when subscription changes mid-cycle"
              disabled={!canEditSubscriptionConfig}
            />
          </div>
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
