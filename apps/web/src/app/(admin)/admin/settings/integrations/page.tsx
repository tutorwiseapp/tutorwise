/*
 * Filename: src/app/(admin)/admin/settings/integrations/page.tsx
 * Purpose: Admin Integrations Settings page
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

interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
}

export default function IntegrationsSettingsPage() {
  const router = useRouter();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Third-Party APIs
    googleAnalyticsId: 'G-XXXXXXXXXX',
    sentryDsn: '',
    intercomWorkspaceId: '',
    slackWebhookUrl: '',

    // External Services
    enableUpstashRedis: true,
    upstashRedisUrl: '',
    enableAblyRealtime: true,
    ablyApiKey: '',
    enableSupabaseStorage: true,
    supabaseBucket: 'tutorwise-uploads',
  });

  const [webhooks, setWebhooks] = useState<Webhook[]>([
    {
      id: '1',
      url: 'https://example.com/webhooks/bookings',
      events: ['booking.created', 'booking.cancelled'],
      status: 'active',
    },
    {
      id: '2',
      url: 'https://example.com/webhooks/payments',
      events: ['payment.succeeded', 'payment.failed'],
      status: 'active',
    },
  ]);

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

    if (formData.googleAnalyticsId && !formData.googleAnalyticsId.startsWith('G-')) {
      newErrors.googleAnalyticsId = 'Must start with G-';
    }

    if (formData.sentryDsn && !formData.sentryDsn.startsWith('https://')) {
      newErrors.sentryDsn = 'Must be a valid HTTPS URL';
    }

    if (formData.slackWebhookUrl && !formData.slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
      newErrors.slackWebhookUrl = 'Must be a valid Slack webhook URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setHasUnsavedChanges(false);
      alert('Integration settings saved successfully!');
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

  const handleAddWebhook = () => {
    const url = prompt('Enter webhook URL:');
    if (!url) return;

    if (!url.startsWith('https://')) {
      alert('Webhook URL must use HTTPS');
      return;
    }

    const newWebhook: Webhook = {
      id: Date.now().toString(),
      url,
      events: [],
      status: 'active',
    };

    setWebhooks([...webhooks, newWebhook]);
  };

  const handleRemoveWebhook = (webhookId: string) => {
    if (!confirm('Remove this webhook?')) return;
    setWebhooks(webhooks.filter(w => w.id !== webhookId));
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
          subtitle="Configure third-party integrations and webhooks"
          className={styles.settingsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'platform', label: 'Platform', active: false },
            { id: 'email', label: 'Email', active: false },
            { id: 'payments', label: 'Payments', active: false },
            { id: 'security', label: 'Security', active: false },
            { id: 'integrations', label: 'Integrations', active: true },
          ]}
          onTabChange={handleTabChange}
          className={styles.settingsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Integrations"
            items={[
              {
                question: 'What are webhooks?',
                answer: 'Real-time HTTP notifications sent to external URLs when specific events occur on your platform.',
              },
              {
                question: 'How to test webhooks?',
                answer: 'Use webhook.site or requestbin.com to test webhook payloads before deploying.',
              },
              {
                question: 'What is Sentry?',
                answer: 'Error tracking service that monitors application errors and performance issues.',
              },
            ]}
          />
          <AdminTipWidget
            title="Tips"
            tips={[
              'Use HTTPS for all webhook URLs',
              'Test integrations before enabling',
              'Monitor webhook delivery rates',
              'Keep API keys secure',
            ]}
          />
        </HubSidebar>
      }
    >
      <HubForm.Root>
        {/* Section 1: Third-Party APIs */}
        <HubForm.Section title="Third-Party APIs">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="Google Analytics ID" error={errors.googleAnalyticsId}>
              <input
                type="text"
                value={formData.googleAnalyticsId}
                onChange={(e) => handleChange('googleAnalyticsId', e.target.value)}
                placeholder="G-XXXXXXXXXX"
              />
            </HubForm.Field>

            <HubForm.Field label="Sentry DSN" error={errors.sentryDsn}>
              <input
                type="text"
                value={formData.sentryDsn}
                onChange={(e) => handleChange('sentryDsn', e.target.value)}
                placeholder="https://..."
              />
            </HubForm.Field>

            <HubForm.Field label="Intercom Workspace ID">
              <input
                type="text"
                value={formData.intercomWorkspaceId}
                onChange={(e) => handleChange('intercomWorkspaceId', e.target.value)}
                placeholder="abcd1234"
              />
            </HubForm.Field>

            <HubForm.Field label="Slack Webhook URL" error={errors.slackWebhookUrl}>
              <input
                type="text"
                value={formData.slackWebhookUrl}
                onChange={(e) => handleChange('slackWebhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
            </HubForm.Field>
          </HubForm.Grid>
        </HubForm.Section>

        {/* Section 2: Webhooks */}
        <HubForm.Section title="Webhooks">
          <div className={styles.webhooksContainer}>
            <table className={styles.webhooksTable}>
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Events</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((webhook) => (
                  <tr key={webhook.id}>
                    <td className={styles.urlCell}>{webhook.url}</td>
                    <td className={styles.eventsCell}>
                      {webhook.events.length > 0 ? webhook.events.join(', ') : 'All events'}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${webhook.status === 'active' ? styles.active : styles.inactive}`}>
                        {webhook.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemoveWebhook(webhook.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Button
              variant="secondary"
              onClick={handleAddWebhook}
              style={{ marginTop: '16px' }}
            >
              + Add Webhook
            </Button>
          </div>
        </HubForm.Section>

        {/* Section 3: External Services */}
        <HubForm.Section title="External Services">
          <div className={styles.servicesGrid}>
            <div className={styles.serviceCard}>
              <HubToggle
                checked={formData.enableUpstashRedis}
                onChange={(checked) => handleChange('enableUpstashRedis', checked)}
                label="Enable Upstash Redis"
                description="In-memory caching for improved performance"
              />
              {formData.enableUpstashRedis && (
                <div className={styles.serviceConfig}>
                  <HubForm.Field label="Redis URL">
                    <input
                      type="text"
                      value={formData.upstashRedisUrl}
                      onChange={(e) => handleChange('upstashRedisUrl', e.target.value)}
                      placeholder="https://..."
                    />
                  </HubForm.Field>
                </div>
              )}
            </div>

            <div className={styles.serviceCard}>
              <HubToggle
                checked={formData.enableAblyRealtime}
                onChange={(checked) => handleChange('enableAblyRealtime', checked)}
                label="Enable Ably Realtime"
                description="Real-time messaging and presence"
              />
              {formData.enableAblyRealtime && (
                <div className={styles.serviceConfig}>
                  <HubForm.Field label="Ably API Key">
                    <input
                      type="password"
                      value={formData.ablyApiKey}
                      onChange={(e) => handleChange('ablyApiKey', e.target.value)}
                      placeholder="••••••••••••"
                    />
                  </HubForm.Field>
                </div>
              )}
            </div>

            <div className={styles.serviceCard}>
              <HubToggle
                checked={formData.enableSupabaseStorage}
                onChange={(checked) => handleChange('enableSupabaseStorage', checked)}
                label="Enable Supabase Storage"
                description="Cloud file storage and CDN"
              />
              {formData.enableSupabaseStorage && (
                <div className={styles.serviceConfig}>
                  <HubForm.Field label="Bucket Name">
                    <input
                      type="text"
                      value={formData.supabaseBucket}
                      onChange={(e) => handleChange('supabaseBucket', e.target.value)}
                      placeholder="bucket-name"
                    />
                  </HubForm.Field>
                </div>
              )}
            </div>
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
