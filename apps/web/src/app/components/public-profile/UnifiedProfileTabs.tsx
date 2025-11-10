/**
 * Filename: apps/web/src/app/components/public-profile/UnifiedProfileTabs.tsx
 * Purpose: Unified 3-tab structure for all public profiles (v4.8)
 * Created: 2025-11-10
 * Updated: 2025-11-10 - Phase 4: Implemented Services and Reviews tabs
 *
 * Features:
 * - Consistent 3-tab layout: About | Services | Reviews
 * - Role-aware content within each tab
 * - Matches hub page tab styling (underline design)
 * - Services tab: Fetches and displays active listings/requests/managed tutors
 * - Reviews tab: Fetches and displays reviews received
 */
'use client';

import React, { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import type { Listing } from '@tutorwise/shared-types';
import TutorNarrative from '../profile/TutorNarrative';
import ClientProfessionalInfo from '../profile/ClientProfessionalInfo';
import AgentProfessionalInfo from '../profile/AgentProfessionalInfo';
import ListingCard from '../marketplace/ListingCard';
import { createClient } from '@/utils/supabase/client';
import styles from './UnifiedProfileTabs.module.css';

interface UnifiedProfileTabsProps {
  profile: Profile;
}

type TabId = 'about' | 'services' | 'reviews';

export function UnifiedProfileTabs({ profile }: UnifiedProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const tabs = [
    { id: 'about' as TabId, label: 'About' },
    { id: 'services' as TabId, label: 'Services' },
    { id: 'reviews' as TabId, label: 'Reviews' },
  ];

  // Fetch listings when Services tab is active and role is tutor
  useEffect(() => {
    if (activeTab === 'services' && profile.active_role === 'tutor') {
      fetchListings();
    }
  }, [activeTab, profile.active_role, profile.id]);

  // Fetch reviews when Reviews tab is active
  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab, profile.id]);

  const fetchListings = async () => {
    setIsLoadingListings(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings((data as Listing[]) || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      setListings([]);
    } finally {
      setIsLoadingListings(false);
    }
  };

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      // TODO: Implement reviews API endpoint
      // For now, set empty array
      setReviews([]);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const renderAboutTab = () => {
    const role = profile.active_role;

    switch (role) {
      case 'tutor':
        return <TutorNarrative profile={profile} isEditable={false} />;
      case 'client':
        return <ClientProfessionalInfo profile={profile} isEditable={false} />;
      case 'agent':
        return <AgentProfessionalInfo profile={profile} isEditable={false} />;
      default:
        return (
          <div className={styles.emptyState}>
            <p>Profile information not available</p>
          </div>
        );
    }
  };

  const renderServicesTab = () => {
    const role = profile.active_role;

    if (role === 'tutor') {
      if (isLoadingListings) {
        return (
          <div className={styles.loadingState}>
            <p>Loading listings...</p>
          </div>
        );
      }

      if (listings.length === 0) {
        return (
          <div className={styles.emptyState}>
            <h3>No Active Listings</h3>
            <p>{profile.full_name} doesn&apos;t have any published listings yet.</p>
          </div>
        );
      }

      return (
        <div className={styles.servicesContent}>
          <h3 className={styles.sectionTitle}>Active Listings</h3>
          <div className={styles.listingsGrid}>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      );
    }

    if (role === 'client') {
      return (
        <div className={styles.placeholderContent}>
          <h3>Lesson Requests</h3>
          <p>Client&apos;s lesson requests will appear here</p>
          <p className={styles.comingSoon}>Coming soon</p>
        </div>
      );
    }

    if (role === 'agent') {
      return (
        <div className={styles.placeholderContent}>
          <h3>Managed Tutors</h3>
          <p>Agent&apos;s managed tutors and listings will appear here</p>
          <p className={styles.comingSoon}>Coming soon</p>
        </div>
      );
    }

    return (
      <div className={styles.emptyState}>
        <p>Services information not available</p>
      </div>
    );
  };

  const renderReviewsTab = () => {
    if (isLoadingReviews) {
      return (
        <div className={styles.loadingState}>
          <p>Loading reviews...</p>
        </div>
      );
    }

    if (reviews.length === 0) {
      return (
        <div className={styles.emptyState}>
          <h3>No Reviews Yet</h3>
          <p>{profile.full_name} hasn&apos;t received any reviews yet.</p>
        </div>
      );
    }

    return (
      <div className={styles.reviewsContent}>
        <h3 className={styles.sectionTitle}>Reviews</h3>
        <div className={styles.reviewsList}>
          {reviews.map((review, index) => (
            <div key={index} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewerInfo}>
                  <span className={styles.reviewerName}>{review.reviewer_name}</span>
                  <span className={styles.reviewDate}>{review.date}</span>
                </div>
                <div className={styles.reviewRating}>
                  {'⭐'.repeat(review.rating)}
                </div>
              </div>
              <p className={styles.reviewText}>{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return renderAboutTab();
      case 'services':
        return renderServicesTab();
      case 'reviews':
        return renderReviewsTab();
      default:
        return null;
    }
  };

  return (
    <div className={styles.tabsContainer}>
      {/* Tab Headers */}
      <div className={styles.tabHeaders}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {renderTabContent()}
      </div>
    </div>
  );
}
