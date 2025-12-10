/**
 * Filename: RoleBasedHomepage.tsx
 * Purpose: Role-based homepage variants for marketplace
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Role-based Homepage Variants
 *
 * Features:
 * - Detects user role (client, tutor, agent, or guest)
 * - Renders appropriate homepage variant based on role
 * - Personalized content sections for each role
 * - Seamless fallback to default marketplace for guests
 *
 * Role-Specific Views:
 * - Client: Browse tutors, job posting CTA, recommended tutors
 * - Tutor: Browse students/jobs, create listing CTA, skill matching
 * - Agent: Browse opportunities, network insights, commission tracking
 * - Guest: Standard marketplace with sign-up prompts
 */

'use client';

import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ClientHomepage from './role-variants/ClientHomepage';
import TutorHomepage from './role-variants/TutorHomepage';
import AgentHomepage from './role-variants/AgentHomepage';
import GuestHomepage from './role-variants/GuestHomepage';
import type { MarketplaceItem } from '@/types/marketplace';

interface RoleBasedHomepageProps {
  initialItems: MarketplaceItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  total: number;
  onSearch: (query: string) => void;
  onLoadMore: () => void;
}

export default function RoleBasedHomepage({
  initialItems,
  isLoading,
  isLoadingMore,
  hasMore,
  total,
  onSearch,
  onLoadMore,
}: RoleBasedHomepageProps) {
  const { profile, isLoading: profileLoading } = useUserProfile();

  // Show loading state while checking user profile
  if (profileLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Determine which homepage variant to show based on active_role
  const activeRole = profile?.active_role;

  // Client homepage variant
  if (activeRole === 'client') {
    return (
      <ClientHomepage
        items={initialItems}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        total={total}
        onSearch={onSearch}
        onLoadMore={onLoadMore}
        profile={profile}
      />
    );
  }

  // Tutor homepage variant
  if (activeRole === 'tutor') {
    return (
      <TutorHomepage
        items={initialItems}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        total={total}
        onSearch={onSearch}
        onLoadMore={onLoadMore}
        profile={profile}
      />
    );
  }

  // Agent homepage variant
  if (activeRole === 'agent') {
    return (
      <AgentHomepage
        items={initialItems}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        total={total}
        onSearch={onSearch}
        onLoadMore={onLoadMore}
        profile={profile}
      />
    );
  }

  // Guest/unauthenticated homepage variant
  return (
    <GuestHomepage
      items={initialItems}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      total={total}
      onSearch={onSearch}
      onLoadMore={onLoadMore}
    />
  );
}
