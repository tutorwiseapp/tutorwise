/**
 * Filename: OrganisationBrowseClient.tsx
 * Purpose: Shared client component for browsing organisations
 * Created: 2026-01-03
 * Pattern: Reusable across /organisations, /agencies, /schools, /companies routes
 *
 * Features:
 * - Search organisations by name/location
 * - Filter by category, location, subjects
 * - Responsive grid layout
 * - Click-through to organisation public profiles
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, MapPin, Building2, Star, Users } from 'lucide-react';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './OrganisationBrowseClient.module.css';

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

interface Props {
  organisations: Organisation[];
  cities: string[];
  subjects: string[];
  categories: string[];
  defaultCategory?: string | null; // Pre-filter for category-specific routes
  pageTitle?: string; // Custom title for category pages
  pageDescription?: string; // Custom description
}

export default function OrganisationBrowseClient({
  organisations,
  cities,
  subjects,
  categories,
  defaultCategory = null,
  pageTitle = 'Browse Tutoring Organisations',
  pageDescription = 'Discover professional tutoring agencies, schools, and educational organisations.',
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory || '');

  // Filter organisations based on search and filters
  const filteredOrganisations = useMemo(() => {
    return organisations.filter((org) => {
      // Search filter (name or tagline)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = org.name.toLowerCase().includes(query);
        const matchesTagline = org.tagline?.toLowerCase().includes(query);
        if (!matchesName && !matchesTagline) return false;
      }

      // Category filter
      if (selectedCategory && org.category !== selectedCategory) {
        return false;
      }

      // City filter
      if (selectedCity && org.location_city !== selectedCity) {
        return false;
      }

      // Subject filter
      if (selectedSubject && !org.subjects_offered?.includes(selectedSubject)) {
        return false;
      }

      return true;
    });
  }, [organisations, searchQuery, selectedCity, selectedSubject, selectedCategory]);

  // Get trust badge based on CaaS score
  const getTrustBadge = (score: number | null) => {
    if (!score) return null;
    if (score >= 90) return { label: 'Top 5%', color: '#10b981' }; // Green
    if (score >= 75) return { label: 'Top 10%', color: '#3b82f6' }; // Blue
    if (score >= 60) return { label: 'Verified', color: '#8b5cf6' }; // Purple
    return null;
  };

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.hero}>
        <h1 className={styles.title}>{pageTitle}</h1>
        <p className={styles.description}>{pageDescription}</p>
        <p className={styles.count}>
          {filteredOrganisations.length} organisation{filteredOrganisations.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Search and Filters */}
      <div className={styles.filtersSection}>
        {/* Search */}
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search organisations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          {/* Category filter (only show if not pre-filtered) */}
          {!defaultCategory && categories.length > 0 && (
            <UnifiedSelect
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(String(value))}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((category) => ({
                  value: category,
                  label: category.charAt(0).toUpperCase() + category.slice(1)
                }))
              ]}
              placeholder="All Categories"
            />
          )}

          {/* Location filter */}
          {cities.length > 0 && (
            <UnifiedSelect
              value={selectedCity}
              onChange={(value) => setSelectedCity(String(value))}
              options={[
                { value: '', label: 'All Locations' },
                ...cities.map((city) => ({
                  value: city,
                  label: city
                }))
              ]}
              placeholder="All Locations"
            />
          )}

          {/* Subject filter */}
          {subjects.length > 0 && (
            <UnifiedSelect
              value={selectedSubject}
              onChange={(value) => setSelectedSubject(String(value))}
              options={[
                { value: '', label: 'All Subjects' },
                ...subjects.map((subject) => ({
                  value: subject,
                  label: subject
                }))
              ]}
              placeholder="All Subjects"
            />
          )}

          {/* Clear filters */}
          {(searchQuery || selectedCity || selectedSubject || (selectedCategory && !defaultCategory)) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCity('');
                setSelectedSubject('');
                if (!defaultCategory) setSelectedCategory('');
              }}
              className={styles.clearButton}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Organisations Grid */}
      {filteredOrganisations.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 className={styles.emptyIcon} />
          <h3>No organisations found</h3>
          <p>Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredOrganisations.map((org) => {
            const badge = getTrustBadge(org.caas_score);

            return (
              <Link
                key={org.id}
                href={`/org/${org.slug}`}
                className={styles.card}
              >
                {/* Logo */}
                <div className={styles.logoWrapper}>
                  {org.avatar_url ? (
                    <Image
                      src={org.avatar_url}
                      alt={org.name}
                      width={80}
                      height={80}
                      className={styles.logo}
                    />
                  ) : (
                    <div className={styles.logoFallback}>
                      <Building2 size={32} />
                    </div>
                  )}
                </div>

                {/* Name and Badge */}
                <div className={styles.header}>
                  <h3 className={styles.name}>{org.name}</h3>
                  {badge && (
                    <span
                      className={styles.badge}
                      style={{ backgroundColor: badge.color }}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>

                {/* Tagline */}
                {org.tagline && (
                  <p className={styles.tagline}>{org.tagline}</p>
                )}

                {/* Stats */}
                <div className={styles.stats}>
                  {org.total_tutors !== undefined && org.total_tutors > 0 && (
                    <div className={styles.stat}>
                      <Users size={14} />
                      <span>{org.total_tutors} tutor{org.total_tutors !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {org.avg_rating && (
                    <div className={styles.stat}>
                      <Star size={14} />
                      <span>{org.avg_rating.toFixed(1)}</span>
                    </div>
                  )}
                  {org.location_city && (
                    <div className={styles.stat}>
                      <MapPin size={14} />
                      <span>{org.location_city}</span>
                    </div>
                  )}
                </div>

                {/* Subjects */}
                {org.subjects_offered && org.subjects_offered.length > 0 && (
                  <div className={styles.subjects}>
                    {org.subjects_offered.slice(0, 3).map((subject) => (
                      <span key={subject} className={styles.subjectTag}>
                        {subject}
                      </span>
                    ))}
                    {org.subjects_offered.length > 3 && (
                      <span className={styles.subjectTag}>
                        +{org.subjects_offered.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
