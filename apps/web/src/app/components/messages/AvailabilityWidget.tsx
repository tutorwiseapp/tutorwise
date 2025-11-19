/**
 * Filename: apps/web/src/app/components/messages/AvailabilityWidget.tsx
 * Purpose: Chat availability widget for Messages Hub (v2 design)
 * Created: 2025-11-19
 * Design: Toggle buttons for Online/Away/Offline status
 *
 * Features:
 * - Three-state toggle: Online, Away, Offline
 * - Description text explaining availability management
 * - Teal header with v2 design
 * - NO ICONS (clean professional look)
 */
'use client';

import React, { useState } from 'react';
import SidebarComplexWidget from '@/app/components/layout/sidebars/components/SidebarComplexWidget';
import styles from './AvailabilityWidget.module.css';

type AvailabilityStatus = 'online' | 'away' | 'offline';

export default function AvailabilityWidget() {
  const [status, setStatus] = useState<AvailabilityStatus>('offline');

  return (
    <SidebarComplexWidget>
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
    </SidebarComplexWidget>
  );
}
