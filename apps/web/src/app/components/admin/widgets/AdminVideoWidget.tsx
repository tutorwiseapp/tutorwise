/**
 * Filename: AdminVideoWidget.tsx
 * Purpose: Generic admin video widget - reusable across all admin pages
 * Created: 2025-12-23
 * Design: Wraps HubComplexCard for admin-specific video tutorials
 * Specification: Admin Dashboard Solution Design v2, Section 3.3
 *
 * Usage:
 * <AdminVideoWidget
 *   title="Tutorial"
 *   videoTitle="How to create an SEO Hub"
 *   videoDuration="3:45"
 *   videoUrl="/tutorials/create-seo-hub"
 * />
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AdminVideoWidget.module.css';

interface AdminVideoWidgetProps {
  title: string;
  videoTitle: string;
  videoDuration?: string;
  videoUrl?: string;
}

export default function AdminVideoWidget({
  title,
  videoTitle,
  videoDuration,
  videoUrl,
}: AdminVideoWidgetProps) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>
        <div className={styles.videoInfo}>
          <p className={styles.videoTitle}>{videoTitle}</p>
          {videoDuration && (
            <p className={styles.videoDuration}>Duration: {videoDuration}</p>
          )}
        </div>
        {videoUrl ? (
          <a href={videoUrl} className={styles.videoLink} target="_blank" rel="noopener noreferrer">
            Watch Tutorial
          </a>
        ) : (
          <p className={styles.placeholder}>[Video content coming soon]</p>
        )}
      </div>
    </HubComplexCard>
  );
}
