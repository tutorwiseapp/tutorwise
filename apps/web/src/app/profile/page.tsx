/**
 * Filename: apps/web/src/app/profile/page.tsx
 * Purpose: DEPRECATED - Redirects to /account/personal-info
 * Created: Legacy route (pre-v4.8)
 * Deprecated: 2025-11-12 (v4.8+ Account Hub consolidation)
 *
 * This route is deprecated in favor of the Account Hub at /account/personal-info.
 * All profile editing functionality has been consolidated under /account/*.
 *
 * Route structure:
 * - /profile → /account/personal-info (this redirect)
 * - /profile/[id] → /public-profile/[id]/[slug] (public viewing)
 * - /account/personal-info → Edit personal info
 * - /account/professional → Edit professional info
 * - /account/settings → Account settings
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to account personal-info page
    router.replace('/account/personal-info');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#6b7280' }}>Redirecting to Account Settings...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
