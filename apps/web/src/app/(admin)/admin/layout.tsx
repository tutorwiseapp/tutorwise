/*
 * Filename: src/app/(admin)/admin/layout.tsx
 * Purpose: Admin route group layout wrapper
 * Created: 2025-12-23
 * Specification: Admin Dashboard Solution Design v2, Section 3.2
 */
'use client';

import React, { ReactNode } from 'react';
import AdminLayout from '@/app/components/admin/layout/AdminLayout';

interface AdminRouteLayoutProps {
  children: ReactNode;
}

/**
 * Admin Route Group Layout
 *
 * This layout wraps all /admin/* pages with AdminLayout (provides AdminSidebar + content area)
 * It's applied automatically to all routes under /admin/*
 */
export default function AdminRouteLayout({ children }: AdminRouteLayoutProps) {
  return <AdminLayout>{children}</AdminLayout>;
}
