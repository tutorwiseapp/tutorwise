/*
 * Filename: MarketplaceCard.tsx
 * Purpose: Shell component for marketplace cards (Airbnb-inspired design)
 * Pattern: Similar to HubDetailRow - provides consistent structure for all marketplace items
 *
 * Used by:
 * - TutorProfileCard
 * - MarketplaceListingCard
 * - MarketplaceOrganisationCard
 *
 * Design Pattern:
 * - Image-first card with 1:1 aspect ratio
 * - Overlay badges (top-left, top-right)
 * - 4-line info section (name/rating, subjects/level, location/mode, price/action)
 * - Save functionality with heart icon
 * - Consistent hover effects and shadows
 *
 * Props:
 * - href: Link destination
 * - imageUrl: Image source (or null for fallback)
 * - imageFallback: React node to show when no image
 * - badges: Array of badge elements for overlay
 * - onSave: Save handler function
 * - isSaved: Whether item is saved
 * - isLoading: Loading state for save button
 * - children: Content section (4 lines)
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './MarketplaceCard.module.css';

interface MarketplaceCardProps {
  href: string;
  imageUrl?: string | null;
  imageFallback?: ReactNode;
  badges?: ReactNode[];
  onSave?: (e: React.MouseEvent) => void;
  isSaved?: boolean;
  isLoading?: boolean;
  children: ReactNode;
}

export default function MarketplaceCard({
  href,
  imageUrl,
  imageFallback,
  badges = [],
  onSave,
  isSaved = false,
  isLoading = false,
  children,
}: MarketplaceCardProps) {
  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Prevent navigation if clicking on interactive elements (buttons or nested links)
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    const link = target.closest('a[href]');

    // Only prevent if the interactive element is not the card itself
    if ((button || (link && link !== e.currentTarget))) {
      e.preventDefault();
    }
  };

  return (
    <Link href={href} className={styles.tutorCard} onClick={handleCardClick}>
      {/* Image Section */}
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            className={styles.image}
            fill
            style={{ objectFit: 'cover' }}
          />
        ) : (
          imageFallback || (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f3f4f6',
                color: '#9ca3af',
              }}
            />
          )
        )}

        {/* Badges Overlay */}
        {badges.map((badge, index) => (
          <div key={index}>{badge}</div>
        ))}

        {/* Save Button */}
        {onSave && (
          <button
            className={styles.saveButton}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSave(e);
            }}
            aria-label={isSaved ? 'Remove from My Saves' : 'Save to My Saves'}
            disabled={isLoading}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={isSaved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}
      </div>

      {/* Content Section - Passed as children */}
      <div className={styles.content}>{children}</div>
    </Link>
  );
}

/* Helper Components for consistent card content structure */

interface CardRowProps {
  children: ReactNode;
}

export function CardRow({ children }: CardRowProps) {
  return <div className={styles.row}>{children}</div>;
}

interface CardNameProps {
  children: ReactNode;
}

export function CardName({ children }: CardNameProps) {
  return <h3 className={styles.name}>{children}</h3>;
}

interface CardRatingProps {
  value: number;
}

export function CardRating({ value }: CardRatingProps) {
  return (
    <div className={styles.rating}>
      <svg
        className={styles.starIcon}
        width="12"
        height="12"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className={styles.ratingValue}>{value.toFixed(1)}</span>
    </div>
  );
}

interface CardSubjectProps {
  children: ReactNode;
}

export function CardSubject({ children }: CardSubjectProps) {
  return <div className={styles.subject}>{children}</div>;
}

interface CardLevelProps {
  children: ReactNode;
}

export function CardLevel({ children }: CardLevelProps) {
  return <div className={styles.level}>{children}</div>;
}

interface CardLocationProps {
  children: ReactNode;
}

export function CardLocation({ children }: CardLocationProps) {
  return <div className={styles.location}>{children}</div>;
}

interface CardDeliveryModeProps {
  children: ReactNode;
}

export function CardDeliveryMode({ children }: CardDeliveryModeProps) {
  return <div className={styles.deliveryMode}>{children}</div>;
}

interface CardPriceProps {
  children: ReactNode;
}

export function CardPrice({ children }: CardPriceProps) {
  return <div className={styles.price}>{children}</div>;
}

interface CardBookLinkProps {
  href: string;
  children: ReactNode;
}

export function CardBookLink({ href, children }: CardBookLinkProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={styles.bookLink}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        router.push(href);
      }}
    >
      {children}
    </button>
  );
}

/* Helper Components for Badges */

interface TrustBadgeProps {
  label: string;
  color: string;
}

export function TrustBadge({ label, color }: TrustBadgeProps) {
  return (
    <div
      className={styles.freeHelpBadge}
      style={{ backgroundColor: color }}
    >
      {label}
    </div>
  );
}

export function FreeHelpBadge() {
  return (
    <div className={styles.freeHelpBadge}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      Free Help Now
    </div>
  );
}

export function TrialBadge() {
  return <div className={styles.trialBadge}>Free Trial</div>;
}

interface VerificationBadgesProps {
  identityVerified?: boolean;
  dbsVerified?: boolean;
}

export function VerificationBadges({ identityVerified, dbsVerified }: VerificationBadgesProps) {
  if (!identityVerified && !dbsVerified) return null;

  return (
    <div className={styles.verificationBadge}>
      {identityVerified && (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={styles.verificationIcon}
          aria-label="Government ID Verified"
        >
          <title>Government ID Verified</title>
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )}
      {dbsVerified && (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={styles.verificationIcon}
          aria-label="DBS Checked"
        >
          <title>DBS Checked</title>
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </div>
  );
}
