/**
 * Filename: apps/web/src/app/(public)/companies/page.tsx
 * Purpose: Browse tutoring companies (pre-filtered to category='company')
 * Created: 2026-01-03
 * Route: /companies
 */

import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';
import OrganisationBrowseClient from '../organisations/OrganisationBrowseClient';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Browse Tutoring Companies | Tutorwise',
  description: 'Find professional tutoring companies and educational service providers. Browse verified companies offering comprehensive tutoring solutions.',
  openGraph: {
    title: 'Browse Tutoring Companies | Tutorwise',
    description: 'Find professional tutoring companies and educational service providers.',
    type: 'website',
  },
};

export default async function CompaniesPage() {
  const supabase = await createClient();

  // Fetch companies only (category = 'company')
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
    .eq('category', 'company')
    .eq('public_visible', true)
    .order('caas_score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch companies:', error);
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Failed to load companies</h1>
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
      defaultCategory="company"
      pageTitle="Browse Tutoring Companies"
      pageDescription="Find professional tutoring companies and educational service providers. Browse verified companies offering comprehensive tutoring solutions."
    />
  );
}
