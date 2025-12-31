/*
 * Filename: src/app/(admin)/admin/seo/settings/page.tsx
 * Purpose: SEO Settings admin page with external service toggles
 * Created: 2025-12-29
 * Goal: Granular control of GSC, SerpApi, Ahrefs integrations
 */
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminHelpWidget, AdminStatsWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { Settings, CheckCircle, XCircle, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { usePermission } from '@/lib/rbac';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

interface SEOSettings {
  id: number;
  gsc_enabled: boolean;
  gsc_auto_sync: boolean;
  gsc_api_key_set: boolean;
  serpapi_enabled: boolean;
  serpapi_auto_track: boolean;
  serpapi_api_key_set: boolean;
  ahrefs_enabled: boolean;
  ahrefs_auto_sync: boolean;
  ahrefs_api_key_set: boolean;
  use_fallback_tracking: boolean;
  fallback_tracking_method: 'manual' | 'gsc_only' | 'disabled';
  gsc_last_sync_at: string | null;
}

interface ServiceHealth {
  service_name: string;
  status: 'healthy' | 'degraded' | 'down' | 'disabled';
  last_successful_call: string | null;
  last_failed_call: string | null;
  consecutive_failures: number;
  error_message: string | null;
  api_calls_today: number;
  api_limit_daily: number;
}

export default function AdminSeoSettingsPage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const canUpdate = usePermission('seo', 'update');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin', 'seo-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seo_settings').select('*').single();
      if (error) throw error;
      return data as SEOSettings;
    },
  });

  // Fetch service health
  const { data: serviceHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['admin', 'seo-service-health'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seo_service_health').select('*');
      if (error) throw error;
      return data as ServiceHealth[];
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<SEOSettings>) => {
      const { data, error } = await supabase
        .from('seo_settings')
        .update(newSettings)
        .eq('id', 1)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seo-settings'] });
    },
  });

  // Get service health by name
  const getServiceHealth = (serviceName: string): ServiceHealth | undefined => {
    return serviceHealth?.find((s) => s.service_name === serviceName);
  };

  // Handle toggle change
  const handleToggle = async (field: keyof SEOSettings, value: boolean) => {
    if (!canUpdate) return;

    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({ [field]: value });
    } catch (error) {
      alert('Failed to update settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle fallback method change
  const handleFallbackMethodChange = async (method: 'manual' | 'gsc_only' | 'disabled') => {
    if (!canUpdate) return;

    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({ fallback_tracking_method: method });
    } catch (error) {
      alert('Failed to update fallback method. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render status badge
  const renderStatusBadge = (status: ServiceHealth['status']) => {
    const badges = {
      healthy: { icon: CheckCircle, label: 'Healthy', className: styles.statusHealthy },
      degraded: { icon: AlertTriangle, label: 'Degraded', className: styles.statusDegraded },
      down: { icon: XCircle, label: 'Down', className: styles.statusDown },
      disabled: { icon: XCircle, label: 'Disabled', className: styles.statusDisabled },
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span className={`${styles.statusBadge} ${badge.className}`}>
        <Icon className={styles.statusIcon} />
        {badge.label}
      </span>
    );
  };

  // Render service card
  const renderServiceCard = (
    serviceName: string,
    displayName: string,
    description: string,
    enabledField: keyof SEOSettings,
    autoField: keyof SEOSettings,
    apiKeySetField: keyof SEOSettings
  ) => {
    const health = getServiceHealth(serviceName);
    const enabled = settings?.[enabledField] as boolean;
    const autoEnabled = settings?.[autoField] as boolean;
    const apiKeySet = settings?.[apiKeySetField] as boolean;

    return (
      <div className={styles.serviceCard}>
        <div className={styles.serviceHeader}>
          <div className={styles.serviceInfo}>
            <h3 className={styles.serviceName}>{displayName}</h3>
            <p className={styles.serviceDescription}>{description}</p>
          </div>
          {health && renderStatusBadge(health.status)}
        </div>

        <div className={styles.serviceToggles}>
          {/* API Key Status */}
          <div className={styles.toggleRow}>
            <div className={styles.toggleLabel}>
              <span className={styles.labelText}>API Key Configured</span>
              <span className={styles.labelHelp}>
                {apiKeySet ? '✓ API key is set in environment variables' : '✗ API key not found'}
              </span>
            </div>
            <div className={apiKeySet ? styles.indicatorSuccess : styles.indicatorError}>
              {apiKeySet ? 'Configured' : 'Missing'}
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className={styles.toggleRow}>
            <div className={styles.toggleLabel}>
              <span className={styles.labelText}>Enable Service</span>
              <span className={styles.labelHelp}>Turn this service on or off</span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleToggle(enabledField, e.target.checked)}
                disabled={!canUpdate || !apiKeySet || isSaving}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* Auto Sync/Track Toggle */}
          <div className={styles.toggleRow}>
            <div className={styles.toggleLabel}>
              <span className={styles.labelText}>Automatic {serviceName === 'serpapi' ? 'Tracking' : 'Sync'}</span>
              <span className={styles.labelHelp}>
                Run {serviceName === 'serpapi' ? 'rank checks' : 'data sync'} automatically on schedule
              </span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={autoEnabled}
                onChange={(e) => handleToggle(autoField, e.target.checked)}
                disabled={!canUpdate || !enabled || isSaving}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>

        {/* Health Stats */}
        {health && enabled && (
          <div className={styles.healthStats}>
            <div className={styles.healthStat}>
              <span className={styles.statLabel}>Last Success:</span>
              <span className={styles.statValue}>
                {health.last_successful_call
                  ? new Date(health.last_successful_call).toLocaleString()
                  : 'Never'}
              </span>
            </div>
            <div className={styles.healthStat}>
              <span className={styles.statLabel}>API Calls Today:</span>
              <span className={styles.statValue}>
                {health.api_calls_today} / {health.api_limit_daily}
              </span>
            </div>
            {health.consecutive_failures > 0 && (
              <div className={styles.healthStat}>
                <span className={styles.statLabel}>Consecutive Failures:</span>
                <span className={`${styles.statValue} ${styles.statError}`}>{health.consecutive_failures}</span>
              </div>
            )}
            {health.error_message && (
              <div className={styles.errorMessage}>
                <AlertTriangle className={styles.errorIcon} />
                {health.error_message}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <HubPageLayout
      header={
        <>
          <HubHeader
            title="SEO Settings"
            subtitle="Configure external integrations and tracking methods"
            className={styles.settingsHeader}
          />
          <HubTabs
            tabs={[
              { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            ]}
            onTabChange={(tabId) => setActiveTab(tabId as 'overview')}
            className={styles.settingsTabs}
          />
        </>
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Service Status"
            stats={[
              {
                label: 'Google Search Console',
                value: settings?.gsc_enabled ? 'Enabled' : 'Disabled',
              },
              {
                label: 'SerpApi Tracking',
                value: settings?.serpapi_enabled ? 'Enabled' : 'Disabled',
              },
              {
                label: 'Ahrefs Backlinks',
                value: settings?.ahrefs_enabled ? 'Enabled' : 'Disabled',
              },
              {
                label: 'Fallback Mode',
                value: settings?.use_fallback_tracking ? 'On' : 'Off',
              },
            ]}
          />
          <AdminHelpWidget
            title="External Services"
            items={[
              {
                question: 'What is Google Search Console?',
                answer: 'Free tool from Google showing actual search performance data (impressions, clicks, CTR).',
              },
              {
                question: 'What is SerpApi?',
                answer:
                  'Paid service ($50/month) that provides accurate daily rank tracking. More precise than GSC estimates.',
              },
              {
                question: 'What is fallback mode?',
                answer:
                  'When SerpApi is unavailable, use GSC data to estimate positions from CTR. Less accurate but free.',
              },
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className={styles.settingsContainer}>
        {/* External Services */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>External Services</h2>
          <p className={styles.sectionDescription}>
            Enable or disable third-party integrations. Each service can be toggled independently during testing and
            production.
          </p>

          <div className={styles.servicesGrid}>
            {renderServiceCard(
              'gsc',
              'Google Search Console',
              'Free search performance data from Google (impressions, clicks, CTR, positions)',
              'gsc_enabled',
              'gsc_auto_sync',
              'gsc_api_key_set'
            )}

            {renderServiceCard(
              'serpapi',
              'SerpApi Rank Tracking',
              'Accurate daily rank tracking ($50/month) - checks actual Google search results',
              'serpapi_enabled',
              'serpapi_auto_track',
              'serpapi_api_key_set'
            )}

            {renderServiceCard(
              'ahrefs',
              'Ahrefs Backlinks',
              'Backlink monitoring and competitor analysis ($99-199/month)',
              'ahrefs_enabled',
              'ahrefs_auto_sync',
              'ahrefs_api_key_set'
            )}
          </div>
        </section>

        {/* Fallback Settings */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Fallback Tracking</h2>
          <p className={styles.sectionDescription}>
            When SerpApi is unavailable or disabled, choose how to track rankings.
          </p>

          <div className={styles.fallbackOptions}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleLabel}>
                <span className={styles.labelText}>Use Fallback Tracking</span>
                <span className={styles.labelHelp}>Enable fallback methods when primary service unavailable</span>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={settings?.use_fallback_tracking || false}
                  onChange={(e) => handleToggle('use_fallback_tracking', e.target.checked)}
                  disabled={!canUpdate || isSaving}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            {settings?.use_fallback_tracking && (
              <div className={styles.radioGroup}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="fallback_method"
                    value="gsc_only"
                    checked={settings?.fallback_tracking_method === 'gsc_only'}
                    onChange={() => handleFallbackMethodChange('gsc_only')}
                    disabled={!canUpdate || isSaving}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioLabel}>GSC Estimation Only</span>
                    <span className={styles.radioDescription}>
                      Estimate positions from GSC CTR data (free, less accurate)
                    </span>
                  </div>
                </label>

                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="fallback_method"
                    value="manual"
                    checked={settings?.fallback_tracking_method === 'manual'}
                    onChange={() => handleFallbackMethodChange('manual')}
                    disabled={!canUpdate || isSaving}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioLabel}>Manual Entry</span>
                    <span className={styles.radioDescription}>
                      Require manual position updates when external services unavailable
                    </span>
                  </div>
                </label>

                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="fallback_method"
                    value="disabled"
                    checked={settings?.fallback_tracking_method === 'disabled'}
                    onChange={() => handleFallbackMethodChange('disabled')}
                    disabled={!canUpdate || isSaving}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioLabel}>Disabled</span>
                    <span className={styles.radioDescription}>No tracking when external services unavailable</span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </section>

        {/* Testing Guidance */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Testing Recommendations</h2>
          <div className={styles.testingGuide}>
            <div className={styles.testingStep}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h4>Start with GSC Only</h4>
                <p>Enable Google Search Console first (free). Verify data syncs correctly.</p>
              </div>
            </div>
            <div className={styles.testingStep}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h4>Test Fallback Mode</h4>
                <p>Keep SerpApi disabled and test GSC estimation mode. Verify position calculations are reasonable.</p>
              </div>
            </div>
            <div className={styles.testingStep}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h4>Add SerpApi for Accuracy</h4>
                <p>
                  Once GSC is working, enable SerpApi for precise tracking. Compare results with GSC estimates to
                  validate.
                </p>
              </div>
            </div>
            <div className={styles.testingStep}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h4>Add Ahrefs for Backlinks</h4>
                <p>Finally, enable Ahrefs to track backlinks and competitor analysis.</p>
              </div>
            </div>
          </div>
        </section>
        </div>
      )}
    </HubPageLayout>
  );
}
