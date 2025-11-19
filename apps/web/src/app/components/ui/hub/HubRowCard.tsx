/**
 * Filename: HubRowCard.tsx
 * Purpose: Universal horizontal list item for all Hub pages
 * Created: 2025-11-18
 * Design: hub-row-card-ui-design-v1.md
 *
 * The Core Pattern:
 * - Golden Ratio Column: Fixed-width image/avatar on left (160px desktop, 120px tablet)
 * - 4-Row Rhythm: Header, Description, Metadata, Stats
 * - Action Dock: Bottom-anchored area for primary/secondary actions
 */

'use client';

import React from 'react';
import styles from './HubRowCard.module.css';

interface HubRowCardProps {
  // LEFT COLUMN
  image: {
    src: string | null;
    alt: string;
    fallbackChar?: string; // e.g. "JD" for avatars
    badge?: string;        // Overlay e.g. "Template"
    icon?: boolean;        // If true, renders standard icon placeholder
  };

  // RIGHT COLUMN - CONTENT
  title: string;
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  };
  description?: string;
  meta?: string[];         // Array of strings, auto-joined by bullets

  // RIGHT COLUMN - STATS / CONTEXT
  stats?: React.ReactNode; // Flexible slot for Text or Stats

  // BOTTOM DOCK
  actions?: React.ReactNode; // Slot for Buttons

  // INTERACTION
  href?: string;           // Optional whole-card link
}

export default function HubRowCard({
  image,
  title,
  status,
  description,
  meta,
  stats,
  actions,
  href,
}: HubRowCardProps) {
  const CardWrapper = href ? 'a' : 'div';

  const statusVariantClass = status?.variant ? styles[status.variant] : '';

  return (
    <CardWrapper
      className={styles.card}
      {...(href && { href })}
    >
      {/* LEFT COLUMN: Image/Avatar */}
      <div className={styles.imageColumn}>
        {image.src ? (
          <img src={image.src} alt={image.alt} className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder}>
            {image.fallbackChar || image.alt?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        {image.badge && (
          <span className={styles.imageBadge}>{image.badge}</span>
        )}
      </div>

      {/* RIGHT COLUMN: Content */}
      <div className={styles.contentColumn}>
        {/* Row 1: Header Group */}
        <div className={styles.headerRow}>
          <h3 className={styles.title}>{title}</h3>
          {status && (
            <span className={`${styles.statusBadge} ${statusVariantClass}`}>
              {status.label}
            </span>
          )}
        </div>

        {/* Row 2: Description */}
        {description && (
          <p className={styles.description}>{description}</p>
        )}

        {/* Row 3: Metadata (Bullet Separated) */}
        {meta && meta.length > 0 && (
          <div className={styles.metaRow}>
            {meta.map((item, index) => (
              <React.Fragment key={index}>
                <span className={styles.metaItem}>{item}</span>
                {index < meta.length - 1 && <span className={styles.bullet}>•</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Row 4: Stats / Context */}
        {stats && (
          <div className={styles.statsRow}>
            {stats}
          </div>
        )}

        {/* ACTION DOCK (Right Aligned) */}
        {actions && (
          <div className={styles.actionDock}>
            {actions}
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
