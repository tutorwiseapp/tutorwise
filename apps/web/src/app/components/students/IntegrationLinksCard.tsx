/**
 * IntegrationLinksCard.tsx
 * Integration management card for student accounts (v5.0)
 * Shows available integrations like Google Classroom with Connect/Disconnect buttons
 * Visible only to users with 'student' role
 */
'use client';

import React, { useState } from 'react';
import styles from './IntegrationLinksCard.module.css';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
}

export default function IntegrationLinksCard() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-classroom',
      name: 'Google Classroom',
      description: 'Sync your classes and assignments automatically',
      icon: '📚',
      connected: false,
    },
  ]);

  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const handleConnect = async (integrationId: string) => {
    setIsConnecting(integrationId);

    // TODO: Implement OAuth flow for Google Classroom
    // For now, simulate connection with a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, connected: true }
          : integration
      )
    );

    setIsConnecting(null);
  };

  const handleDisconnect = async (integrationId: string) => {
    setIsConnecting(integrationId);

    // TODO: Implement disconnection logic
    await new Promise(resolve => setTimeout(resolve, 500));

    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, connected: false }
          : integration
      )
    );

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
