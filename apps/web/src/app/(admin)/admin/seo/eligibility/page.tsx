/**
 * Filename: src/app/(admin)/admin/seo/eligibility/page.tsx
 * Purpose: Admin dashboard for monitoring SEO eligibility scores
 * Created: 2025-12-31
 * Phase: Trust-First SEO - Admin UI
 *
 * Features:
 * - View aggregate eligibility statistics
 * - Browse profiles by eligibility score
 * - Filter by role, score range, eligibility status
 * - View detailed eligibility breakdown for individual profiles
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './page.module.css';

interface SEOStats {
  profiles: {
    total: number;
    eligible: number;
    eligibility_rate: number;
    by_score_range: {
      high_trust: number;
      trusted: number;
      moderate: number;
      low: number;
    };
    by_role: {
      tutor: { total: number; eligible: number };
      agent: { total: number; eligible: number };
      client: { total: number; eligible: number };
    };
  };
  listings: {
    total_active: number;
    from_eligible_providers: number;
    eligibility_rate: number;
  };
  updated_at: string;
}

interface EligibleProfile {
  id: string;
  full_name: string;
  slug: string;
  role: string;
  seo_eligibility_score: number;
  seo_eligible: boolean;
  profile_url: string;
}

export default function SEOEligibilityPage() {
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'trusted' | 'moderate' | 'low'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'tutor' | 'agent' | 'client'>('all');
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<SEOStats>({
    queryKey: ['seo-stats'],
    queryFn: async () => {
      const res = await fetch('/api/seo/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch profiles
  const { data: profilesData, isLoading: profilesLoading } = useQuery({
    queryKey: ['eligible-profiles', scoreFilter, roleFilter, eligibleOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '100');

      // Set min score based on filter
      if (scoreFilter === 'high') params.set('minScore', '80');
      else if (scoreFilter === 'trusted') params.set('minScore', '75');
      else if (scoreFilter === 'moderate') params.set('minScore', '60');
      else if (scoreFilter === 'low') params.set('minScore', '0');
      else params.set('minScore', '0');

      if (roleFilter !== 'all') params.set('role', roleFilter);

      const res = await fetch(`/api/seo/eligible-profiles?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch profiles');
      return res.json();
    },
  });

  const profiles = profilesData?.profiles || [];

  // Filter profiles by score range and eligibility
  const filteredProfiles = profiles.filter((profile: EligibleProfile) => {
    if (eligibleOnly && !profile.seo_eligible) return false;

    if (scoreFilter === 'high') return profile.seo_eligibility_score >= 80;
    if (scoreFilter === 'trusted') return profile.seo_eligibility_score >= 75 && profile.seo_eligibility_score < 80;
    if (scoreFilter === 'moderate') return profile.seo_eligibility_score >= 60 && profile.seo_eligibility_score < 75;
    if (scoreFilter === 'low') return profile.seo_eligibility_score < 60;

    return true;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>SEO Eligibility Dashboard</h1>
        <p>Monitor trust-first SEO eligibility across all profiles</p>
      </header>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div>Loading statistics...</div>
      ) : stats ? (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Total Profiles</h3>
            <div className={styles.statValue}>{stats.profiles.total.toLocaleString()}</div>
          </div>

          <div className={styles.statCard}>
            <h3>SEO Eligible</h3>
            <div className={styles.statValue}>{stats.profiles.eligible.toLocaleString()}</div>
            <div className={styles.statSubtext}>
              {(stats.profiles.eligibility_rate * 100).toFixed(1)}% of total
            </div>
          </div>

          <div className={styles.statCard}>
            <h3>High Trust (80+)</h3>
            <div className={styles.statValue}>{stats.profiles.by_score_range.high_trust.toLocaleString()}</div>
          </div>

          <div className={styles.statCard}>
            <h3>Trusted (75-79)</h3>
            <div className={styles.statValue}>{stats.profiles.by_score_range.trusted.toLocaleString()}</div>
          </div>

          <div className={styles.statCard}>
            <h3>Eligible Listings</h3>
            <div className={styles.statValue}>{stats.listings.from_eligible_providers.toLocaleString()}</div>
            <div className={styles.statSubtext}>
              {(stats.listings.eligibility_rate * 100).toFixed(1)}% of active listings
            </div>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Score Range:</label>
          <UnifiedSelect
            value={scoreFilter}
            onChange={(value) => setScoreFilter(String(value) as any)}
            options={[
              { value: 'all', label: 'All Scores' },
              { value: 'high', label: 'High Trust (80+)' },
              { value: 'trusted', label: 'Trusted (75-79)' },
              { value: 'moderate', label: 'Moderate (60-74)' },
              { value: 'low', label: 'Low (<60)' }
            ]}
            placeholder="Select score range"
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Role:</label>
          <UnifiedSelect
            value={roleFilter}
            onChange={(value) => setRoleFilter(String(value) as any)}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'tutor', label: 'Tutor' },
              { value: 'agent', label: 'Agent' },
              { value: 'client', label: 'Client' }
            ]}
            placeholder="Select role"
          />
        </div>

        <div className={styles.filterGroup}>
          <label>
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={(e) => setEligibleOnly(e.target.checked)}
            />
            Eligible Only
          </label>
        </div>
      </div>

      {/* Profiles Table */}
      {profilesLoading ? (
        <div>Loading profiles...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile: EligibleProfile) => (
                <tr key={profile.id}>
                  <td>{profile.full_name}</td>
                  <td>
                    <span className={styles.roleBadge}>{profile.role}</span>
                  </td>
                  <td>
                    <div className={styles.scoreCell}>
                      <div className={styles.scoreBar}>
                        <div
                          className={styles.scoreProgress}
                          style={{
                            width: `${profile.seo_eligibility_score}%`,
                            backgroundColor:
                              profile.seo_eligibility_score >= 80
                                ? '#10b981'
                                : profile.seo_eligibility_score >= 75
                                  ? '#3b82f6'
                                  : profile.seo_eligibility_score >= 60
                                    ? '#f59e0b'
                                    : '#ef4444',
                          }}
                        />
                      </div>
                      <span className={styles.scoreValue}>{profile.seo_eligibility_score}/100</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        profile.seo_eligible ? styles.eligible : styles.notEligible
                      }`}
                    >
                      {profile.seo_eligible ? 'Indexed' : 'No Index'}
                    </span>
                  </td>
                  <td>
                    <a
                      href={profile.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.viewButton}
                    >
                      View Profile
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProfiles.length === 0 && (
            <div className={styles.emptyState}>
              <p>No profiles match the current filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
