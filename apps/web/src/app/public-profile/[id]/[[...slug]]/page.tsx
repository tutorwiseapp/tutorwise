/*
 * Filename: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
 * Purpose: Public Profile Page - Server Component (v4.8)
 * Created: 2025-11-10
 *
 * Features:
 * - SEO-optimized server-side rendering
 * - Resilient URLs with [id]/[slug] format
 * - 301 redirect if slug doesn't match current profile slug
 * - Context-aware layout (AppSidebar for auth users, hidden for anonymous)
 * - Role-aware content (Tutor/Client/Agent)
 */

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { generateSlug } from '@/lib/utils/slugify';
import type { Profile } from '@/types';
import { HeroProfileCard } from '@/app/components/account/HeroProfileCard';
import { PublicActionCard } from '@/app/components/public-profile/PublicActionCard';
import { RoleStatsCard } from '@/app/components/account/RoleStatsCard';
import { UnifiedProfileTabs } from '@/app/components/public-profile/UnifiedProfileTabs';
import styles from './page.module.css';

interface PublicProfilePageProps {
  params: {
    id: string;
    slug?: string[];
  };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PublicProfilePageProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, bio, active_role')
    .eq('id', params.id)
    .single();

  if (!profile) {
    return {
      title: 'Profile Not Found | Tutorwise',
    };
  }

  const roleLabel = profile.active_role === 'tutor' ? 'Tutor'
    : profile.active_role === 'agent' ? 'Agent'
    : 'Client';

  return {
    title: `${profile.full_name} - ${roleLabel} | Tutorwise`,
    description: profile.bio?.substring(0, 160) || `View ${profile.full_name}'s profile on Tutorwise`,
    openGraph: {
      title: `${profile.full_name} - ${roleLabel}`,
      description: profile.bio || `${profile.full_name} on Tutorwise`,
    },
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const supabase = await createClient();

  // ===========================================================
  // STEP 1: Fetch profile using ONLY the ID (permanent lookup)
  // ===========================================================
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !profile) {
    notFound();
  }

  // ===========================================================
  // STEP 2: Validate slug and 301 redirect if incorrect
  // ===========================================================
  const correctSlug = profile.slug || generateSlug(profile.full_name);
  const urlSlug = params.slug?.[0] || '';

  // If slug doesn't match, perform permanent redirect to correct URL
  if (correctSlug !== urlSlug) {
    redirect(`/public-profile/${profile.id}/${correctSlug}`);
  }

  // ===========================================================
  // STEP 3: Get current user (for context-aware rendering)
  // ===========================================================
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  // ===========================================================
  // STEP 4: Fetch current user's profile (if authenticated)
  // ===========================================================
  let currentUserProfile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    currentUserProfile = data as Profile;
  }

  // ===========================================================
  // STEP 5: Render with context-aware layout
  // ===========================================================
  return (
    <div className={styles.pageContainer}>
      {/* TODO: Add conditional AppSidebar for authenticated users (Phase 3) */}

      <div className={styles.mainContent}>
        <div className={styles.container}>
          {/* Hero Banner */}
          <div className={styles.heroSection}>
            <div className={styles.avatarContainer}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${profile.full_name}'s avatar`}
                  className={styles.heroAvatar}
                />
              ) : (
                <div className={styles.heroAvatarPlaceholder}>
                  {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className={styles.heroInfo}>
              <h1 className={styles.heroName}>{profile.full_name}</h1>
              <div className={styles.heroMeta}>
                <span className={styles.roleBadge}>
                  {profile.active_role === 'tutor' ? 'Tutor' :
                   profile.active_role === 'agent' ? 'Agent' : 'Client'}
                </span>
                {profile.bio && (
                  <p className={styles.heroBio}>{profile.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* UnifiedProfileTabs - Main content area */}
          <UnifiedProfileTabs profile={profile as Profile} />
        </div>
      </div>

      {/* Right Sidebar with widgets */}
      <div className={styles.sidebar}>
        {/* HeroProfileCard in readOnly mode */}
        <HeroProfileCard readOnly={true} profileData={profile as Profile} />

        {/* PublicActionCard with context-aware CTAs */}
        <PublicActionCard
          profile={profile as Profile}
          currentUser={currentUserProfile}
          isOwnProfile={isOwnProfile}
        />

        {/* RoleStatsCard showing profile statistics */}
        <RoleStatsCard profile={profile as Profile} />
      </div>
    </div>
  );
}
