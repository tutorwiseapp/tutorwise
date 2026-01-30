/*
 * Filename: src/app/(admin)/admin/layout.tsx
 * Purpose: Admin route group layout wrapper with authentication
 * Created: 2025-12-23
 * Updated: 2026-01-30 - Added authentication and admin role check
 * Specification: Admin Dashboard Solution Design v2, Section 3.2
 */
'use client';

import { ReactNode, Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import AdminLayout from '@/app/components/admin/layout/AdminLayout';

interface AdminRouteLayoutProps {
  children: ReactNode;
}

/**
 * Admin Route Group Layout
 *
 * This layout wraps all /admin/* pages with AdminLayout (provides AdminSidebar + content area)
 * It's applied automatically to all routes under /admin/*
 *
 * Security: This layout enforces authentication AND admin role verification.
 * Only users with is_admin=true can access admin pages.
 *
 * Suspense boundary is required for useSearchParams() and other dynamic features
 */
export default function AdminRouteLayout({ children }: AdminRouteLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const supabase = createClient();

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not authenticated - redirect to login
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }

      // Check if user has admin privileges
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        // Authenticated but not admin - redirect to dashboard
        router.push('/dashboard');
        return;
      }

      // User is authenticated and is an admin
      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAdminAccess();
  }, [router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#006c67',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#6b7280' }}>Verifying admin access...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Don't render anything if not authorized (will redirect)
  if (!isAuthorized) {
    return null;
  }

  return (
    <AdminLayout>
      <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
    </AdminLayout>
  );
}
