/**
 * Filename: HubRowCard.tsx
 * Purpose: Generic horizontal list card for all 9 Hubs
 * Path: /app/components/ui/hub-row-card/HubRowCard.tsx
 * Created: 2025-11-19
 *
 * Follows hub-row-card-ui-design-v1.md specification:
 * - 160px fixed image/avatar column (left)
 * - 4-row content structure (right): Title + Badge, Description, Metadata, Stats
 * - Action dock (bottom): ReactNode slot for buttons
 * - Individual links for avatar and title (NOT whole-card link)
 * - Zero business logic - pure presentation component
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import styles from './HubRowCard.module.css';

export interface HubRowCardProps {
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
  href?: string;           // Optional link for avatar and title
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
  // Render image content (either Next.js Image or fallback)
  const renderImageContent = () => {
    if (image.src) {
      return (
        <div className={styles.imageWrapper}>
          <Image
            src={image.src}
            alt={image.alt}
            width={160}
            height={160}
            className={styles.image}
          />
          {image.badge && (
            <div className={styles.imageBadge}>{image.badge}</div>
          )}
        </div>
      );
    }

    // Fallback: colored div with initials
    if (image.fallbackChar) {
      return (
        <div className={styles.imageFallback}>
          <span className={styles.fallbackChar}>{image.fallbackChar}</span>
          {image.badge && (
            <div className={styles.imageBadge}>{image.badge}</div>
          )}
        </div>
      );
    }

    // Icon placeholder (if specified)
    if (image.icon) {
      return (
        <div className={styles.imageIconPlaceholder}>
          {/* Icon placeholder - consumers can customize */}
        </div>
      );
    }

    // Default: empty placeholder
    return <div className={styles.imagePlaceholder}></div>;
  };

  // Render avatar/image column with optional link
  const imageContent = renderImageContent();
  const imageElement = href ? (
    <Link href={href} className={styles.imageLink}>
      {imageContent}
    </Link>
  ) : (
    imageContent
  );

  // Render title with optional link
  const titleElement = href ? (
    <Link href={href} className={styles.titleLink}>
      <h3 className={styles.title}>{title}</h3>
    </Link>
  ) : (
    <h3 className={styles.title}>{title}</h3>
  );

  // Get badge class based on variant
  const getBadgeClass = (variant: string) => {
    switch (variant) {
      case 'success':
        return styles.badgeSuccess;
      case 'warning':
        return styles.badgeWarning;
      case 'error':
        return styles.badgeError;
      case 'info':
        return styles.badgeInfo;
      case 'neutral':
      default:
        return styles.badgeNeutral;
    }
  };

  return (
    <div className={styles.card}>
      {/* Left Column: Image/Avatar (160px fixed) */}
      <div className={styles.imageColumn}>{imageElement}</div>

      {/* Right Column: Content (4-row structure) */}
      <div className={styles.content}>
        {/* Row 1: Header (Title + Badge) */}
        <div className={styles.headerRow}>
          {titleElement}
          {status && (
            <span className={`${styles.badge} ${getBadgeClass(status.variant)}`}>
              {status.label}
            </span>
          )}
        </div>

        {/* Row 2: Description */}
        {description && <p className={styles.description}>{description}</p>}

        {/* Row 3: Metadata (bullet-separated) */}
        {meta && meta.length > 0 && (
          <div className={styles.metadataRow}>
            {meta.map((item, index) => (
              <React.Fragment key={index}>
                <span>{item}</span>
                {index < meta.length - 1 && (
                  <span className={styles.bullet}>•</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Row 4: Stats / Context */}
        {stats && <div className={styles.statsRow}>{stats}</div>}

        {/* Action Dock */}
        {actions && <div className={styles.actionDock}>{actions}</div>}
      </div>
    </div>
  );
}
