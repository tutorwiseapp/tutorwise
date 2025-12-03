/**
 * Filename: apps/web/src/app/components/feature/network/NetworkConnectionWidget.tsx
 * Purpose: Complex Action Card for Network Hub - 4-Button Layout
 * Created: 2025-11-18
 * Design: context-sidebar-ui-design-v2.md Section 2.4
 *
 * Pattern: Complex Action Card with Split Hierarchy
 * Button Layout:
 * 1. [Add Connection] - Primary (Full Width)
 * 2. [Find People] [Invite by Email] - Secondary (Split Row)
 * 3. [Create Group] - Secondary (Full Width)
 *
 * NO ICONS - Professional aesthetic
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './NetworkConnectionWidget.module.css';

interface NetworkConnectionWidgetProps {
  onAddConnection: () => void;
  onFindPeople: () => void;
  onInviteByEmail: () => void;
  onCreateGroup: () => void;
}

export default function NetworkConnectionWidget({
  onAddConnection,
  onFindPeople,
  onInviteByEmail,
  onCreateGroup,
}: NetworkConnectionWidgetProps) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Grow Your Network</h3>

      <p className={styles.description}>
        Manage your professional circle on Tutorwise.
      </p>

      {/* Primary Action - Full Width */}
      <button
        onClick={onAddConnection}
        className={`${styles.button} ${styles.primary}`}
      >
        Add Connection
      </button>

      {/* Secondary Actions - Split Row */}
      <div className={styles.buttonRow}>
        <button
          onClick={onFindPeople}
          className={`${styles.button} ${styles.secondary}`}
        >
          Find People
        </button>
        <button
          onClick={onInviteByEmail}
          className={`${styles.button} ${styles.secondary}`}
        >
          Invite by Email
        </button>
      </div>

      {/* Secondary Action - Full Width */}
      <button
        onClick={onCreateGroup}
        className={`${styles.button} ${styles.secondary}`}
      >
        Create Group
      </button>
    </HubComplexCard>
  );
}
