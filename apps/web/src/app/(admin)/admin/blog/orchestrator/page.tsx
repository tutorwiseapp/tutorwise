/**
 * Filename: src/app/(admin)/admin/blog/orchestrator/page.tsx
 * Status: DEPRECATED - Redirects to /admin/signal
 * Created: 2026-01-16
 * Deprecated: 2026-01-18
 * Reason: Revenue Signal is platform-level intelligence, not blog-specific
 *
 * This page provides a permanent redirect for backward compatibility.
 * All functionality has been moved to /admin/signal
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function OrchestratorRedirect() {
  const router = useRouter();

  useEffect(() => {
    console.warn('[DEPRECATED] /admin/blog/orchestrator has moved to /admin/signal');
    router.replace('/admin/signal');
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting to Revenue Signal Analytics...</p>
      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '1rem' }}>
        This page has moved to <a href="/admin/signal">/admin/signal</a>
      </p>
    </div>
  );
}
