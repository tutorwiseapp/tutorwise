/*
 * Filename: src/app/(admin)/admin/settings/payments/page.tsx
 * Purpose: Admin Payment Settings page
 * Created: 2025-12-28
 * Pattern: Uses HubForm for form layout
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

export default function PaymentSettingsPage() {
  const router = useRouter();
  const { profile } = useAdminProfile();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Revenue statistics state
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    platformFees: 0,
    pendingPayouts: 0,
    processedPayouts: 0,
  });

  // Only superadmins can edit Stripe keys
  const canEditStripeKeys = profile?.admin_role === 'superadmin';

  const [formData, setFormData] = useState({
    // Stripe Test Mode
    stripeTestPublishableKey: '',
    stripeTestSecretKey: '',
    testConnectionStatus: 'Not Connected' as 'Connected' | 'Not Connected' | 'Invalid',

    // Stripe Live Mode
    stripeLivePublishableKey: '',
    stripeLiveSecretKey: '',
    liveConnectionStatus: 'Not Connected' as 'Connected' | 'Not Connected' | 'Invalid',

    // Fee Structure
    platformFeePercent: 10,
    minimumBookingAmount: 10,
    currencyProcessingFeePercent: 1.5,
    fixedTransactionFee: 0.20,

    // Payout Schedule
    payoutFrequency: 'weekly',
    payoutDay: 'friday',
    minimumPayoutAmount: 25,
    autoApprovePayouts: false,
  });

  // Fetch real Stripe configuration and revenue stats from API on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch Stripe config and revenue stats in parallel
        const [stripeResponse, revenueResponse] = await Promise.all([
          fetch('/api/admin/stripe-config'),
          fetch('/api/admin/revenue-stats'),
        ]);

        if (!stripeResponse.ok) {
          throw new Error('Failed to fetch Stripe config');
        }

        const config = await stripeResponse.json();

        setFormData(prev => ({
          ...prev,
          // Test Mode
          stripeTestPublishableKey: config.testMode.publishableKey,
          stripeTestSecretKey: config.testMode.secretKey, // Show full secret key for admin
          testConnectionStatus: config.testMode.connectionStatus,

          // Live Mode
          stripeLivePublishableKey: config.liveMode.publishableKey,
          stripeLiveSecretKey: config.liveMode.secretKey, // Show full secret key for admin
          liveConnectionStatus: config.liveMode.connectionStatus,

          // Fee Structure
          platformFeePercent: config.platformFee,
          minimumBookingAmount: config.minimumBookingAmount,
          currencyProcessingFeePercent: config.currencyProcessingFeePercent,
          fixedTransactionFee: config.fixedTransactionFee,
        }));

        // Set revenue stats if response is ok
        if (revenueResponse.ok) {
          const stats = await revenueResponse.json();
          setRevenueStats({
            totalRevenue: stats.totalRevenue,
            platformFees: stats.platformFees,
            pendingPayouts: stats.pendingPayouts,
            processedPayouts: stats.processedPayouts,
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load configuration. Please refresh the page.');
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

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.platformFeePercent < 0 || formData.platformFeePercent > 100) {
      newErrors.platformFeePercent = 'Must be between 0-100%';
    }

    if (formData.minimumBookingAmount < 1) {
      newErrors.minimumBookingAmount = 'Must be at least £1';
    }

    if (formData.currencyProcessingFeePercent < 0 || formData.currencyProcessingFeePercent > 10) {
      newErrors.currencyProcessingFeePercent = 'Must be between 0-10%';
    }

    if (formData.fixedTransactionFee < 0) {
      newErrors.fixedTransactionFee = 'Cannot be negative';
    }

    if (formData.minimumPayoutAmount < 1) {
      newErrors.minimumPayoutAmount = 'Must be at least £1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/stripe-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformFee: formData.platformFeePercent,
          minimumBookingAmount: formData.minimumBookingAmount,
          currencyProcessingFeePercent: formData.currencyProcessingFeePercent,
          fixedTransactionFee: formData.fixedTransactionFee,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      setHasUnsavedChanges(false);
      alert('Payment settings saved successfully!');
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
          subtitle="Configure payment processing and fee structure"
          className={styles.settingsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'platform', label: 'Platform', active: false },
            { id: 'email', label: 'Email', active: false },
            { id: 'payments', label: 'Payments', active: true },
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
          <AdminStatsWidget
            title="Revenue (Last 30 Days)"
            stats={[
              {
                label: 'Total Revenue',
                value: isLoading ? 'Loading...' : `£${revenueStats.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              },
              {
                label: 'Platform Fees',
                value: isLoading ? 'Loading...' : `£${revenueStats.platformFees.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              },
              {
                label: 'Pending Payouts',
                value: isLoading ? 'Loading...' : `£${revenueStats.pendingPayouts.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              },
              {
                label: 'Processed Payouts',
                value: isLoading ? 'Loading...' : `£${revenueStats.processedPayouts.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              },
            ]}
          />
          <AdminHelpWidget
            title="Payment Settings"
            items={[
              {
                question: 'Where do I find Stripe keys?',
                answer: 'Go to Stripe Dashboard > Developers > API Keys. Use live keys for production.',
              },
              {
                question: 'What is webhook secret?',
                answer: 'Required for secure payment event notifications from Stripe to your platform.',
              },
              {
                question: 'What are platform fees?',
                answer: 'Percentage charged on each booking. This is your platform revenue.',
              },
            ]}
          />
          <AdminTipWidget
            title="Tips"
            tips={[
              'Keep Stripe keys secure',
              'Test in test mode first',
              'Review fee structure regularly',
              'Monitor failed payments',
            ]}
          />
        </HubSidebar>
      }
    >
      {isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
          Loading Stripe configuration...
        </div>
      ) : (
        <HubForm.Root>
        {/* Section 1: Stripe Configuration */}
        <HubForm.Section title="Stripe Configuration">
          {!canEditStripeKeys && (
            <div className={styles.permissionWarning}>
              ⚠️ Only superadmins can edit Stripe API keys. Contact your superadmin to make changes.
            </div>
          )}

          {/* Test Mode */}
          <div className={styles.modeContainer}>
            <div className={styles.modeHeader}>
              <h3 className={styles.modeTitle}>Test Mode</h3>
              <span className={styles.modeBadge} data-mode="test">TEST</span>
            </div>
            <HubForm.Grid columns={2}>
              <HubForm.Field label="Test Publishable Key">
                <input
                  type="text"
                  value={formData.stripeTestPublishableKey}
                  onChange={(e) => handleChange('stripeTestPublishableKey', e.target.value)}
                  disabled={!canEditStripeKeys}
                  placeholder="pk_test_..."
                />
              </HubForm.Field>

              <HubForm.Field label="Test Secret Key">
                <input
                  type="text"
                  value={formData.stripeTestSecretKey}
                  onChange={(e) => handleChange('stripeTestSecretKey', e.target.value)}
                  disabled={!canEditStripeKeys}
                  placeholder="sk_test_..."
                />
              </HubForm.Field>
            </HubForm.Grid>
            <div className={styles.connectionStatus}>
              <span className={`${styles.statusBadge} ${
                formData.testConnectionStatus === 'Connected' ? styles.connected :
                formData.testConnectionStatus === 'Invalid' ? styles.invalid :
                styles.disconnected
              }`}>
                {formData.testConnectionStatus === 'Connected' ? (
                  <CheckCircle size={16} style={{ marginRight: '6px' }} />
                ) : formData.testConnectionStatus === 'Invalid' ? (
                  <XCircle size={16} style={{ marginRight: '6px' }} />
                ) : (
                  <Circle size={16} style={{ marginRight: '6px' }} />
                )}
                Test: {formData.testConnectionStatus}
              </span>
            </div>
          </div>

          {/* Live Mode */}
          <div className={styles.modeContainer}>
            <div className={styles.modeHeader}>
              <h3 className={styles.modeTitle}>Live Mode</h3>
              <span className={styles.modeBadge} data-mode="live">LIVE</span>
            </div>
            <HubForm.Grid columns={2}>
              <HubForm.Field label="Live Publishable Key">
                <input
                  type="text"
                  value={formData.stripeLivePublishableKey === 'tbc' || !formData.stripeLivePublishableKey ? 'Not set in .env.local' : formData.stripeLivePublishableKey}
                  onChange={(e) => handleChange('stripeLivePublishableKey', e.target.value)}
                  disabled={!canEditStripeKeys}
                  placeholder="pk_live_..."
                />
              </HubForm.Field>

              <HubForm.Field label="Live Secret Key">
                <input
                  type="text"
                  value={formData.stripeLiveSecretKey === 'tbc' || !formData.stripeLiveSecretKey ? 'Not set in .env.local' : formData.stripeLiveSecretKey}
                  onChange={(e) => handleChange('stripeLiveSecretKey', e.target.value)}
                  disabled={!canEditStripeKeys}
                  placeholder="sk_live_..."
                />
              </HubForm.Field>
            </HubForm.Grid>
            <div className={styles.connectionStatus}>
              <span className={`${styles.statusBadge} ${
                formData.liveConnectionStatus === 'Connected' ? styles.connected :
                formData.liveConnectionStatus === 'Invalid' ? styles.invalid :
                styles.disconnected
              }`}>
                {formData.liveConnectionStatus === 'Connected' ? (
                  <CheckCircle size={16} style={{ marginRight: '6px' }} />
                ) : formData.liveConnectionStatus === 'Invalid' ? (
                  <XCircle size={16} style={{ marginRight: '6px' }} />
                ) : (
                  <Circle size={16} style={{ marginRight: '6px' }} />
                )}
                Live: {formData.liveConnectionStatus}
              </span>
            </div>
          </div>
        </HubForm.Section>

        {/* Section 2: Fee Structure */}
        <HubForm.Section title="Fee Structure">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="Platform Fee (%)" required error={errors.platformFeePercent}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.platformFeePercent}
                onChange={(e) => handleChange('platformFeePercent', parseFloat(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="Minimum Booking Amount (£)" required error={errors.minimumBookingAmount}>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formData.minimumBookingAmount}
                onChange={(e) => handleChange('minimumBookingAmount', parseFloat(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="Currency Processing Fee (%)" error={errors.currencyProcessingFeePercent}>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={formData.currencyProcessingFeePercent}
                onChange={(e) => handleChange('currencyProcessingFeePercent', parseFloat(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="Fixed Transaction Fee (£)" error={errors.fixedTransactionFee}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.fixedTransactionFee}
                onChange={(e) => handleChange('fixedTransactionFee', parseFloat(e.target.value) || 0)}
              />
            </HubForm.Field>
          </HubForm.Grid>
        </HubForm.Section>

        {/* Section 3: Payout Schedule */}
        <HubForm.Section title="Payout Schedule">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="Payout Frequency">
              <UnifiedSelect
                value={formData.payoutFrequency}
                onChange={(value) => handleChange('payoutFrequency', String(value))}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' }
                ]}
                placeholder="Select payout frequency"
              />
            </HubForm.Field>

            <HubForm.Field label="Payout Day">
              <UnifiedSelect
                value={formData.payoutDay}
                onChange={(value) => handleChange('payoutDay', String(value))}
                options={
                  formData.payoutFrequency === 'weekly' ? [
                    { value: 'monday', label: 'Monday' },
                    { value: 'tuesday', label: 'Tuesday' },
                    { value: 'wednesday', label: 'Wednesday' },
                    { value: 'thursday', label: 'Thursday' },
                    { value: 'friday', label: 'Friday' }
                  ] : formData.payoutFrequency === 'monthly' ? [
                    { value: '1', label: '1st of month' },
                    { value: '15', label: '15th of month' },
                    { value: 'last', label: 'Last day of month' }
                  ] : [
                    { value: 'daily', label: 'Every Day' }
                  ]
                }
                placeholder="Select payout day"
                disabled={formData.payoutFrequency === 'daily'}
              />
            </HubForm.Field>

            <HubForm.Field label="Minimum Payout Amount (£)" error={errors.minimumPayoutAmount}>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formData.minimumPayoutAmount}
                onChange={(e) => handleChange('minimumPayoutAmount', parseFloat(e.target.value) || 0)}
              />
            </HubForm.Field>
          </HubForm.Grid>

          <div style={{ marginTop: '16px' }}>
            <HubToggle
              checked={formData.autoApprovePayouts}
              onChange={(checked) => {
                if (checked && !confirm('Auto-approving payouts removes manual review. Continue?')) {
                  return;
                }
                handleChange('autoApprovePayouts', checked);
              }}
              label="Auto-approve Payouts"
              description="Automatically process payouts without manual approval (use with caution)"
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
