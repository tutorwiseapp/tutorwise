/**
 * Filename: apps/web/src/app/(authenticated)/account/settings/calendar/page.tsx
 * Purpose: Calendar Integration Settings page (Phase 1)
 * Created: 2026-02-06
 *
 * Allows users to connect/disconnect Google Calendar for automatic booking sync
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { HubPageLayout, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountCard from '@/app/components/feature/account/AccountCard';
import AccountHelpWidget from '@/app/components/feature/account/AccountHelpWidget';
import AccountTipWidget from '@/app/components/feature/account/AccountTipWidget';
import AccountVideoWidget from '@/app/components/feature/account/AccountVideoWidget';
import AccountHeroHeader from '@/app/components/feature/account/AccountHeroHeader';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import type { CalendarConnection } from '@/types';
import styles from './page.module.css';

export default function CalendarSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    total: number;
    synced: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    fetchConnections();

    // Handle OAuth callback messages
    const success = searchParams?.get('calendar_success');
    const error = searchParams?.get('calendar_error');

    if (success === 'google_connected') {
      toast.success('Google Calendar connected successfully! Syncing existing bookings...');
      // Clean up URL
      router.replace('/account/settings/calendar');
      // Note: Bulk sync happens automatically in the OAuth callback
      // User will see the last_synced_at timestamp update
    } else if (success === 'outlook_connected') {
      toast.success('Outlook Calendar connected successfully! Syncing existing bookings...');
      router.replace('/account/settings/calendar');
    } else if (error === 'cancelled') {
      toast.error('Calendar connection cancelled');
      router.replace('/account/settings/calendar');
    } else if (error) {
      toast.error('Failed to connect calendar. Please try again.');
      router.replace('/account/settings/calendar');
    }
  }, [searchParams, router]);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/calendar/connections');
      const data = await response.json();
      if (data.success) {
        setConnections(data.connections || []);
      } else {
        console.error('Failed to fetch connections:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/calendar/connect/google');
      const data = await response.json();

      if (data.success && data.auth_url) {
        // Redirect to Google OAuth
        window.location.href = data.auth_url;
      } else {
        throw new Error(data.error || 'Failed to get auth URL');
      }
    } catch (error) {
      console.error('Connect error:', error);
      toast.error('Failed to initiate Google Calendar connection');
      setIsConnecting(false);
    }
  };

  const handleConnectOutlook = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/calendar/connect/outlook');
      const data = await response.json();

      if (data.success && data.auth_url) {
        // Redirect to Microsoft OAuth
        window.location.href = data.auth_url;
      } else {
        throw new Error(data.error || 'Failed to get auth URL');
      }
    } catch (error) {
      console.error('Connect error:', error);
      toast.error('Failed to initiate Outlook Calendar connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'outlook') => {
    if (!confirm('Disconnect calendar? Existing events will remain but will not sync anymore.')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Calendar disconnected');
        fetchConnections();
      } else {
        throw new Error(data.error || 'Disconnect failed');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect calendar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncProgress(null);

    try {
      const response = await fetch('/api/calendar/bulk-sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSyncProgress({
          total: data.result.total,
          synced: data.result.synced,
          failed: data.result.failed,
        });

        if (data.result.failed > 0) {
          toast.error(`Synced ${data.result.synced}/${data.result.total} bookings. ${data.result.failed} failed.`);
        } else if (data.result.total === 0) {
          toast.success('No bookings to sync');
        } else {
          toast.success(`Successfully synced ${data.result.synced} booking(s) to your calendar`);
        }

        // Refresh connections to update last_synced_at
        fetchConnections();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      toast.error('Failed to sync bookings. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'personal-info', label: 'Personal Info', active: pathname === '/account/personal-info' },
    { id: 'professional-info', label: 'Professional Info', active: pathname === '/account/professional-info' },
    { id: 'referral-preferences', label: 'Referral Preferences', active: pathname === '/account/referral-preferences' },
    { id: 'settings', label: 'Settings', active: pathname === '/account/settings' || pathname === '/account/settings/calendar' },
  ];

  const handleTabChange = (tabId: string) => {
    router.push(`/account/${tabId}`);
  };

  const googleConnection = connections.find(c => c.provider === 'google');
  const outlookConnection = connections.find(c => c.provider === 'outlook');

  return (
    <HubPageLayout
      header={<AccountHeroHeader />}
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <AccountCard />
          <AccountHelpWidget />
          <AccountTipWidget />
          <AccountVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.content}>
        <h1 className={styles.title}>Calendar Integration</h1>
        <p className={styles.description}>
          Connect your calendar to automatically sync TutorWise bookings. Confirmed sessions will appear in your calendar with automatic reminders.
        </p>

        {isLoading ? (
          <div className={styles.loading}>Loading connections...</div>
        ) : (
          <div className={styles.calendarGrid}>
            {/* Google Calendar Card */}
            <div className={styles.connectionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.providerIcon}>📅</div>
                <h3 className={styles.cardTitle}>Google Calendar</h3>
              </div>

              {googleConnection ? (
                <div className={styles.connectedState}>
                  {/* Status Badge - Dynamic based on connection health */}
                  <div className={`${styles.statusBadge} ${
                    googleConnection.status === 'error' ? styles.statusError :
                    googleConnection.status === 'active' ? styles.statusActive :
                    styles.statusInactive
                  }`}>
                    {googleConnection.status === 'error' ? '⚠ Error' :
                     googleConnection.status === 'active' ? '✓ Connected' :
                     '○ Inactive'}
                  </div>

                  <p className={styles.emailText}>{googleConnection.email}</p>

                  {/* Health Dashboard */}
                  <div className={styles.healthDashboard}>
                    <div className={styles.healthItem}>
                      <span className={styles.healthLabel}>Sync Status:</span>
                      <span className={styles.healthValue}>
                        {googleConnection.sync_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className={styles.healthItem}>
                      <span className={styles.healthLabel}>Connection:</span>
                      <span className={styles.healthValue}>
                        {googleConnection.status === 'active' ? 'Healthy' :
                         googleConnection.status === 'error' ? 'Needs Attention' :
                         'Inactive'}
                      </span>
                    </div>
                    {googleConnection.last_synced_at ? (
                      <div className={styles.healthItem}>
                        <span className={styles.healthLabel}>Last Sync:</span>
                        <span className={styles.healthValue}>
                          {new Date(googleConnection.last_synced_at).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ) : (
                      <div className={styles.healthItem}>
                        <span className={styles.healthLabel}>Last Sync:</span>
                        <span className={`${styles.healthValue} ${styles.healthWarning}`}>
                          Never synced
                        </span>
                      </div>
                    )}
                    <div className={styles.healthItem}>
                      <span className={styles.healthLabel}>Connected:</span>
                      <span className={styles.healthValue}>
                        {new Date(googleConnection.connected_at).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Error Message */}
                  {googleConnection.status === 'error' && googleConnection.last_error && (
                    <div className={styles.errorAlert}>
                      <div className={styles.errorHeader}>
                        <span className={styles.errorIcon}>⚠</span>
                        <span className={styles.errorTitle}>Connection Error</span>
                      </div>
                      <p className={styles.errorMessage}>{googleConnection.last_error}</p>
                      <p className={styles.errorAction}>
                        Try disconnecting and reconnecting your calendar to resolve this issue.
                      </p>
                    </div>
                  )}

                  {/* Bulk Sync Progress */}
                  {isSyncing && (
                    <div className={styles.syncProgress}>
                      <div className={styles.syncSpinner}></div>
                      <p className={styles.syncText}>
                        {syncProgress
                          ? `Syncing ${syncProgress.synced} of ${syncProgress.total} bookings...`
                          : 'Starting sync...'}
                      </p>
                    </div>
                  )}

                  {/* Sync result summary */}
                  {!isSyncing && syncProgress && (
                    <div className={styles.syncResult}>
                      <p className={styles.syncResultText}>
                        ✓ Synced {syncProgress.synced}/{syncProgress.total} bookings
                        {syncProgress.failed > 0 && ` (${syncProgress.failed} failed)`}
                      </p>
                    </div>
                  )}

                  <div className={styles.cardActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleManualSync}
                      disabled={isSyncing || isDisconnecting}
                    >
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDisconnect('google')}
                      disabled={isDisconnecting || isSyncing}
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.disconnectedState}>
                  <p className={styles.featureText}>
                    Automatically sync bookings to Google Calendar with reminders
                  </p>
                  <ul className={styles.featureList}>
                    <li>Confirmed sessions appear automatically</li>
                    <li>Get reminders (1 day, 1 hour, 15 min before)</li>
                    <li>See all commitments in one place</li>
                    <li>Works across all your devices</li>
                  </ul>
                  <Button
                    variant="primary"
                    onClick={handleConnectGoogle}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
                  </Button>
                </div>
              )}
            </div>

            {/* Outlook Calendar Card */}
            <div className={styles.connectionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.providerIcon}>📆</div>
                <h3 className={styles.cardTitle}>Outlook Calendar</h3>
              </div>

              {outlookConnection ? (
                <div className={styles.connectedState}>
                  {/* Status Badge - Dynamic based on connection health */}
                  <div className={`${styles.statusBadge} ${
                    outlookConnection.status === 'error' ? styles.statusError :
                    outlookConnection.status === 'active' ? styles.statusActive :
                    styles.statusInactive
                  }`}>
                    {outlookConnection.status === 'error' ? '⚠ Error' :
                     outlookConnection.status === 'active' ? '✓ Connected' :
                     '○ Inactive'}
                  </div>

                  <p className={styles.emailText}>{outlookConnection.email}</p>

                  {/* Health Dashboard */}
                  <div className={styles.healthDashboard}>
                    <div className={styles.healthItem}>
                      <span className={styles.healthLabel}>Sync Status:</span>
                      <span className={styles.healthValue}>
                        {outlookConnection.sync_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className={styles.healthItem}>
                      <span className={styles.healthLabel}>Connection:</span>
                      <span className={styles.healthValue}>
                        {outlookConnection.status === 'active' ? 'Healthy' :
                         outlookConnection.status === 'error' ? 'Needs Attention' :
                         'Inactive'}
                      </span>
                    </div>
                    {outlookConnection.last_synced_at ? (
                      <div className={styles.healthItem}>
                        <span className={styles.healthLabel}>Last Sync:</span>
                        <span className={styles.healthValue}>
                          {new Date(outlookConnection.last_synced_at).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ) : (
                      <div className={styles.healthItem}>
                        <span className={styles.healthLabel}>Last Sync:</span>
                        <span className={`${styles.healthValue} ${styles.healthWarning}`}>
                          Never synced
                        </span>
                      </div>
                    )}
                    <div className={styles.healthItem}>
                      <span className={styles.healthLabel}>Connected:</span>
                      <span className={styles.healthValue}>
                        {new Date(outlookConnection.connected_at).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Error Message */}
                  {outlookConnection.status === 'error' && outlookConnection.last_error && (
                    <div className={styles.errorAlert}>
                      <div className={styles.errorHeader}>
                        <span className={styles.errorIcon}>⚠</span>
                        <span className={styles.errorTitle}>Connection Error</span>
                      </div>
                      <p className={styles.errorMessage}>{outlookConnection.last_error}</p>
                      <p className={styles.errorAction}>
                        Try disconnecting and reconnecting your calendar to resolve this issue.
                      </p>
                    </div>
                  )}

                  {/* Bulk Sync Progress */}
                  {isSyncing && (
                    <div className={styles.syncProgress}>
                      <div className={styles.syncSpinner}></div>
                      <p className={styles.syncText}>
                        {syncProgress
                          ? `Syncing ${syncProgress.synced} of ${syncProgress.total} bookings...`
                          : 'Starting sync...'}
                      </p>
                    </div>
                  )}

                  {/* Sync result summary */}
                  {!isSyncing && syncProgress && (
                    <div className={styles.syncResult}>
                      <p className={styles.syncResultText}>
                        ✓ Synced {syncProgress.synced}/{syncProgress.total} bookings
                        {syncProgress.failed > 0 && ` (${syncProgress.failed} failed)`}
                      </p>
                    </div>
                  )}

                  <div className={styles.cardActions}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleManualSync}
                      disabled={isSyncing || isDisconnecting}
                    >
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDisconnect('outlook')}
                      disabled={isDisconnecting || isSyncing}
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.disconnectedState}>
                  <p className={styles.featureText}>
                    Automatically sync bookings to Outlook Calendar with reminders
                  </p>
                  <ul className={styles.featureList}>
                    <li>Confirmed sessions appear automatically</li>
                    <li>Get reminders before sessions</li>
                    <li>See all commitments in one place</li>
                    <li>Works with Microsoft 365 and Outlook.com</li>
                  </ul>
                  <Button
                    variant="primary"
                    onClick={handleConnectOutlook}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Outlook Calendar'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className={styles.helpSection}>
          <h3 className={styles.helpTitle}>How it works</h3>
          <ul className={styles.helpList}>
            <li>When you confirm a booking, it automatically appears in your connected calendar</li>
            <li>If you reschedule a booking, the calendar event updates automatically</li>
            <li>If you cancel a booking, the calendar event is removed</li>
            <li>Automatic reminders help you never miss a session</li>
          </ul>
        </div>
      </div>
    </HubPageLayout>
  );
}
