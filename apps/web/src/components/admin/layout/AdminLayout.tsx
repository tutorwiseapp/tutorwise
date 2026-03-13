/*
 * Filename: src/app/components/admin/layout/AdminLayout.tsx
 * Purpose: Top-level wrapper for all admin pages (provides AdminSidebar + content area)
 * Created: 2025-12-23
 * Specification: Admin Dashboard Solution Design v2, Section 3.2
 */
'use client';

import React, { ReactNode } from 'react';
import AdminSidebar from '../sidebar/AdminSidebar';
import styles from './AdminLayout.module.css';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * AdminLayout - Top-level wrapper for all admin pages
 *
 * This component provides:
 * - AdminSidebar (left navigation)
 * - Content area (for HubPageLayout or other content)
 *
 * Usage:
 * <AdminLayout>
 *   <HubPageLayout header={...} tabs={...} sidebar={...}>
 *     {content}
 *   </HubPageLayout>
 * </AdminLayout>
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className={styles.adminContainer}>
      <AdminSidebar />
      <div className={styles.adminContent}>
        {children}
      </div>
    </div>
  );
}
