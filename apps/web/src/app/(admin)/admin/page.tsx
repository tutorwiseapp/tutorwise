/*
 * Filename: src/app/(admin)/admin/page.tsx
 * Purpose: Redirect /admin to /admin/operations (default admin landing page)
 */
import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/operations');
}
