/**
 * Filename: apps/web/src/app/(public)/schools/page.tsx
 * Purpose: Browse tutoring schools (pre-filtered to category='school')
 * Created: 2026-01-03
 * Route: /schools
 */

import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';
import OrganisationBrowseClient from '../organisations/OrganisationBrowseClient';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Browse Tutoring Schools & Learning Centers | Tutorwise',
  description: 'Find tutoring schools and learning centers near you. Browse verified educational institutions offering structured tutoring programs and courses.',
  openGraph: {
    title: 'Browse Tutoring Schools & Learning Centers | Tutorwise',
    description: 'Find tutoring schools and learning centers near you.',
    type: 'website',
  },
};

export default async function SchoolsPage() {
  const supabase = await createClient();

  // Fetch schools only (category = 'school')
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
    .eq('category', 'school')
    .eq('public_visible', true)
    .order('caas_score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch schools:', error);
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Failed to load schools</h1>
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
      categories={[]}
      defaultCategory="school"
      pageTitle="Browse Tutoring Schools & Learning Centers"
      pageDescription="Find tutoring schools and learning centers near you. Browse verified educational institutions offering structured tutoring programs and courses."
    />
  );
}
