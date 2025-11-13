/**
 * IntegrationLinksCard.tsx
 * Integration management card for student accounts (v5.0)
 * Shows available integrations like Google Classroom with Connect/Disconnect buttons
 * Visible only to users with 'student' role
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './IntegrationLinksCard.module.css';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  platformName: string; // Backend platform identifier
}

export default function IntegrationLinksCard() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-classroom',
      name: 'Google Classroom',
      description: 'Sync your classes and assignments automatically',
      icon: '📚',
      connected: false,
      platformName: 'google_classroom',
    },
  ]);

  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for OAuth callback status in URL
  useEffect(() => {
    if (!searchParams) return;

    const integration = searchParams.get('integration');
    const platform = searchParams.get('platform');
    const message = searchParams.get('message');

    if (integration === 'success' && platform) {
      setStatusMessage({
        type: 'success',
        text: `Successfully connected ${platform.replace('_', ' ')}!`,
      });
      // Refresh integration status
      fetchIntegrations();
      // Clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    } else if (integration === 'error') {
      setStatusMessage({
        type: 'error',
        text: message || 'Failed to connect integration',
      });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, [searchParams]);

  // Fetch current integration status from database
  const fetchIntegrations = async () => {
    try {
      const supabase = createClient();
      const { data: links, error } = await supabase
        .from('student_integration_links')
        .select('platform_name');

      if (!error && links) {
        const connectedPlatforms = new Set(links.map(link => link.platform_name));
        setIntegrations(prev =>
          prev.map(integration => ({
            ...integration,
            connected: connectedPlatforms.has(integration.platformName),
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  // Load integration status on mount
  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleConnect = async (integrationId: string) => {
    setIsConnecting(integrationId);

    try {
      const integration = integrations.find(i => i.id === integrationId);
      if (!integration) return;

      // Call backend API to initiate OAuth flow
      const response = await fetch(`/api/integrations/connect/${integration.platformName}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        setStatusMessage({
          type: 'error',
          text: error.error || 'Failed to initiate connection',
        });
        setIsConnecting(null);
        return;
      }

      const data = await response.json();

      // Redirect to OAuth consent page
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Error connecting integration:', error);
      setStatusMessage({
        type: 'error',
        text: 'An error occurred while connecting',
      });
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    setIsConnecting(integrationId);

    try {
      const integration = integrations.find(i => i.id === integrationId);
      if (!integration) return;

      const supabase = createClient();
      const { error } = await supabase
        .from('student_integration_links')
        .delete()
        .eq('platform_name', integration.platformName);

      if (error) {
        setStatusMessage({
          type: 'error',
          text: 'Failed to disconnect integration',
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Disconnected ${integration.name}`,
        });
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      setStatusMessage({
        type: 'error',
        text: 'An error occurred while disconnecting',
      });
    }

    setIsConnecting(null);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Integrations</h3>
        <p className={styles.subtitle}>
          Connect your learning platforms to sync progress automatically
        </p>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`${styles.statusMessage} ${styles[statusMessage.type]}`}>
          {statusMessage.text}
        </div>
      )}

      <div className={styles.integrationsList}>
        {integrations.map(integration => (
          <div key={integration.id} className={styles.integrationItem}>
            <div className={styles.integrationInfo}>
              <span className={styles.integrationIcon}>{integration.icon}</span>
              <div className={styles.integrationDetails}>
                <h4 className={styles.integrationName}>{integration.name}</h4>
                <p className={styles.integrationDescription}>
                  {integration.description}
                </p>
              </div>
            </div>

            <div className={styles.integrationActions}>
              {integration.connected ? (
                <button
                  onClick={() => handleDisconnect(integration.id)}
                  disabled={isConnecting === integration.id}
                  className={`${styles.button} ${styles.buttonDisconnect}`}
                >
                  {isConnecting === integration.id ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(integration.id)}
                  disabled={isConnecting === integration.id}
                  className={`${styles.button} ${styles.buttonConnect}`}
                >
                  {isConnecting === integration.id ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <strong>Why connect?</strong>
        <p>
          Linking your accounts allows tutors and guardians to track your progress
          across multiple platforms in one place.
        </p>
      </div>
    </div>
  );
}
