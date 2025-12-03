/**
 * Filename: apps/web/src/app/components/messages/AvailabilityWidget.tsx
 * Purpose: Chat availability widget for Messages Hub (v2 design)
 * Created: 2025-11-19
 * Updated: 2025-11-24 - Wired to useAblyPresenceBroadcast for real presence updates
 * Design: Toggle buttons for Online/Away/Offline status
 *
 * Features:
 * - Three-state toggle: Online, Away, Offline
 * - Real-time presence broadcasting via Ably
 * - Description text explaining availability management
 * - Teal header with v2 design
 * - NO ICONS (clean professional look)
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useAblyPresenceBroadcast } from '@/app/hooks/useAblyPresence';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AvailabilityWidget.module.css';

type AvailabilityStatus = 'online' | 'away' | 'offline';

interface AvailabilityWidgetProps {
  currentUserId: string;
}

export default function AvailabilityWidget({ currentUserId }: AvailabilityWidgetProps) {
  const [status, setStatus] = useState<AvailabilityStatus>('offline');

  // Broadcast presence when status is 'online' or 'away'
  useAblyPresenceBroadcast(currentUserId, status !== 'offline');

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Chat Availability</h3>

      <div className={styles.content}>
        {/* Toggle Button Group */}
        <div className={styles.toggleGroup}>
          <button
            onClick={() => setStatus('online')}
            className={`${styles.toggleButton} ${
              status === 'online' ? styles.toggleButtonActive : ''
            }`}
          >
            Online
          </button>
          <button
            onClick={() => setStatus('away')}
            className={`${styles.toggleButton} ${
              status === 'away' ? styles.toggleButtonActive : ''
            }`}
          >
            Away
          </button>
          <button
            onClick={() => setStatus('offline')}
            className={`${styles.toggleButton} ${
              status === 'offline' ? styles.toggleButtonActive : ''
            }`}
          >
            Offline
          </button>
        </div>

        {/* Description */}
        <p className={styles.description}>
          Manage your availability status for instant messaging responses.
        </p>
      </div>
    </HubComplexCard>
  );
}
