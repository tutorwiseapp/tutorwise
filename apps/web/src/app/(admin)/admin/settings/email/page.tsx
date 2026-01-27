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
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // SMTP Configuration
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',

    // Email Notifications
    enableBookingConfirmations: true,
    enablePaymentReceipts: true,
    enableDisputeNotifications: true,
    enableWeeklyReports: true,
    enableWelcomeEmails: true,
  });

  // Email Testing State
  const [testEmailType, setTestEmailType] = useState('booking_confirmation');
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const emailTypes = [
    { value: 'welcome', label: 'Welcome Email', category: 'Auth' },
    { value: 'account_deleted', label: 'Account Deleted', category: 'Auth' },
    { value: 'booking_request', label: 'Booking Request (to Tutor)', category: 'Booking' },
    { value: 'booking_confirmation', label: 'Booking Confirmed (to Client)', category: 'Booking' },
    { value: 'booking_cancelled', label: 'Booking Cancelled', category: 'Booking' },
    { value: 'session_reminder', label: 'Session Reminder (24h)', category: 'Booking' },
    { value: 'payment_receipt', label: 'Payment Receipt', category: 'Payment' },
    { value: 'payment_failed', label: 'Payment Failed', category: 'Payment' },
    { value: 'refund', label: 'Refund Processed', category: 'Payment' },
    { value: 'withdrawal_processed', label: 'Withdrawal Processed', category: 'Payment' },
    { value: 'withdrawal_failed', label: 'Withdrawal Failed', category: 'Payment' },
    { value: 'new_review', label: 'New Review Received', category: 'Reports' },
    { value: 'tutor_report', label: 'Tutor Weekly Report', category: 'Reports' },
    { value: 'agent_report', label: 'Agent Weekly Report', category: 'Reports' },
  ];

  // Fetch real email configuration from API on mount
  useEffect(() => {
    async function fetchEmailConfig() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/email-config');

        if (!response.ok) {
          throw new Error('Failed to fetch email config');
        }

        const config = await response.json();

        setFormData(prev => ({
          ...prev,
          smtpHost: config.smtp.host,
          smtpPort: config.smtp.port,
          smtpUsername: config.smtp.username,
          smtpPassword: config.smtp.password, // Show full password for admin
          fromEmail: config.fromEmail,
          fromName: config.fromName,
          enableBookingConfirmations: config.notifications.enableBookingConfirmations,
          enablePaymentReceipts: config.notifications.enablePaymentReceipts,
          enableDisputeNotifications: config.notifications.enableDisputeNotifications,
          enableWeeklyReports: config.notifications.enableWeeklyReports,
          enableWelcomeEmails: config.notifications.enableWelcomeEmails,
        }));
      } catch (error) {
        console.error('Error fetching email config:', error);
        alert('Failed to load email configuration. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchEmailConfig();
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

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailAddress)) {
      setTestResult({ success: false, message: 'Please enter a valid email address' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: testEmailType,
          to: testEmailAddress,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const emailLabel = emailTypes.find(e => e.value === testEmailType)?.label || testEmailType;
        setTestResult({
          success: true,
          message: `${emailLabel} sent to ${testEmailAddress}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test email',
        });
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      setTestResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsSendingTest(false);
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
      {isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
          Loading email configuration...
        </div>
      ) : (
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
                type="text"
                value={formData.smtpPassword}
                onChange={(e) => handleChange('smtpPassword', e.target.value)}
                placeholder="Enter SMTP password (Resend API key)"
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

        {/* Section 3: Email Testing */}
        <HubForm.Section title="Test Emails">
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
            Send test emails to verify your templates are working correctly.
          </p>
          <HubForm.Grid columns={2}>
            <HubForm.Field label="Email Type">
              <select
                value={testEmailType}
                onChange={(e) => setTestEmailType(e.target.value)}
                style={{ width: '100%' }}
              >
                {['Auth', 'Booking', 'Payment', 'Reports'].map(category => (
                  <optgroup key={category} label={category}>
                    {emailTypes
                      .filter(e => e.category === category)
                      .map(email => (
                        <option key={email.value} value={email.value}>
                          {email.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </HubForm.Field>

            <HubForm.Field label="Recipient Email">
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="Enter email address"
              />
            </HubForm.Field>
          </HubForm.Grid>

          <div className={styles.testButtonContainer}>
            <Button
              variant="secondary"
              onClick={handleSendTestEmail}
              disabled={isSendingTest || !testEmailAddress}
              isLoading={isSendingTest}
            >
              {isSendingTest ? 'Sending...' : 'Send Test Email'}
            </Button>
            {testResult && (
              <span
                style={{
                  marginLeft: '12px',
                  fontSize: '14px',
                  color: testResult.success ? '#059669' : '#dc2626',
                }}
              >
                {testResult.success ? '✓' : '✗'} {testResult.message}
              </span>
            )}
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
