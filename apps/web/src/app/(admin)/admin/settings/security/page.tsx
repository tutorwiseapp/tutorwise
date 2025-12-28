/*
 * Filename: src/app/(admin)/admin/settings/security/page.tsx
 * Purpose: Admin Security Settings page
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
import { useAdminProfile } from '@/lib/rbac';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used: string | null;
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { profile } = useAdminProfile();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Admin Access Control
    require2FA: true,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    ipWhitelist: '',

    // Rate Limiting
    apiRateLimitPerMinute: 60,
    loginRateLimitPerHour: 10,
    searchRateLimitPerMinute: 30,
  });

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production API',
      key: 'tw_live_••••••••••••',
      created_at: '2025-01-15',
      last_used: '2025-12-28',
    },
    {
      id: '2',
      name: 'Mobile App',
      key: 'tw_live_••••••••••••',
      created_at: '2025-02-01',
      last_used: null,
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

    if (formData.sessionTimeoutMinutes < 5) {
      newErrors.sessionTimeoutMinutes = 'Must be at least 5 minutes';
    }

    if (formData.maxLoginAttempts < 3) {
      newErrors.maxLoginAttempts = 'Must be at least 3 attempts';
    }

    if (formData.apiRateLimitPerMinute < 10) {
      newErrors.apiRateLimitPerMinute = 'Must be at least 10 requests/minute';
    }

    if (formData.loginRateLimitPerHour < 3) {
      newErrors.loginRateLimitPerHour = 'Must be at least 3 attempts/hour';
    }

    if (formData.searchRateLimitPerMinute < 5) {
      newErrors.searchRateLimitPerMinute = 'Must be at least 5 requests/minute';
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
      alert('Security settings saved successfully!');
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

  const handleGenerateApiKey = () => {
    const name = prompt('Enter a name for this API key:');
    if (!name) return;

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name,
      key: `tw_live_${Math.random().toString(36).substring(2, 15)}`,
      created_at: new Date().toISOString().split('T')[0],
      last_used: null,
    };

    setApiKeys([...apiKeys, newKey]);
    alert(`New API key generated:\n\n${newKey.key}\n\nCopy this key now. You won't be able to see it again.`);
  };

  const handleRevokeApiKey = (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    setApiKeys(apiKeys.filter(k => k.id !== keyId));
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
          subtitle="Configure security and access controls"
          className={styles.settingsHeader}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'platform', label: 'Platform', active: false },
            { id: 'email', label: 'Email', active: false },
            { id: 'payments', label: 'Payments', active: false },
            { id: 'security', label: 'Security', active: true },
            { id: 'integrations', label: 'Integrations', active: false },
          ]}
          onTabChange={handleTabChange}
          className={styles.settingsTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Security Settings"
            items={[
              {
                question: 'What is 2FA?',
                answer: 'Two-factor authentication adds extra security by requiring a second verification step during login.',
              },
              {
                question: 'How do audit logs work?',
                answer: 'Audit logs track all admin actions for compliance and security monitoring.',
              },
              {
                question: 'What is rate limiting?',
                answer: 'Limits the number of requests users can make to prevent abuse and ensure fair usage.',
              },
            ]}
          />
          <AdminTipWidget
            title="Tips"
            tips={[
              'Enable 2FA for all superadmins',
              'Review audit logs weekly',
              'Rotate API keys quarterly',
              'Keep IP whitelist updated',
            ]}
          />
        </HubSidebar>
      }
    >
      <HubForm.Root>
        {/* Section 1: Admin Access Control */}
        <HubForm.Section title="Admin Access Control">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="Session Timeout (minutes)" error={errors.sessionTimeoutMinutes}>
              <input
                type="number"
                min="5"
                value={formData.sessionTimeoutMinutes}
                onChange={(e) => handleChange('sessionTimeoutMinutes', parseInt(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="Max Login Attempts" error={errors.maxLoginAttempts}>
              <input
                type="number"
                min="3"
                value={formData.maxLoginAttempts}
                onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="IP Whitelist (comma-separated)">
              <textarea
                value={formData.ipWhitelist}
                onChange={(e) => handleChange('ipWhitelist', e.target.value)}
                placeholder="192.168.1.1, 10.0.0.1"
                rows={3}
              />
            </HubForm.Field>
          </HubForm.Grid>

          <div style={{ marginTop: '16px' }}>
            <HubToggle
              checked={formData.require2FA}
              onChange={(checked) => handleChange('require2FA', checked)}
              label="Require 2FA for Admins"
              description="Force all admin users to enable two-factor authentication"
            />
          </div>
        </HubForm.Section>

        {/* Section 2: API Keys */}
        <HubForm.Section title="API Keys">
          <div className={styles.apiKeysContainer}>
            <table className={styles.apiKeysTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td>{key.name}</td>
                    <td className={styles.keyCell}>{key.key}</td>
                    <td>{key.created_at}</td>
                    <td>{key.last_used || 'Never'}</td>
                    <td>
                      <button
                        className={styles.revokeButton}
                        onClick={() => handleRevokeApiKey(key.id)}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Button
              variant="secondary"
              onClick={handleGenerateApiKey}
              style={{ marginTop: '16px' }}
            >
              + Generate New API Key
            </Button>
          </div>
        </HubForm.Section>

        {/* Section 3: Rate Limiting */}
        <HubForm.Section title="Rate Limiting">
          <HubForm.Grid columns={2}>
            <HubForm.Field label="API Rate Limit (requests/minute)" error={errors.apiRateLimitPerMinute}>
              <input
                type="number"
                min="10"
                value={formData.apiRateLimitPerMinute}
                onChange={(e) => handleChange('apiRateLimitPerMinute', parseInt(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="Login Rate Limit (attempts/hour)" error={errors.loginRateLimitPerHour}>
              <input
                type="number"
                min="3"
                value={formData.loginRateLimitPerHour}
                onChange={(e) => handleChange('loginRateLimitPerHour', parseInt(e.target.value) || 0)}
              />
            </HubForm.Field>

            <HubForm.Field label="Search Rate Limit (requests/minute)" error={errors.searchRateLimitPerMinute}>
              <input
                type="number"
                min="5"
                value={formData.searchRateLimitPerMinute}
                onChange={(e) => handleChange('searchRateLimitPerMinute', parseInt(e.target.value) || 0)}
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
