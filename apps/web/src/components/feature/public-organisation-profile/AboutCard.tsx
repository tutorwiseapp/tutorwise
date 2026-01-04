/**
 * Filename: AboutCard.tsx
 * Purpose: Display organisation description, mission, and video introduction
 * Created: 2025-12-31
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Play, Edit } from 'lucide-react';
import { VideoModal } from '@/app/components/ui/feedback/VideoModal';
import styles from './AboutCard.module.css';

interface AboutCardProps {
  organisation: any;
  isOwner?: boolean;
}

export function AboutCard({ organisation, isOwner = false }: AboutCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const bio = organisation.bio || '';
  const tagline = organisation.tagline || '';
  const videoUrl = organisation.video_intro_url;

  // Determine if bio is long enough to need expansion
  const bioLength = bio.length;
  const needsExpansion = bioLength > 300;
  const displayBio = needsExpansion && !isExpanded
    ? bio.substring(0, 300) + '...'
    : bio;

  // Don't render if no content
  if (!bio && !tagline && !videoUrl) {
    return null;
  }

  return (
    <>
      <div className={styles.card}>
        {/* Header with light teal background */}
        <div className={styles.header}>
          <h2 className={styles.title}>About {organisation.name}</h2>

          <div className={styles.headerActions}>
            {/* Edit Button (only for owners) */}
            {isOwner && (
              <button
                className={styles.editButton}
                onClick={() => router.push('/organisation?tab=info')}
                aria-label="Edit about section"
                title="Edit about section"
              >
                <Edit size={16} />
              </button>
            )}

            {/* Video Introduction Button */}
            {videoUrl && (
              <button
                className={styles.videoButton}
                onClick={() => setShowVideoModal(true)}
                aria-label="Watch introduction video"
              >
                <Play size={16} />
                <span>Watch Video</span>
              </button>
            )}
          </div>
        </div>

        {/* Content wrapper for padding */}
        <div className={styles.bioContent}>
          {/* Tagline */}
          {tagline && (
            <div className={styles.tagline}>
              &ldquo;{tagline}&rdquo;
            </div>
          )}

          {/* Bio/Description */}
          {bio && (
            <div className={styles.bioSection}>
              <div className={styles.bioText}>
                {displayBio}
              </div>

              {/* Read More / Show Less Button */}
              {needsExpansion && (
                <button
                  className={styles.expandButton}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp size={16} />
                    </>
                  ) : (
                    <>
                      <span>Read More</span>
                      <ChevronDown size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Additional Info */}
          {organisation.website && (
            <div className={styles.websiteSection}>
              <span className={styles.websiteLabel}>Website:</span>
              <a
                href={organisation.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.websiteLink}
              >
                {organisation.website}
              </a>
            </div>
          )}

          {/* Service Area */}
          {organisation.service_area && organisation.service_area.length > 0 && (
            <div className={styles.serviceArea}>
              <span className={styles.serviceAreaLabel}>We serve:</span>
              <div className={styles.serviceAreaList}>
                {organisation.service_area.map((area: string) => (
                  <span key={area} className={styles.areaTag}>
                    📍 {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Modal */}
      {showVideoModal && videoUrl && (
        <VideoModal
          isOpen={true}
          videoUrl={videoUrl}
          title={`${organisation.name} - Introduction`}
          onClose={() => setShowVideoModal(false)}
        />
      )}
    </>
  );
}
