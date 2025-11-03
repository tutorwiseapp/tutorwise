/*
 * Filename: src/app/(authenticated)/messages/page.tsx
 * Purpose: Messages hub page - placeholder for future messaging feature
 * Created: 2025-11-03
 * Specification: Hub page following SDD v3.6 design patterns
 */
'use client';

import React from 'react';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import styles from './page.module.css';

export default function MessagesPage() {
  return (
    <>
      {/* Main Content */}
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Messages</h1>
          <p className={styles.subtitle}>
            Communicate with tutors, clients, and agents
          </p>
        </div>

        {/* Placeholder Content */}
        <div className={styles.placeholderContent}>
          <div className={styles.placeholderIcon}>💬</div>
          <h2 className={styles.placeholderTitle}>Messages Coming Soon</h2>
          <p className={styles.placeholderText}>
            This feature is currently under development. You&apos;ll soon be able to send and receive messages,
            coordinate sessions, and communicate with your network all in one place.
          </p>
        </div>
      </div>

      {/* Contextual Sidebar (Right Column) */}
      <ContextualSidebar>
        <div className={styles.sidebarPlaceholder}>
          <p className={styles.sidebarText}>Message notifications and quick actions will appear here.</p>
        </div>
      </ContextualSidebar>
    </>
  );
}
