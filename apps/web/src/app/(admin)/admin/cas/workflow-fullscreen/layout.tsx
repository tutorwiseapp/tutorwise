/*
 * Filename: src/app/(admin)/admin/cas/workflow-fullscreen/layout.tsx
 * Purpose: Fullscreen layout without AdminLayout wrapper
 * Created: 2026-02-27
 */
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface FullscreenLayoutProps {
  children: ReactNode;
}

/**
 * Fullscreen Layout
 *
 * This layout provides authentication checking without the AdminLayout wrapper
 * This allows the workflow visualizer to be truly fullscreen
 */
export default function FullscreenLayout({ children }: FullscreenLayoutProps) {
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
        gap: '1rem',
        background: '#f9fafb'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading workflow visualizer...</p>
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

  // Render children without AdminLayout wrapper (true fullscreen)
  return <>{children}</>;
}
