/*
 * Filename: src/app/components/feature/listings/CreateListingWidget.tsx
 * Purpose: CTA widget for creating new listings in HubSidebar
 * Created: 2025-11-03
 * Updated: 2025-11-19 - Migrated to v2 design with HubActionCard
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import HubActionCard from '@/app/components/hub/sidebar/cards/HubActionCard';

export default function CreateListingWidget() {
  const router = useRouter();

  return (
    <HubActionCard
      title="Manage Your Services"
      description="Create, edit, and manage all your tutoring service listings from one place."
      buttonText="Create New Listing"
      onButtonClick={() => router.push('/create-listing')}
    />
  );
}
