/**
 * Filename: apps/web/src/app/(authenticated)/my-students/page.tsx
 * Purpose: Redirect to new My Students location (Guardian Link v5.0)
 * Created: 2026-02-08
 *
 * DEPRECATED: This page has been moved to /account/students/my-students
 * This redirect ensures backward compatibility for bookmarks and external links.
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyStudentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new location
    router.replace('/account/students/my-students');
  }, [router]);

  return (
    <div style={{
      padding: '2rem',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h2>My Students has moved</h2>
      <p>Redirecting to the new location...</p>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
        If you are not redirected automatically, <a href="/account/students/my-students" style={{ color: '#667eea', textDecoration: 'underline' }}>click here</a>.
      </p>
    </div>
  );
}
