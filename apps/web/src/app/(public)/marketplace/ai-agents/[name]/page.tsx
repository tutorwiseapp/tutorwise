/**
 * Filename: (public)/marketplace/ai-agents/[name]/page.tsx
 * Purpose: Public AI tutor profile page — copied from public-profile/[id]/page.tsx, customised for AI
 * Created: 2026-03-03
 *
 * Route: /marketplace/ai-agents/[name]  (e.g. /marketplace/ai-agents/sage-tutor-english)
 *
 * Differences from human tutor public profile:
 * - Lookup by `name` slug (not UUID) in ai_agents table
 * - No availability schedule or services listings
 * - AIAgentHowItWorksCard instead of ServicesCard
 * - AIAgentTrustCard instead of VerificationCard
 * - AIAgentStatsCard instead of RoleStatsCard
 * - AIAgentStartSessionCard instead of GetInTouchCard
 * - SimilarAIAgentsCard instead of SimilarProfilesCard
 * - AIAgentMobileBottomCTA (single Start Session button)
 * - AIAgentViewTracker (increments view_count via RPC)
 */

export const revalidate = 300; // 5-minute cache

import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { PublicPageShell } from '@/app/components/layout/PublicPageShell';
import { AIAgentHeroSection } from '@/app/components/feature/ai-agents/public-profile/AIAgentHeroSection';
import { AIAgentAboutCard } from '@/app/components/feature/ai-agents/public-profile/AIAgentAboutCard';
import { AIAgentWhatITeachCard } from '@/app/components/feature/ai-agents/public-profile/AIAgentWhatITeachCard';
import { AIAgentHowItWorksCard } from '@/app/components/feature/ai-agents/public-profile/AIAgentHowItWorksCard';
import { AIAgentReviewsCard } from '@/app/components/feature/ai-agents/public-profile/AIAgentReviewsCard';
import { AIAgentTrustCard } from '@/app/components/feature/ai-agents/public-profile/AIAgentTrustCard';
import { AIAgentStatsCard } from '@/app/components/feature/ai-agents/public-profile/AIAgentStatsCard';
import { AIAgentStartSessionCard } from '@/app/components/feature/ai-agents/public-profile/AIAgentStartSessionCard';
import { SimilarAIAgentsCard } from '@/app/components/feature/ai-agents/public-profile/SimilarAIAgentsCard';
import { AIAgentViewTracker } from '@/app/components/feature/ai-agents/public-profile/AIAgentViewTracker';
import { AIAgentMobileBottomCTA } from '@/app/components/feature/ai-agents/public-profile/AIAgentMobileBottomCTA';
import type { AIAgentPublicProfile } from '@/app/components/feature/ai-agents/public-profile/AIAgentHeroSection';
import type { AIAgentReview } from '@/app/components/feature/ai-agents/public-profile/AIAgentReviewsCard';
import type { SimilarAgent } from '@/app/components/feature/ai-agents/public-profile/SimilarAIAgentsCard';

interface AIAgentPublicPageProps {
  params: Promise<{ name: string }>;
}

// ============================================================
// METADATA
// ============================================================
export async function generateMetadata({ params }: AIAgentPublicPageProps) {
  const { name } = await params;
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from('ai_agents')
    .select('display_name, description, subject')
    .eq('name', name)
    .eq('status', 'published')
    .maybeSingle();

  if (!agent) {
    return { title: 'AI Tutor Not Found | Tutorwise' };
  }

  return {
    title: `${agent.display_name} — AI Tutor | Tutorwise`,
    description:
      agent.description?.substring(0, 160) ||
      `Learn ${agent.subject} with ${agent.display_name}, an AI tutor on Tutorwise.`,
    openGraph: {
      title: `${agent.display_name} — AI Tutor`,
      description:
        agent.description ||
        `Learn ${agent.subject} with ${agent.display_name} on Tutorwise.`,
    },
    robots: { index: true, follow: true },
  };
}

// ============================================================
// PAGE
// ============================================================
export default async function AIAgentPublicPage({ params }: AIAgentPublicPageProps) {
  const { name } = await params;
  const supabase = await createClient();

  // ──────────────────────────────────────────────
  // STEP 1: Fetch agent by name slug
  // ──────────────────────────────────────────────
  const { data: agentRow, error } = await supabase
    .from('ai_agents')
    .select(`
      id, display_name, name, description, avatar_url,
      subject, price_per_hour, status, avg_rating, total_reviews,
      total_sessions, is_platform_owned, created_at, view_count,
      owner_id
    `)
    .eq('name', name)
    .eq('status', 'published')
    .single();

  if (error || !agentRow) {
    notFound();
  }

  // ──────────────────────────────────────────────
  // STEP 2: Skills
  // ──────────────────────────────────────────────
  const { data: skillRows } = await supabase
    .from('ai_agent_skills')
    .select('skill_name')
    .eq('agent_id', agentRow.id);

  const skills = skillRows?.map((s) => s.skill_name) ?? [];

  // ──────────────────────────────────────────────
  // STEP 3: Reviews from ai_agent_sessions
  // ──────────────────────────────────────────────
  const { data: reviewSessions } = await supabase
    .from('ai_agent_sessions')
    .select('id, rating, review_text, reviewed_at, client_id')
    .eq('agent_id', agentRow.id)
    .eq('reviewed', true)
    .not('rating', 'is', null)
    .order('reviewed_at', { ascending: false })
    .limit(10);

  const reviews: AIAgentReview[] = await Promise.all(
    (reviewSessions || []).map(async (session) => {
      let reviewer_name = 'Verified Student';
      let reviewer_avatar_url: string | null = null;

      if (session.client_id) {
        const { data: reviewer } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', session.client_id)
          .maybeSingle();

        if (reviewer) {
          reviewer_name = reviewer.full_name || 'Verified Student';
          reviewer_avatar_url = reviewer.avatar_url || null;
        }
      }

      return {
        id: session.id,
        rating: session.rating as number,
        comment: session.review_text as string | undefined,
        created_at: session.reviewed_at as string,
        reviewer_name,
        reviewer_avatar_url,
      };
    })
  );

  // ──────────────────────────────────────────────
  // STEP 4: Students helped (unique client count)
  // ──────────────────────────────────────────────
  const { data: studentRows } = await supabase
    .from('ai_agent_sessions')
    .select('client_id')
    .eq('agent_id', agentRow.id)
    .not('client_id', 'is', null);

  const studentsHelped = studentRows
    ? new Set(studentRows.map((r) => r.client_id)).size
    : 0;

  // ──────────────────────────────────────────────
  // STEP 5: Owner profile (creator attribution for third-party agents)
  // ──────────────────────────────────────────────
  let owner: AIAgentPublicProfile['owner'] = null;
  if (agentRow.owner_id && !agentRow.is_platform_owned) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, identity_verified, slug')
      .eq('id', agentRow.owner_id)
      .maybeSingle();

    if (ownerProfile) {
      owner = {
        id: ownerProfile.id,
        full_name: ownerProfile.full_name || 'Tutor',
        avatar_url: ownerProfile.avatar_url || null,
        identity_verified: ownerProfile.identity_verified || false,
        slug: ownerProfile.slug || null,
      };
    }
  }

  // ──────────────────────────────────────────────
  // STEP 6: Similar AI agents (same subject)
  // ──────────────────────────────────────────────
  const { data: similarRows } = await supabase
    .from('ai_agents')
    .select('id, display_name, name, avatar_url, subject, avg_rating, total_sessions, price_per_hour')
    .eq('status', 'published')
    .eq('subject', agentRow.subject)
    .neq('id', agentRow.id)
    .limit(4);

  const similarAgents: SimilarAgent[] = (similarRows || []).map((a) => ({
    id: a.id,
    display_name: a.display_name,
    name: a.name,
    avatar_url: a.avatar_url || undefined,
    subject: a.subject,
    avg_rating: a.avg_rating || undefined,
    total_sessions: a.total_sessions || undefined,
    price_per_hour: a.price_per_hour,
  }));

  // ──────────────────────────────────────────────
  // STEP 7: Build agent object for components
  // ──────────────────────────────────────────────
  const agent: AIAgentPublicProfile = {
    id: agentRow.id,
    name: agentRow.name,
    display_name: agentRow.display_name,
    description: agentRow.description || undefined,
    avatar_url: agentRow.avatar_url || undefined,
    subject: agentRow.subject,
    price_per_hour: agentRow.price_per_hour,
    status: agentRow.status,
    avg_rating: agentRow.avg_rating || undefined,
    total_reviews: agentRow.total_reviews || undefined,
    total_sessions: agentRow.total_sessions || undefined,
    is_platform_owned: agentRow.is_platform_owned,
    created_at: agentRow.created_at,
    view_count: agentRow.view_count || 0,
    skills,
    owner,
  };

  // ──────────────────────────────────────────────
  // STEP 8: Render
  // ──────────────────────────────────────────────
  return (
    <PublicPageShell
      metadata={{
        title: `${agent.display_name} — AI Tutor | Tutorwise`,
        description:
          agent.description?.substring(0, 160) ||
          `Learn ${agent.subject} with ${agent.display_name}, an AI tutor on Tutorwise.`,
        canonicalUrl: `https://tutorwise.io/marketplace/ai-agents/${agent.name}`,
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: agent.display_name,
          description: agent.description || `AI tutor for ${agent.subject}`,
          offers: {
            '@type': 'Offer',
            price: agent.price_per_hour,
            priceCurrency: 'GBP',
            availability: 'https://schema.org/InStock',
          },
        },
        isIndexable: true,
      }}
      hero={<AIAgentHeroSection agent={agent} />}
      mainContent={[
        <AIAgentAboutCard key="about" agent={agent} />,
        <AIAgentWhatITeachCard key="what-i-teach" agent={agent} />,
        <AIAgentHowItWorksCard key="how-it-works" />,
        <AIAgentReviewsCard key="reviews" agentName={agent.display_name} reviews={reviews} />,
      ]}
      sidebar={[
        <AIAgentTrustCard key="trust" agent={agent} />,
        <AIAgentStatsCard key="stats" agent={agent} studentsHelped={studentsHelped} />,
        <AIAgentStartSessionCard key="start-session" agent={agent} />,
      ]}
      relatedSection={
        <SimilarAIAgentsCard agents={similarAgents} />
      }
      mobileBottomCTA={<AIAgentMobileBottomCTA agent={agent} />}
      viewTracker={<AIAgentViewTracker agentId={agent.id} />}
      showBottomSpacer={true}
    />
  );
}
