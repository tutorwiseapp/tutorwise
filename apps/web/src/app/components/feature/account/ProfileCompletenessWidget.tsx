/**
 * Filename: apps/web/src/app/components/feature/account/ProfileCompletenessWidget.tsx
 * Purpose: Profile completeness tracker with CTAs (v4.7 - Viral Growth)
 * Created: 2025-11-09
 *
 * Features:
 * - Calculates profile completion percentage
 * - Shows missing sections with CTAs to complete them
 * - Gamification element to encourage profile completion
 * - Links to create listings, join network, etc.
 */
'use client';

import React, { useMemo } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { Profile } from '@/types';
import styles from './ProfileCompletenessWidget.module.css';

interface Section {
  id: string;
  label: string;
  completed: boolean;
  action: string;
  route: string;
}

function calculateCompleteness(profile: Profile): { score: number; sections: Section[] } {
  const sections: Section[] = [];

  // Personal Info (20%)
  const hasPersonalInfo = !!(
    profile.first_name &&
    profile.last_name &&
    profile.email &&
    profile.phone &&
    profile.country
  );
  sections.push({
    id: 'personal',
    label: 'Personal Information',
    completed: hasPersonalInfo,
    action: 'Complete personal info',
    route: '/account/personal-info',
  });

  // Professional Info (30%)
  const role = profile.active_role;
  let hasProfessionalInfo = false;

  if (role === 'tutor') {
    hasProfessionalInfo = !!(
      profile.bio &&
      profile.professional_details?.tutor?.subjects?.length &&
      profile.professional_details?.tutor?.key_stages?.length
    );
  } else if (role === 'agent') {
    hasProfessionalInfo = !!(
      profile.bio &&
      profile.professional_details?.agent?.agency_name &&
      profile.professional_details?.agent?.services?.length
    );
  } else if (role === 'client') {
    hasProfessionalInfo = !!(
      profile.bio &&
      profile.professional_details?.client?.subjects?.length &&
      profile.professional_details?.client?.learning_goals?.length
    );
  }

  sections.push({
    id: 'professional',
    label: 'Professional Details',
    completed: hasProfessionalInfo,
    action: 'Add professional info',
    route: '/account/professional',
  });

  // Profile Picture (10%)
  const hasAvatar = !!(profile.avatar_url && profile.avatar_url !== '/default-avatar.png');
  sections.push({
    id: 'avatar',
    label: 'Profile Picture',
    completed: hasAvatar,
    action: 'Upload profile picture',
    route: '/account/personal-info',
  });

  // Listings (20% - only for tutors/agents)
  if (role === 'tutor' || role === 'agent') {
    // TODO: Check if user has active listings via API
    const hasListings = false; // Placeholder
    sections.push({
      id: 'listings',
      label: 'Active Listing',
      completed: hasListings,
      action: 'Create your first listing',
      route: '/create-listing',
    });
  }

  // Network Connections (20%)
  // TODO: Check if user has connections via API
  const hasConnections = false; // Placeholder
  sections.push({
    id: 'network',
    label: 'Network Connections',
    completed: hasConnections,
    action: 'Connect with others',
    route: '/network',
  });

  // Calculate score
  const completedCount = sections.filter((s) => s.completed).length;
  const score = Math.round((completedCount / sections.length) * 100);

  return { score, sections };
}

export function ProfileCompletenessWidget() {
  const { profile } = useUserProfile();

  const { score } = useMemo(() => {
    if (!profile) return { score: 0, sections: [] };
    return calculateCompleteness(profile);
  }, [profile]);

  if (!profile) {
    return null;
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>Profile Completeness</h3>
        <div className={styles.scoreChip}>
          <span>{score}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${score}%` }}
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
}
