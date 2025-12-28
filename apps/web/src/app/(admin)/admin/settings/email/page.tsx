/*
 * Filename: src/app/(admin)/admin/settings/email/page.tsx
 * Purpose: Admin Email Settings page
 * Created: 2025-12-28
 * Pattern: Uses HubForm for form layout
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
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function EmailSettingsPage() {
  const router = useRouter();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // SMTP Configuration
    smtpHost: 'smtp.resend.com',
    smtpPort: 587,
    smtpUsername: 'resend',
    smtpPassword: '',
    fromEmail: 'noreply@tutorwise.io',
    fromName: 'Tutorwise Platform',

    // Email Notifications
    enableBookingConfirmations: true,
    enablePaymentReceipts: true,
    enableDisputeNotifications: true,
    enableWeeklyReports: true,
    enableWelcomeEmails: true,
  });

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

    if (!formData.smtpHost || formData.smtpHost.trim() === '') {
      newErrors.smtpHost = 'SMTP host is required';
    }

    if (!formData.smtpPort || formData.smtpPort < 1 || formData.smtpPort > 65535) {
      newErrors.smtpPort = 'Port must be between 1-65535';
    }

    if (!formData.fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.fromEmail)) {
      newErrors.fromEmail = 'Valid email address required';
    }

    if (!formData.fromName || formData.fromName.trim() === '') {
      newErrors.fromName = 'From name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setIsTesting(true);
    try {
      // TODO: Replace with real API call
      // const response = await fetch('/api/admin/settings/email/test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     smtpHost: formData.smtpHost,
      //     smtpPort: formData.smtpPort,
      //     smtpUsername: formData.smtpUsername,
      //     smtpPassword: formData.smtpPassword,
      //   }),
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert('Test email sent successfully! Check your inbox.');
    } catch (error) {
      console.error('Failed to test connection:', error);
      alert('Failed to send test email. Please check your SMTP configuration.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setHasUnsavedChanges(false);
      alert('Email settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
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
          subtitle="Configure email and notification preferences"
          className={styles.settingsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'platform', label: 'Platform', active: false },
            { id: 'email', label: 'Email', active: true },
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
            title="Email Settings"
            items={[
              {
                question: 'How do I configure SMTP?',
                answer: 'Get SMTP credentials from your email provider (Resend, SendGrid, Mailgun, etc.) and enter them here.',
              },
              {
                question: 'Why test emails?',
                answer: 'Testing ensures your SMTP configuration is correct before sending emails to users.',
              },
              {
                question: 'What are email notifications?',
                answer: 'Automated emails sent to users for bookings, payments, and other platform events.',
              },
            ]}
          />
          <AdminTipWidget
            title="Tips"
            tips={[
              'Use a dedicated email service provider',
              'Test configuration before saving',
              'Keep SMTP credentials secure',
              'Monitor email delivery rates',
            ]}
          />
        </HubSidebar>
      }
    >
      <HubForm.Root>
        {/* Section 1: SMTP Configuration */}
        <HubForm.Section title="SMTP Configuration">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="SMTP Host" required error={errors.smtpHost}>
              <input
                type="text"
                value={formData.smtpHost}
                onChange={(e) => handleChange('smtpHost', e.target.value)}
                placeholder="smtp.example.com"
              />
            </HubForm.Field>

            <HubForm.Field label="SMTP Port" required error={errors.smtpPort}>
              <input
                type="number"
                min="1"
                max="65535"
                value={formData.smtpPort}
                onChange={(e) => handleChange('smtpPort', parseInt(e.target.value) || 0)}
                placeholder="587"
              />
            </HubForm.Field>

            <HubForm.Field label="SMTP Username">
              <input
                type="text"
                value={formData.smtpUsername}
                onChange={(e) => handleChange('smtpUsername', e.target.value)}
                placeholder="apikey or username"
              />
            </HubForm.Field>

            <HubForm.Field label="SMTP Password">
              <input
                type="password"
                value={formData.smtpPassword}
                onChange={(e) => handleChange('smtpPassword', e.target.value)}
                placeholder="••••••••••••"
              />
            </HubForm.Field>

            <HubForm.Field label="From Email" required error={errors.fromEmail}>
              <input
                type="email"
                value={formData.fromEmail}
                onChange={(e) => handleChange('fromEmail', e.target.value)}
                placeholder="noreply@example.com"
              />
            </HubForm.Field>

            <HubForm.Field label="From Name" required error={errors.fromName}>
              <input
                type="text"
                value={formData.fromName}
                onChange={(e) => handleChange('fromName', e.target.value)}
                placeholder="Your Platform Name"
              />
            </HubForm.Field>
          </HubForm.Grid>

          <div className={styles.testButtonContainer}>
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              isLoading={isTesting}
            >
              {isTesting ? 'Sending Test Email...' : 'Test Connection'}
            </Button>
          </div>
        </HubForm.Section>

        {/* Section 2: Email Notifications */}
        <HubForm.Section title="Email Notifications">
          <div className={styles.toggleGrid}>
            <HubToggle
              checked={formData.enableBookingConfirmations}
              onChange={(checked) => handleChange('enableBookingConfirmations', checked)}
              label="Booking Confirmations"
              description="Send confirmation emails when bookings are created"
            />

            <HubToggle
              checked={formData.enablePaymentReceipts}
              onChange={(checked) => handleChange('enablePaymentReceipts', checked)}
              label="Payment Receipts"
              description="Send receipt emails after successful payments"
            />

            <HubToggle
              checked={formData.enableDisputeNotifications}
              onChange={(checked) => handleChange('enableDisputeNotifications', checked)}
              label="Dispute Notifications"
              description="Notify admins about new disputes"
            />

            <HubToggle
              checked={formData.enableWeeklyReports}
              onChange={(checked) => handleChange('enableWeeklyReports', checked)}
              label="Weekly Reports to Admins"
              description="Send weekly platform summary to admin team"
            />

            <HubToggle
              checked={formData.enableWelcomeEmails}
              onChange={(checked) => handleChange('enableWelcomeEmails', checked)}
              label="User Welcome Emails"
              description="Send welcome email to new users"
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
    </HubPageLayout>
  );
}
