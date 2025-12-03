/**
 * Filename: ClientStudentWidget.tsx
 * Purpose: My Students Hub Action Widget - Student Management
 * Created: 2025-11-18
 * Design: Uses HubComplexCard pattern (mirrors NetworkConnectionWidget)
 *
 * Button Layout:
 * 1. [Invite by Email] - Primary (Full Width)
 * 2. [Import Student] [Add] - Secondary (Split Row) - Coming soon
 * 3. [Create Group] - Secondary (Full Width)
 *
 * Note: Follows same pattern as Network widget for consistency
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './ClientStudentWidget.module.css';

interface ClientStudentWidgetProps {
  onInviteByEmail: () => void;
  onImportStudent?: () => void;  // Coming soon
  onAddStudent?: () => void;      // Coming soon
  onCreateGroup: () => void;
}

export default function ClientStudentWidget({
  onInviteByEmail,
  onImportStudent,
  onAddStudent,
  onCreateGroup,
}: ClientStudentWidgetProps) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Manage Students</h3>

      <p className={styles.description}>
        Add 13+ years old students to Tutorwise learning.
      </p>

      {/* Primary Action - Full Width */}
      <button
        onClick={onInviteByEmail}
        className={`${styles.button} ${styles.primary}`}
      >
        Invite by Email
      </button>

      {/* Secondary Actions - Split Row (Coming soon) */}
      <div className={styles.buttonRow}>
        <button
          onClick={onImportStudent}
          className={`${styles.button} ${styles.secondary} ${styles.disabled}`}
          disabled
          title="Coming soon"
        >
          Import Student
        </button>
        <button
          onClick={onAddStudent}
          className={`${styles.button} ${styles.secondary} ${styles.disabled}`}
          disabled
          title="Coming soon"
        >
          Add
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
