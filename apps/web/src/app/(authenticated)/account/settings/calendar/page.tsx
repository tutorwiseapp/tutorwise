/**
 * Filename: apps/web/src/app/(authenticated)/account/settings/calendar/page.tsx
 * Purpose: Calendar Integration Settings page (Phase 1)
 * Created: 2026-02-06
 *
 * Allows users to connect/disconnect Google Calendar for automatic booking sync
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    fetchConnections();

    // Handle OAuth callback messages
    const success = searchParams?.get('calendar_success');
    const error = searchParams?.get('calendar_error');

    if (success === 'google_connected') {
      toast.success('Google Calendar connected successfully!');
      // Clean up URL
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

  const handleDisconnect = async (provider: 'google' | 'outlook') => {
    if (!confirm('Disconnect calendar? Existing events will remain but won't sync anymore.')) {
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

  // Prepare tabs data
  const pathname = '/account/settings/calendar';
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
                  <div className={styles.statusBadge}>✓ Connected</div>
                  <p className={styles.emailText}>{googleConnection.email}</p>

                  {googleConnection.last_synced_at && (
                    <p className={styles.lastSync}>
                      Last synced: {new Date(googleConnection.last_synced_at).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}

                  {googleConnection.status === 'error' && googleConnection.last_error && (
                    <p className={styles.errorText}>
                      Error: {googleConnection.last_error}
                    </p>
                  )}

                  <div className={styles.cardActions}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDisconnect('google')}
                      disabled={isDisconnecting}
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

            {/* Outlook Calendar Card (Coming Soon) */}
            <div className={`${styles.connectionCard} ${styles.comingSoon}`}>
              <div className={styles.cardHeader}>
                <div className={styles.providerIcon}>📆</div>
                <h3 className={styles.cardTitle}>Outlook Calendar</h3>
              </div>

              <div className={styles.disconnectedState}>
                <p className={styles.featureText}>
                  Microsoft Outlook calendar integration
                </p>
                <p className={styles.comingSoonText}>Coming Soon</p>
              </div>
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
