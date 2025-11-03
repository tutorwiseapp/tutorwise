/*
 * Filename: src/app/components/listings/CreateListingWidget.tsx
 * Purpose: CTA widget for creating new listings in ContextualSidebar
 * Created: 2025-11-03
 * Specification: SDD v3.6 - ContextualSidebar widget
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import styles from './CreateListingWidget.module.css';

export default function CreateListingWidget() {
  const router = useRouter();

  return (
    <div className={styles.widget}>
      <h4 className={styles.title}>Manage Your Services</h4>
      <p className={styles.description}>
        Create, edit, and manage all your tutoring service listings from one place.
      </p>
      <Button
        variant="primary"
        size="md"
        fullWidth
        onClick={() => router.push('/create-listing')}
      >
        Create New Listing
      </Button>
    </div>
  );
}
