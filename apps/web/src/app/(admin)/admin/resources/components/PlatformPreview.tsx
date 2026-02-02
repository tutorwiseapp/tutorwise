/**
 * Filename: apps/web/src/app/(admin)/admin/resources/components/PlatformPreview.tsx
 * Purpose: Live preview component showing how article content appears on social platforms
 * Created: 2026-02-02
 *
 * Shows mockups for:
 * - LinkedIn post preview
 * - Facebook post preview
 * - Instagram post preview
 */
'use client';

import React, { useState, useMemo } from 'react';
import styles from './PlatformPreview.module.css';

interface PlatformPreviewProps {
  title: string;
  description: string;
  imageUrl?: string;
  imageColor?: string;
  platforms: string[];
}

type Platform = 'linkedin' | 'facebook' | 'instagram';

const PLATFORM_LIMITS = {
  linkedin: { title: 150, description: 300 },
  facebook: { title: 250, description: 500 },
  instagram: { title: 100, description: 2200 },
};

export default function PlatformPreview({
  title,
  description,
  imageUrl,
  imageColor = '#006c67',
  platforms,
}: PlatformPreviewProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>('linkedin');

  const truncate = (text: string, limit: number): string => {
    if (text.length <= limit) return text;
    return text.substring(0, limit - 3) + '...';
  };

  const previewData = useMemo(() => {
    const limits = PLATFORM_LIMITS[activePlatform];
    return {
      title: truncate(title || 'Article Title', limits.title),
      description: truncate(description || 'Article description will appear here...', limits.description),
    };
  }, [title, description, activePlatform]);

  const platformTabs = [
    { id: 'linkedin' as Platform, name: 'LinkedIn', icon: '💼' },
    { id: 'facebook' as Platform, name: 'Facebook', icon: '📘' },
    { id: 'instagram' as Platform, name: 'Instagram', icon: '📸' },
  ].filter((p) => platforms.length === 0 || platforms.includes(p.id) || platforms.includes('all'));

  if (platformTabs.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          Select platforms to see preview
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Platform Preview</h4>
        <div className={styles.tabs}>
          {platformTabs.map((platform) => (
            <button
              key={platform.id}
              type="button"
              className={`${styles.tab} ${activePlatform === platform.id ? styles.activeTab : ''}`}
              onClick={() => setActivePlatform(platform.id)}
            >
              <span className={styles.tabIcon}>{platform.icon}</span>
              {platform.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.previewArea}>
        {activePlatform === 'linkedin' && (
          <LinkedInPreview
            title={previewData.title}
            description={previewData.description}
            imageUrl={imageUrl}
            imageColor={imageColor}
          />
        )}
        {activePlatform === 'facebook' && (
          <FacebookPreview
            title={previewData.title}
            description={previewData.description}
            imageUrl={imageUrl}
            imageColor={imageColor}
          />
        )}
        {activePlatform === 'instagram' && (
          <InstagramPreview
            title={previewData.title}
            description={previewData.description}
            imageUrl={imageUrl}
            imageColor={imageColor}
          />
        )}
      </div>

      <div className={styles.charCount}>
        Title: {title.length}/{PLATFORM_LIMITS[activePlatform].title} |
        Description: {description.length}/{PLATFORM_LIMITS[activePlatform].description}
      </div>
    </div>
  );
}

// LinkedIn Preview Component
function LinkedInPreview({
  title,
  description,
  imageUrl,
  imageColor,
}: {
  title: string;
  description: string;
  imageUrl?: string;
  imageColor: string;
}) {
  return (
    <div className={styles.linkedinPreview}>
      <div className={styles.linkedinHeader}>
        <div className={styles.linkedinAvatar}>TW</div>
        <div className={styles.linkedinMeta}>
          <span className={styles.linkedinName}>Tutorwise</span>
          <span className={styles.linkedinFollowers}>1,234 followers</span>
          <span className={styles.linkedinTime}>Just now</span>
        </div>
      </div>
      <div className={styles.linkedinContent}>
        <p className={styles.linkedinText}>{description}</p>
      </div>
      <div className={styles.linkedinCard}>
        <div
          className={styles.linkedinImage}
          style={{
            backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
            backgroundColor: imageUrl ? undefined : imageColor,
          }}
        >
          {!imageUrl && <span className={styles.imagePlaceholder}>Featured Image</span>}
        </div>
        <div className={styles.linkedinCardContent}>
          <h4 className={styles.linkedinCardTitle}>{title}</h4>
          <span className={styles.linkedinCardSource}>tutorwise.com</span>
        </div>
      </div>
      <div className={styles.linkedinActions}>
        <span>Like</span>
        <span>Comment</span>
        <span>Repost</span>
        <span>Send</span>
      </div>
    </div>
  );
}

// Facebook Preview Component
function FacebookPreview({
  title,
  description,
  imageUrl,
  imageColor,
}: {
  title: string;
  description: string;
  imageUrl?: string;
  imageColor: string;
}) {
  return (
    <div className={styles.facebookPreview}>
      <div className={styles.facebookHeader}>
        <div className={styles.facebookAvatar}>TW</div>
        <div className={styles.facebookMeta}>
          <span className={styles.facebookName}>Tutorwise</span>
          <span className={styles.facebookTime}>Just now</span>
        </div>
      </div>
      <div className={styles.facebookContent}>
        <p className={styles.facebookText}>{description}</p>
      </div>
      <div className={styles.facebookCard}>
        <div
          className={styles.facebookImage}
          style={{
            backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
            backgroundColor: imageUrl ? undefined : imageColor,
          }}
        >
          {!imageUrl && <span className={styles.imagePlaceholder}>Featured Image</span>}
        </div>
        <div className={styles.facebookCardContent}>
          <span className={styles.facebookCardSource}>TUTORWISE.COM</span>
          <h4 className={styles.facebookCardTitle}>{title}</h4>
        </div>
      </div>
      <div className={styles.facebookActions}>
        <span>Like</span>
        <span>Comment</span>
        <span>Share</span>
      </div>
    </div>
  );
}

// Instagram Preview Component
function InstagramPreview({
  title,
  description,
  imageUrl,
  imageColor,
}: {
  title: string;
  description: string;
  imageUrl?: string;
  imageColor: string;
}) {
  return (
    <div className={styles.instagramPreview}>
      <div className={styles.instagramHeader}>
        <div className={styles.instagramAvatar}>TW</div>
        <span className={styles.instagramName}>tutorwise</span>
      </div>
      <div
        className={styles.instagramImage}
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
          backgroundColor: imageUrl ? undefined : imageColor,
        }}
      >
        {!imageUrl && (
          <div className={styles.instagramImagePlaceholder}>
            <span className={styles.imagePlaceholder}>Featured Image</span>
            <span className={styles.instagramRatio}>1:1 (1080x1080)</span>
          </div>
        )}
      </div>
      <div className={styles.instagramActions}>
        <span>Like</span>
        <span>Comment</span>
        <span>Share</span>
        <span>Save</span>
      </div>
      <div className={styles.instagramCaption}>
        <strong>tutorwise</strong> {title}
        <br />
        <span className={styles.instagramDescription}>
          {description.substring(0, 125)}
          {description.length > 125 && '... more'}
        </span>
      </div>
    </div>
  );
}
