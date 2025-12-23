/**
 * Filename: AdminTipWidget.tsx
 * Purpose: Generic admin tip widget - reusable across all admin pages
 * Created: 2025-12-23
 * Design: Wraps HubComplexCard for admin-specific tips and best practices
 * Specification: Admin Dashboard Solution Design v2, Section 3.3
 *
 * Usage:
 * <AdminTipWidget
 *   title="Best Practices"
 *   tips={[
 *     'Create 6-8 spokes per hub for optimal authority',
 *     'Include FAQ sections with answer capsules',
 *     'Target 120-150 character answer capsules for AI citations',
 *   ]}
 * />
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AdminTipWidget.module.css';

interface AdminTipWidgetProps {
  title: string;
  tips: string[];
}

export default function AdminTipWidget({ title, tips }: AdminTipWidgetProps) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>
        <ul className={styles.tipList}>
          {tips.map((tip, index) => (
            <li key={index} className={styles.tipItem}>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </HubComplexCard>
  );
}
