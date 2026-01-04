/**
 * Filename: apps/web/src/app/(public)/agencies/page.tsx
 * Purpose: Browse tutoring agencies (pre-filtered to category='agency')
 * Created: 2026-01-03
 * Route: /agencies
 */

import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';
import OrganisationBrowseClient from '../organisations/OrganisationBrowseClient';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Browse Tutoring Agencies | Tutorwise',
  description: 'Find professional tutoring agencies near you. Browse hundreds of verified tutoring agencies offering expert tutors across all subjects and levels.',
  openGraph: {
    title: 'Browse Tutoring Agencies | Tutorwise',
    description: 'Find professional tutoring agencies near you.',
    type: 'website',
  },
};

export default async function AgenciesPage() {
  const supabase = await createClient();

  // Fetch agencies only (category = 'agency')
  const { data: organisations, error } = await supabase
    .from('connection_groups')
    .select(`
      id,
      name,
      slug,
      tagline,
      avatar_url,
      location_city,
      location_country,
      subjects_offered,
      caas_score,
      category
    `)
    .eq('type', 'organisation')
    .eq('category', 'agency')
    .eq('public_visible', true)
    .order('caas_score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch agencies:', error);
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Failed to load agencies</h1>
        <p>Please try again later.</p>
      </div>
    );
  }

  // Fetch stats
  const organisationsWithStats = await Promise.all(
    (organisations || []).map(async (org) => {
      const { data: stats } = await supabase.rpc('get_organisation_public_stats', {
        p_org_id: org.id,
      });

      return {
        ...org,
        total_tutors: stats?.[0]?.total_tutors || 0,
        avg_rating: stats?.[0]?.avg_rating ? Number(stats[0].avg_rating) : undefined,
        total_reviews: stats?.[0]?.total_reviews || 0,
      };
    })
  );

  // Extract unique values
  const uniqueCities = Array.from(
    new Set(organisationsWithStats.map((org) => org.location_city).filter(Boolean))
  ).sort();

  const uniqueSubjects = Array.from(
    new Set(organisationsWithStats.flatMap((org) => org.subjects_offered || []).filter(Boolean))
  ).sort();

  return (
    <OrganisationBrowseClient
      organisations={organisationsWithStats}
      cities={uniqueCities as string[]}
      subjects={uniqueSubjects as string[]}
      categories={[]} // No category filter on this page (pre-filtered)
      defaultCategory="agency"
      pageTitle="Browse Tutoring Agencies"
      pageDescription="Find professional tutoring agencies near you. Browse hundreds of verified tutoring agencies offering expert tutors across all subjects and levels."
    />
  );
}
