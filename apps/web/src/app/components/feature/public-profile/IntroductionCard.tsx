/**
 * Filename: IntroductionCard.tsx
 * Purpose: Introduction video card for public profile sidebar
 * Created: 2025-12-08
 * Updated: 2025-12-08 - Always show card, with placeholder if no video
 * Shows video thumbnail with play button, moved from hero section
 */

'use client';

import { useState } from 'react';
import { Play, Video } from 'lucide-react';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import { VideoModal } from '@/app/components/ui/feedback/VideoModal';
import styles from './IntroductionCard.module.css';

interface IntroductionCardProps {
  profile: Profile;
}

export function IntroductionCard({ profile }: IntroductionCardProps) {
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Always show card
  const hasVideo = !!profile.bio_video_url;

  return (
    <>
      <Card className={styles.introCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Introduction</h3>
        </div>

        {hasVideo ? (
          <div className={styles.videoPreview}>
            {/* Video Thumbnail */}
            <div className={styles.thumbnailContainer} onClick={() => setShowVideoModal(true)}>
              {profile.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.full_name}'s video introduction`}
                  className={styles.thumbnail}
                />
              )}
              <div className={styles.playOverlay}>
                <div className={styles.playButton}>
                  <Play size={32} fill="white" />
                </div>
              </div>
            </div>

            {/* Watch Button */}
            <button
              onClick={() => setShowVideoModal(true)}
              className={styles.watchButton}
            >
              <Play size={16} />
              Watch Introduction
            </button>
          </div>
        ) : (
          <div className={styles.placeholderContainer}>
            <p className={styles.placeholderText}>No video introduction yet</p>
          </div>
        )}
      </Card>

      {/* Video Modal */}
      {hasVideo && (
        <VideoModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          videoUrl={profile.bio_video_url!}
          title={`${profile.full_name}'s Introduction`}
        />
      )}
    </>
  );
}
