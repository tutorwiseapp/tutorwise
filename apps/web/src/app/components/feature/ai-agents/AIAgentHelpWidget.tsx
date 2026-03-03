/**
 * Filename: AIAgentHelpWidget.tsx
 * Purpose: AI Tutor Help Widget - explains how AI agents work
 * Created: 2026-02-23
 * Pattern: Uses HubComplexCard (matches BookingHelpWidget)
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './AIAgentHelpWidget.module.css';

export default function AIAgentHelpWidget() {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>How AI Agents Work</h3>
      <div className={styles.content}>
        <p className={styles.text}>
          Create AI agents trained on your own teaching materials.
        </p>
        <p className={styles.text}>
          After creating your AI agent, you can upload materials (PDF/DOCX/PPTX) and add URL links in the detail page to customize responses.
        </p>
        <p className={styles.text}>
          Students can chat with your AI agent 24/7 at your set hourly rate.
        </p>
      </div>
    </HubComplexCard>
  );
}
