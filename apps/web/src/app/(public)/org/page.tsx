/**
 * Filename: apps/web/src/app/(public)/org/page.tsx
 * Purpose: Browse all tutoring organisations (all categories)
 * Created: 2026-01-03
 * Route: /org
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
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // Fetch organisations with pre-aggregated stats (single query - eliminates N+1 problem)
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
    .eq('organisation.public_visible', true)
    .order('organisation.caas_score', { ascending: false, nullsLast: true })
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

  // Transform data to match expected Organisation interface
  const organisations: Organisation[] = (organisationsWithStats || []).map((stat: any) => ({
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

  // Extract unique values for filters
  const uniqueCities = Array.from(
    new Set(
      organisations
        .map((org) => org.location_city)
        .filter(Boolean)
    )
  ).sort();

  const uniqueSubjects = Array.from(
    new Set(
      organisations
        .flatMap((org) => org.subjects_offered || [])
        .filter(Boolean)
    )
  ).sort();

  const uniqueCategories = Array.from(
    new Set(
      organisations
        .map((org) => org.category)
        .filter(Boolean)
    )
  ).sort();

  return (
    <OrganisationBrowseClient
      organisations={organisations}
      cities={uniqueCities as string[]}
      subjects={uniqueSubjects as string[]}
      categories={uniqueCategories as string[]}
      defaultCategory={null} // Show all categories
      pageTitle="Browse Tutoring Organisations"
      pageDescription="Discover professional tutoring agencies, schools, and educational organisations."
    />
  );
}
