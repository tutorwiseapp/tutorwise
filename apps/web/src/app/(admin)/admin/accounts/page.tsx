/*
 * Filename: src/app/(admin)/admin/accounts/page.tsx
 * Purpose: Redirect to Users page (default sub-page under Accounts)
 * Created: 2025-12-28
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AccountsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/accounts/users');
  }, [router]);

  return null;
}
