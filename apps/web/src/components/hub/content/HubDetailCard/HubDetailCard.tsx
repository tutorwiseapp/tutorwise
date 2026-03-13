/**
 * Filename: HubDetailCard.tsx
 * Purpose: Detail-specific card component for detail pages (extends HubRowCard visual language)
 * Path: /app/components/hub/content/HubDetailCard/HubDetailCard.tsx
 * Created: 2025-12-05
 *
 * Design:
 * - 160px fixed avatar/image column (left) - same as HubRowCard
 * - Title + Status Badge (top)
 * - Description line (e.g., date/time summary)
 * - Expandable details grid (2-column responsive layout)
 * - Action dock (bottom)
 * - Optional edit mode for inline field editing
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import styles from './HubDetailCard.module.css';

export interface DetailField {
  label: string;
  value: string | React.ReactNode;
  fullWidth?: boolean; // Span 2 columns
}

export interface HubDetailCardProps {
  // LEFT COLUMN - Avatar/Image
  image: {
    src: string | null;
    alt: string;
    fallbackChar?: string; // e.g. "JD" for avatars
  };

  // RIGHT COLUMN - Header
  title: string | React.ReactNode; // Can be string or React node (e.g., input field for editing)
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  };
  description?: string | React.ReactNode; // Summary line (can be string or React nodes for multi-line)

  // RIGHT COLUMN - Details Grid
  details: DetailField[]; // Array of label-value pairs for 2-column grid

  // BOTTOM DOCK
  actions?: React.ReactNode; // Slot for action buttons

  // INTERACTION
  imageHref?: string; // Optional link for avatar/image (e.g., user profile)
  titleHref?: string; // Optional link for title (e.g., listing details)
}

export default function HubDetailCard({
  image,
  title,
  status,
  description,
  details,
  actions,
  imageHref,
  titleHref,
}: HubDetailCardProps) {
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
        </div>
      );
    }

    // Fallback: colored div with initials
    if (image.fallbackChar) {
      return (
        <div className={styles.imageFallback}>
          <span className={styles.fallbackChar}>{image.fallbackChar}</span>
        </div>
      );
    }

    // Default: empty placeholder
    return <div className={styles.imagePlaceholder}></div>;
  };

  // Render avatar/image column with optional link
  const imageContent = renderImageContent();
  const imageElement = imageHref ? (
    <Link href={imageHref} className={styles.imageLink}>
      {imageContent}
    </Link>
  ) : (
    imageContent
  );

  // Render title with optional link
  const titleElement = titleHref ? (
    <Link href={titleHref} className={styles.titleLink}>
      {typeof title === 'string' ? <h3 className={styles.title}>{title}</h3> : title}
    </Link>
  ) : typeof title === 'string' ? (
    <h3 className={styles.title}>{title}</h3>
  ) : (
    title
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

      {/* Right Column: Content */}
      <div className={styles.content}>
        {/* Header: Title + Badge */}
        <div className={styles.headerRow}>
          {titleElement}
          {status && (
            <span className={`${styles.badge} ${getBadgeClass(status.variant)}`}>
              {status.label}
            </span>
          )}
        </div>

        {/* Description */}
        {description && <p className={styles.description}>{description}</p>}

        {/* Details Grid (2-column responsive) */}
        {details.length > 0 && (
          <div className={styles.detailsGrid}>
            {details.map((field, index) => (
              <div
                key={index}
                className={`${styles.detailRow} ${field.fullWidth ? styles.detailRowFull : ''}`}
              >
                <span className={styles.detailLabel}>{field.label}</span>
                <span className={styles.detailValue}>{field.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Dock */}
        {actions && <div className={styles.actionDock}>{actions}</div>}
      </div>
    </div>
  );
}
