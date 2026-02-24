/**
 * Filename: ListingsHeader.tsx
 * Purpose: Header component for create listing pages
 * Created: 2026-01-19
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/actions/Button';
import styles from './ListingsHeader.module.css';

interface ListingsHeaderProps {
  title: string;
  subtitle?: string;
  showActions?: boolean;
}

export default function ListingsHeader({
  title,
  subtitle,
  showActions = false
}: ListingsHeaderProps) {
  const router = useRouter();

  const handleViewMyListings = () => {
    router.push('/listings');
  };

  return (
    <div className={styles.header}>
      <div className={styles.headerRow}>
        {/* Left: Title and Subtitle */}
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        {/* Right: Action Buttons (optional) */}
        {showActions && (
          <div className={styles.actionsSection}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleViewMyListings}
            >
              View My Listings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
