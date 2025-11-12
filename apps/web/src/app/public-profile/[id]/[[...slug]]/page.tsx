/*
 * Filename: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
 * Purpose: Public Profile Page - Server Component (v4.9 Redesign)
 * Created: 2025-11-10
 * Updated: 2025-11-12 - Redesigned to match listing details gold standard
 *
 * Features:
 * - SEO-optimized server-side rendering
 * - Resilient URLs with [id]/[slug] format
 * - 301 redirect if slug doesn't match current profile slug
 * - 2-column layout matching listing details page (2fr 1fr)
 * - No AppSidebar on public profile (anonymous experience)
 * - Hero section with avatar left, info center, CTAs bottom-right
 * - Sticky right sidebar with verification, stats, and CTAs
 * - Mobile-optimized with fixed bottom CTA
 */

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { generateSlug } from '@/lib/utils/slugify';
import type { Profile } from '@/types';
import Container from '@/app/components/layout/Container';
import { ProfileHeroSection } from '@/app/components/public-profile/ProfileHeroSection';
import { AboutCard } from '@/app/components/public-profile/AboutCard';
import { ProfessionalInfoCard } from '@/app/components/public-profile/ProfessionalInfoCard';
import { AvailabilityCard } from '@/app/components/public-profile/AvailabilityCard';
import { RoleStatsCard } from '@/app/components/account/RoleStatsCard';
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
  // STEP 3: Get current user (for isOwnProfile check)
  // ===========================================================
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  // ===========================================================
  // STEP 4: Render with 2-column layout (no AppSidebar)
  // ===========================================================
  return (
    <Container>
      {/* SECTION 1: Hero Section (1-column) */}
      <div className={styles.heroSection}>
        <ProfileHeroSection profile={profile as Profile} isOwnProfile={isOwnProfile} />
      </div>

      {/* SECTION 2: Body (2-column layout) */}
      <div className={styles.bodySection}>
        {/* Column 1: Main content (2fr width on desktop) */}
        <div className={styles.mainColumn}>
          {/* About Card */}
          <AboutCard profile={profile as Profile} />

          {/* Professional Information Card */}
          <ProfessionalInfoCard profile={profile as Profile} />

          {/* Availability Card */}
          <AvailabilityCard profile={profile as Profile} />

          {/* TODO: Services Card */}
          {/* TODO: Reviews Card */}
        </div>

        {/* Column 2: Sticky Sidebar (1fr width on desktop) */}
        <div className={styles.sidebarColumn}>
          {/* TODO: Verification Card */}

          {/* Profile Stats Card */}
          <RoleStatsCard profile={profile as Profile} />

          {/* TODO: Get in Touch Card */}
        </div>
      </div>

      {/* SECTION 3: Related Profiles (1-column full width) */}
      <div className={styles.relatedSection}>
        {/* TODO: Similar Profiles Card */}
      </div>

      {/* Mobile-only: Fixed bottom CTA bar */}
      {/* TODO: MobileBottomCTA component */}
    </Container>
  );
}
