/**
 * Filename: AITutorHelpWidget.tsx
 * Purpose: AI Tutor Help Widget - explains how AI tutors work
 * Created: 2026-02-23
 * Pattern: Uses HubComplexCard (matches BookingHelpWidget)
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AITutorHelpWidget.module.css';

export default function AITutorHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How AI Tutors Work</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Create AI tutors trained on your own teaching materials.
        </p>
        <p className={styles.text}>
          Upload PDFs, DOCX, or PPTX files to customize responses.
        </p>
        <p className={styles.text}>
          Add URL links for additional reference materials.
        </p>
        <p className={styles.text}>
          Students can chat with your AI tutor 24/7 at your set hourly rate.
        </p>
      </div>
    </HubComplexCard>
  );
}
