/**
 * Filename: AdminHelpWidget.tsx
 * Purpose: Generic admin help widget - reusable across all admin pages
 * Created: 2025-12-23
 * Design: Wraps HubComplexCard for admin-specific help text
 * Specification: Admin Dashboard Solution Design v2, Section 3.3
 *
 * Usage:
 * <AdminHelpWidget
 *   title="What are SEO Hubs?"
 *   content="Hub pages are topical authority pages that target broad keywords. Each hub should have 6-8 related spoke pages."
 * />
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AdminHelpWidget.module.css';

interface AdminHelpWidgetProps {
  title: string;
  content: string;
}

export default function AdminHelpWidget({ title, content }: AdminHelpWidgetProps) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>
        <p className={styles.text}>{content}</p>
      </div>
    </HubComplexCard>
  );
}
