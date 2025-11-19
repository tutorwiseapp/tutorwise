/*
 * Filename: src/app/components/listings/CreateListingWidget.tsx
 * Purpose: CTA widget for creating new listings in ContextualSidebar
 * Created: 2025-11-03
 * Updated: 2025-11-19 - Migrated to v2 design with SidebarActionWidget
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import SidebarActionWidget from '@/app/components/layout/sidebars/components/SidebarActionWidget';

export default function CreateListingWidget() {
  const router = useRouter();

  return (
    <SidebarActionWidget
      title="Manage Your Services"
      description="Create, edit, and manage all your tutoring service listings from one place."
      buttonText="Create New Listing"
      onButtonClick={() => router.push('/create-listing')}
    />
  );
}
