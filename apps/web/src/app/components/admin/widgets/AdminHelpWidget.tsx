/**
 * Filename: AdminHelpWidget.tsx
 * Purpose: Generic admin help widget - reusable across all admin pages
 * Created: 2025-12-23
 * Design: Wraps HubComplexCard for admin-specific help text
 * Specification: Admin Dashboard Solution Design v2, Section 3.3
 *
 * Usage:
 * <AdminHelpWidget
 *   title="SEO Strategy Help"
 *   items={[
 *     { question: 'What are SEO Hubs?', answer: 'Hub pages are topical authority pages...' },
 *     { question: 'How many spokes?', answer: 'Create 6-8 spokes per hub for optimal authority.' },
 *   ]}
 * />
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AdminHelpWidget.module.css';

interface HelpItem {
  question: string;
  answer: string;
}

interface AdminHelpWidgetProps {
  title: string;
  items: HelpItem[];
}

export default function AdminHelpWidget({ title, items }: AdminHelpWidgetProps) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>
        {items.map((item, index) => (
          <div key={index} className={styles.item}>
            <div className={styles.question}>{item.question}</div>
            <div className={styles.answer}>{item.answer}</div>
          </div>
        ))}
      </div>
    </HubComplexCard>
  );
}
