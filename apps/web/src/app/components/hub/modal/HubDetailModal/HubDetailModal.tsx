/**
 * Filename: HubDetailModal.tsx
 * Purpose: Generic modal component for displaying detailed entity information
 * Created: 2025-12-06
 * Pattern: Reusable modal shell for all hub detail views
 *
 * Usage:
 * <HubDetailModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Booking Details"
 *   sections={[
 *     {
 *       title: "Session Information",
 *       fields: [
 *         { label: "Date", value: "Thu, 13 Nov 2025" },
 *         { label: "Time", value: "11:48" }
 *       ]
 *     }
 *   ]}
 *   actions={<Button>Close</Button>}
 * />
 */

'use client';

import React, { ReactNode } from 'react';
import styles from './HubDetailModal.module.css';

export interface DetailField {
  label: string;
  value: string | React.ReactNode;
}

export interface DetailSection {
  title: string;
  fields: DetailField[];
}

export interface HubDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  sections: DetailSection[];
  actions?: ReactNode;
}

export default function HubDetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  sections,
  actions,
}: HubDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Content - Sections */}
        <div className={styles.content}>
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className={styles.section}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
              <div className={styles.fieldsGrid}>
                {section.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex} className={styles.field}>
                    <span className={styles.fieldLabel}>{field.label}</span>
                    <span className={styles.fieldValue}>{field.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {actions && (
          <div className={styles.actions}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
