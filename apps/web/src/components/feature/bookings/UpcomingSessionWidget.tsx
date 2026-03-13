/**
 * Filename: apps/web/src/app/components/feature/bookings/UpcomingSessionWidget.tsx
 * Purpose: Display next upcoming session in sidebar
 * Created: 2025-12-04 (Moved from HubSidebar.tsx - Priority 2: Architecture cleanup)
 * Architecture: Feature-specific widget (Tier 3) - belongs in feature/bookings
 */

'use client';

import React from 'react';
import styles from './UpcomingSessionWidget.module.css';

interface UpcomingSessionWidgetProps {
  date: string;
  time: string;
  service: string;
  participant: string;
}

export default function UpcomingSessionWidget({
  date,
  time,
  service,
  participant
}: UpcomingSessionWidgetProps) {
  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>Next Session</h3>
      <div className={styles.widgetContent}>
        <div className={styles.sessionCard}>
          <div className={styles.sessionDate}>
            <span>{date}</span>
          </div>
          <div className={styles.sessionTime}>
            <span>{time}</span>
          </div>
          <div className={styles.sessionService}>{service}</div>
          <div className={styles.sessionParticipant}>{participant}</div>
        </div>
      </div>
    </div>
  );
}
