/**
 * Filename: apps/web/src/app/(public)/companies/page.tsx
 * Purpose: Browse tutoring companies (pre-filtered to category='company')
 * Created: 2026-01-03
 * Route: /companies
 */

import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';
import OrganisationBrowseClient from '../org/OrganisationBrowseClient';

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
  const today = new Date().toISOString().split('T')[0];

  // Fetch companies with pre-aggregated stats (single query - eliminates N+1 problem)
  const { data: organisationsWithStats, error } = await supabase
    .from('organisation_statistics_daily')
    .select(`
      total_tutors,
      average_rating,
      total_reviews,
      organisation:connection_groups!inner(
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
      )
    `)
    .eq('date', today)
    .eq('organisation.type', 'organisation')
    .eq('organisation.category', 'company')
    .eq('organisation.public_visible', true)
    .order('organisation.caas_score', { ascending: false, nullsLast: true })
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

  // Transform data to match expected interface
  const organisations = (organisationsWithStats || []).map((stat: any) => ({
    id: stat.organisation.id,
    name: stat.organisation.name,
    slug: stat.organisation.slug,
    tagline: stat.organisation.tagline,
    avatar_url: stat.organisation.avatar_url,
    location_city: stat.organisation.location_city,
    location_country: stat.organisation.location_country,
    subjects_offered: stat.organisation.subjects_offered,
    caas_score: stat.organisation.caas_score,
    category: stat.organisation.category,
    total_tutors: stat.total_tutors || 0,
    avg_rating: stat.average_rating ? Number(stat.average_rating) : undefined,
    total_reviews: stat.total_reviews || 0,
  }));

  // Extract unique values
  const uniqueCities = Array.from(
    new Set(organisations.map((org) => org.location_city).filter(Boolean))
  ).sort();

  const uniqueSubjects = Array.from(
    new Set(organisations.flatMap((org) => org.subjects_offered || []).filter(Boolean))
  ).sort();

  return (
    <OrganisationBrowseClient
      organisations={organisations}
      cities={uniqueCities as string[]}
      subjects={uniqueSubjects as string[]}
      categories={[]}
      defaultCategory="company"
      pageTitle="Browse Tutoring Companies"
      pageDescription="Find professional tutoring companies and educational service providers. Browse verified companies offering comprehensive tutoring solutions."
    />
  );
}
