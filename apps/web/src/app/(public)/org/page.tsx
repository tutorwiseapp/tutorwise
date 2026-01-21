/**
 * Filename: apps/web/src/app/(public)/organisations/page.tsx
 * Purpose: Browse all tutoring organisations (all categories)
 * Created: 2026-01-03
 * Route: /organisations
 */

import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';
import OrganisationBrowseClient from './OrganisationBrowseClient';

export const revalidate = 300; // Revalidate every 5 minutes

export const metadata: Metadata = {
  title: 'Browse Tutoring Organisations | Tutorwise',
  description: 'Discover professional tutoring agencies, schools, and educational organisations. Browse by location, subjects, and more to find the perfect team of tutors.',
  openGraph: {
    title: 'Browse Tutoring Organisations | Tutorwise',
    description: 'Discover professional tutoring agencies, schools, and educational organisations.',
    type: 'website',
  },
};

interface Organisation {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  subjects_offered: string[] | null;
  caas_score: number | null;
  category: string | null;
  total_tutors?: number;
  avg_rating?: number;
  total_reviews?: number;
}

export default async function OrganisationsPage() {
  const supabase = await createClient();

  // Fetch all public organisations
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
    .eq('public_visible', true)
    .order('caas_score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch organisations:', error);
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Failed to load organisations</h1>
        <p>Please try again later.</p>
      </div>
    );
  }

  // Fetch stats for each organisation
  const organisationsWithStats: Organisation[] = await Promise.all(
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

  // Extract unique values for filters
  const uniqueCities = Array.from(
    new Set(
      organisationsWithStats
        .map((org) => org.location_city)
        .filter(Boolean)
    )
  ).sort();

  const uniqueSubjects = Array.from(
    new Set(
      organisationsWithStats
        .flatMap((org) => org.subjects_offered || [])
        .filter(Boolean)
    )
  ).sort();

  const uniqueCategories = Array.from(
    new Set(
      organisationsWithStats
        .map((org) => org.category)
        .filter(Boolean)
    )
  ).sort();

  return (
    <OrganisationBrowseClient
      organisations={organisationsWithStats}
      cities={uniqueCities as string[]}
      subjects={uniqueSubjects as string[]}
      categories={uniqueCategories as string[]}
      defaultCategory={null} // Show all categories
      pageTitle="Browse Tutoring Organisations"
      pageDescription="Discover professional tutoring agencies, schools, and educational organisations."
    />
  );
}
