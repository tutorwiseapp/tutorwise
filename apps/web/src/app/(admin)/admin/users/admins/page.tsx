/*
 * Filename: src/app/(admin)/admin/users/admins/page.tsx
 * Purpose: Redirect to new location /admin/accounts/admins
 * Created: 2025-12-28
 */
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AdminsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString();
    router.replace(`/admin/accounts/admins${params ? `?${params}` : ''}`);
  }, [router, searchParams]);

  return null;
}
