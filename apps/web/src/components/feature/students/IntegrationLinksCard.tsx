/**
 * IntegrationLinksCard.tsx
 * Integration management card for user accounts (v5.0+)
 * Shows available integrations like Google Classroom with Connect/Disconnect buttons
 * Visible to users with 'student' or 'tutor' role
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './IntegrationLinksCard.module.css';

// Write scopes required for full functionality
const REQUIRED_WRITE_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses',
  'https://www.googleapis.com/auth/classroom.coursework.students',
];

interface Integration {
  id: string;
  name: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  connected: boolean;
  needsReconnect: boolean; // True if connected but missing required scopes
  externalEmail: string | null;
  platformName: string;
}

interface IntegrationLinksCardProps {
  userRole?: string;
}

export default function IntegrationLinksCard({ userRole = 'student' }: IntegrationLinksCardProps) {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-classroom',
      name: 'Google Classroom',
      description: userRole === 'tutor'
        ? 'Create classes and post session summaries for your students'
        : 'Sync your classes and assignments automatically',
      Icon: GraduationCap,
      connected: false,
      needsReconnect: false,
      externalEmail: null,
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
      fetchIntegrations();
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
        .select('platform_name, scopes, external_email, is_active');

      if (!error && links) {
        const linkMap = new Map(
          links.map(link => [link.platform_name, link])
        );

        setIntegrations(prev =>
          prev.map(integration => {
            const link = linkMap.get(integration.platformName);
            if (!link || !link.is_active) {
              return { ...integration, connected: false, needsReconnect: false, externalEmail: null };
            }

            // Check if existing scopes include required write scopes
            const currentScopes = link.scopes || [];
            const hasWriteScopes = REQUIRED_WRITE_SCOPES.every(
              scope => currentScopes.includes(scope)
            );

            return {
              ...integration,
              connected: true,
              needsReconnect: !hasWriteScopes,
              externalEmail: link.external_email || null,
            };
          })
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
          {userRole === 'tutor'
            ? 'Connect platforms to manage classes and share session summaries'
            : 'Connect your learning platforms to sync progress automatically'}
        </p>
      </div>

      {statusMessage && (
        <div className={`${styles.statusMessage} ${styles[statusMessage.type]}`}>
          {statusMessage.text}
        </div>
      )}

      <div className={styles.integrationsList}>
        {integrations.map(integration => (
          <div key={integration.id} className={styles.integrationItem}>
            <div className={styles.integrationInfo}>
              <span className={styles.integrationIcon}>
                <integration.Icon size={24} />
              </span>
              <div className={styles.integrationDetails}>
                <h4 className={styles.integrationName}>
                  {integration.name}
                  {integration.externalEmail && (
                    <span className={styles.connectedEmail}> ({integration.externalEmail})</span>
                  )}
                </h4>
                <p className={styles.integrationDescription}>
                  {integration.needsReconnect
                    ? 'Reconnect to enable full access (new permissions required)'
                    : integration.description}
                </p>
              </div>
            </div>

            <div className={styles.integrationActions}>
              {integration.needsReconnect ? (
                <button
                  onClick={() => handleConnect(integration.id)}
                  disabled={isConnecting === integration.id}
                  className={`${styles.button} ${styles.buttonReconnect}`}
                >
                  {isConnecting === integration.id ? 'Connecting...' : 'Reconnect'}
                </button>
              ) : integration.connected ? (
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

      <div className={styles.infoBox}>
        <strong>Why connect?</strong>
        <p>
          {userRole === 'tutor'
            ? 'Linking your Google Classroom account lets you create classes for recurring students and auto-post session summaries after lessons.'
            : 'Linking your accounts allows tutors and guardians to track your progress across multiple platforms in one place.'}
        </p>
      </div>
    </div>
  );
}
