/**
 * Filename: AgencyTutorWidget.tsx
 * Purpose: Organisation Hub Action Widget - Tutor/Agent Management
 * Created: 2025-11-18
 * Design: Uses SidebarComplexWidget pattern (mirrors NetworkConnectionWidget)
 *
 * Button Layout:
 * 1. [Add Connection] - Primary (Full Width) - can add tutor or agent
 * 2. [Find Tutor] [Invite by Email] - Secondary (Split Row)
 * 3. [Create Group] - Secondary (Full Width)
 *
 * Note: Reuses Network modal for consistency
 */

'use client';

import React from 'react';
import SidebarComplexWidget from '../layout/sidebars/components/SidebarComplexWidget';
import styles from './AgencyTutorWidget.module.css';

interface AgencyTutorWidgetProps {
  onAddConnection: () => void;
  onFindTutor: () => void;
  onInviteByEmail: () => void;
  onCreateGroup: () => void;
}

export default function AgencyTutorWidget({
  onAddConnection,
  onFindTutor,
  onInviteByEmail,
  onCreateGroup,
}: AgencyTutorWidgetProps) {
  return (
    <SidebarComplexWidget>
      <h3 className={styles.title}>Manage Your Team</h3>

      <p className={styles.description}>
        Build and organize your tutoring organisation.
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
          onClick={onFindTutor}
          className={`${styles.button} ${styles.secondary}`}
        >
          Find Tutor
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
    </SidebarComplexWidget>
  );
}
