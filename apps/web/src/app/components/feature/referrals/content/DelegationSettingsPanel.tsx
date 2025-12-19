/**
 * Filename: DelegationSettingsPanel.tsx
 * Purpose: Hierarchical commission delegation settings UI (Patent Section 7.2, 7.3)
 * Created: 2025-12-16
 * Updated: 2025-12-18 - Added hierarchical delegation (profile + listing levels)
 * Patent Reference: Section 7 (Commission Delegation Mechanism) - CORE NOVELTY
 * Migration: 129 (profile-level), 130 (hierarchical resolution)
 *
 * Features:
 * - Profile-level default delegation (applies to all listings)
 * - Listing-specific delegation overrides (highest precedence)
 * - Hierarchical resolution visualization
 * - Search/select partner agents by referral code
 * - Validate partner exists before saving
 * - Clear delegation to revert to normal commission flow
 * - Pagination for large listing counts
 *
 * Hierarchical Logic (Patent Section 7.3):
 * Level 1: Listing-specific delegation (highest precedence)
 * Level 2: Profile-level default delegation (fallback)
 * Level 3: Original referral attribution (base case)
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  UserCheck,
  Search,
  X,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import type { DetailField } from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import HubPagination from '@/app/components/hub/layout/HubPagination';
import Button from '@/app/components/ui/actions/Button';
import DelegationSearchModal from './DelegationSearchModal';
import styles from './DelegationSettingsPanel.module.css';

interface PartnerProfile {
  id: string;
  full_name: string;
  referral_code: string;
  profile_picture_url?: string | null;
}

interface Listing {
  id: string;
  title: string;
  type: 'listing' | 'product' | 'service';
  status: 'active' | 'inactive';
  delegate_commission_to_profile_id: string | null;
  delegated_partner?: PartnerProfile | null;
}

interface DelegationSettingsPanelProps {
  tutorId: string;
  className?: string;
  onStatsUpdate?: (stats: {
    profileDefaultSet: boolean;
    totalListings: number;
    listingsWithOverrides: number;
    listingsUsingDefault: number;
  }) => void;
}

const ITEMS_PER_PAGE = 4;

export default function DelegationSettingsPanel({
  tutorId,
  className = '',
  onStatsUpdate,
}: DelegationSettingsPanelProps) {
  const supabase = createClient();

  // State
  const [listings, setListings] = useState<Listing[]>([]);
  const [profileDefaultPartner, setProfileDefaultPartner] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'profile' | 'listing'>('profile');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedListingTitle, setSelectedListingTitle] = useState<string>('');

  // Fetch profile default delegation + tutor's listings
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch profile with default delegation partner
      const { data: profileData } = await supabase
        .from('profiles')
        .select(
          `
          id,
          default_commission_delegate_id,
          default_partner:default_commission_delegate_id (
            id,
            full_name,
            referral_code,
            profile_picture_url
          )
        `
        )
        .eq('id', tutorId)
        .single();

      if (profileData?.default_partner && !Array.isArray(profileData.default_partner)) {
        setProfileDefaultPartner(profileData.default_partner as PartnerProfile);
      }

      // Fetch listings with delegation partners
      const { data: listingsData } = await supabase
        .from('listings')
        .select(
          `
          id,
          title,
          type,
          status,
          delegate_commission_to_profile_id,
          delegated_partner:delegate_commission_to_profile_id (
            id,
            full_name,
            referral_code,
            profile_picture_url
          )
        `
        )
        .eq('profile_id', tutorId)
        .in('status', ['active', 'inactive'])
        .order('created_at', { ascending: false });

      if (listingsData) {
        setListings(
          listingsData.map((listing: any) => ({
            id: listing.id,
            title: listing.title,
            type: listing.type,
            status: listing.status,
            delegate_commission_to_profile_id: listing.delegate_commission_to_profile_id,
            delegated_partner: listing.delegated_partner as PartnerProfile | null,
          }))
        );
      }

      setLoading(false);
    }

    fetchData();
  }, [tutorId, supabase]);

  // Calculate how many listings use profile default vs have overrides
  const listingsUsingDefault = listings.filter(l => !l.delegate_commission_to_profile_id).length;
  const listingsWithOverrides = listings.filter(l => l.delegate_commission_to_profile_id).length;

  // Update parent stats whenever they change
  useEffect(() => {
    if (onStatsUpdate && !loading) {
      onStatsUpdate({
        profileDefaultSet: !!profileDefaultPartner,
        totalListings: listings.length,
        listingsWithOverrides,
        listingsUsingDefault,
      });
    }
  }, [profileDefaultPartner, listings.length, listingsWithOverrides, listingsUsingDefault, loading, onStatsUpdate]);

  // Pagination
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedListings = listings.slice(startIndex, endIndex);
  const totalPages = Math.ceil(listings.length / ITEMS_PER_PAGE);

  // Modal handlers
  const handleOpenProfileModal = () => {
    setModalMode('profile');
    setSelectedListingId(null);
    setSelectedListingTitle('');
    setModalOpen(true);
  };

  const handleOpenListingModal = (listingId: string, listingTitle: string) => {
    setModalMode('listing');
    setSelectedListingId(listingId);
    setSelectedListingTitle(listingTitle);
    setModalOpen(true);
  };

  const handleConfirmProfileDelegation = async (partner: PartnerProfile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ default_commission_delegate_id: partner.id })
      .eq('id', tutorId);

    if (!error) {
      setProfileDefaultPartner(partner);
    }
  };

  const handleConfirmListingDelegation = async (partner: PartnerProfile) => {
    if (!selectedListingId) return;

    const { error } = await supabase
      .from('listings')
      .update({ delegate_commission_to_profile_id: partner.id })
      .eq('id', selectedListingId);

    if (!error) {
      setListings((prev) =>
        prev.map((listing) =>
          listing.id === selectedListingId
            ? {
                ...listing,
                delegate_commission_to_profile_id: partner.id,
                delegated_partner: partner,
              }
            : listing
        )
      );
    }
  };

  // Clear profile-level default delegation
  const handleClearProfileDefault = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ default_commission_delegate_id: null })
      .eq('id', tutorId);

    if (!error) {
      setProfileDefaultPartner(null);
    }
  };

  // Clear delegation for a specific listing
  const handleClearListingDelegation = async (listingId: string) => {
    const { error } = await supabase
      .from('listings')
      .update({ delegate_commission_to_profile_id: null })
      .eq('id', listingId);

    if (!error) {
      setListings((prev) =>
        prev.map((listing) =>
          listing.id === listingId
            ? { ...listing, delegate_commission_to_profile_id: null, delegated_partner: null }
            : listing
        )
      );
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading delegation settings...</div>;
  }

  return (
    <>
      {/* PROFILE-LEVEL DEFAULT DELEGATION */}
      <div className={styles.section}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#1a202c' }}>
          Profile Default Delegation
        </h3>

        {profileDefaultPartner ? (
          <HubDetailCard
            image={{
              src: profileDefaultPartner.profile_picture_url || null,
              alt: profileDefaultPartner.full_name,
              fallbackChar: profileDefaultPartner.full_name.substring(0, 2).toUpperCase(),
            }}
            title="Default Partner"
            status={{ label: 'Active', variant: 'success' }}
            description={`All new bookings will delegate commission to ${profileDefaultPartner.full_name} (unless listing override is set)`}
            details={[
              { label: 'Partner Name', value: profileDefaultPartner.full_name },
              { label: 'Referral Code', value: profileDefaultPartner.referral_code },
              { label: 'Applies To', value: `${listingsUsingDefault} listing${listingsUsingDefault !== 1 ? 's' : ''}` },
              { label: 'Overridden By', value: `${listingsWithOverrides} listing${listingsWithOverrides !== 1 ? 's' : ''}` },
            ]}
            actions={
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenProfileModal}
                >
                  <Search size={16} />
                  Change Partner
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleClearProfileDefault}
                >
                  <X size={16} />
                  Clear Default
                </Button>
              </div>
            }
          />
        ) : (
          <HubDetailCard
            image={{
              src: null,
              alt: 'No default partner',
              fallbackChar: '?',
            }}
            title="No Default Partner Set"
            status={{ label: 'Not Configured', variant: 'neutral' }}
            description="Set a default partner to automatically delegate commission from ALL your listings"
            details={[
              { label: 'Status', value: 'Not configured' },
              { label: 'Applies To', value: 'None' },
              { label: 'Benefit', value: 'Automatic delegation for all future bookings' },
            ]}
            actions={
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenProfileModal}
              >
                Set Default Partner
              </Button>
            }
          />
        )}
      </div>

      {/* LISTING-SPECIFIC OVERRIDES */}
      <div className={styles.section}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#1a202c', marginTop: '32px' }}>
          Listing-Specific Overrides {listingsWithOverrides > 0 && `(${listingsWithOverrides})`}
        </h3>

        {listings.length === 0 ? (
          <HubEmptyState
            icon={<Building2 size={48} />}
            title="No Listings Yet"
            description="Create a listing to enable commission delegation and start managing your referral partnerships."
            actionLabel="Create Your First Listing"
            onAction={() => window.location.href = '/create-listing'}
          />
        ) : (
          <>
            {paginatedListings.map((listing) => {
              const effectivePartner = listing.delegated_partner || profileDefaultPartner;
              const hasOverride = !!listing.delegate_commission_to_profile_id;

              return (
                <div key={listing.id} style={{ marginBottom: '16px' }}>
                  <HubDetailCard
                    image={{
                      src: effectivePartner?.profile_picture_url || null,
                      alt: listing.title,
                      fallbackChar: listing.title.substring(0, 2).toUpperCase(),
                    }}
                    title={listing.title}
                    status={
                      hasOverride
                        ? { label: 'Override Active', variant: 'info' }
                        : profileDefaultPartner
                        ? { label: 'Using Default', variant: 'success' }
                        : { label: 'Normal Flow', variant: 'neutral' }
                    }
                    description={`${listing.type} • ${listing.status}`}
                    details={[
                      {
                        label: 'Commission Recipient',
                        value: effectivePartner
                          ? `${effectivePartner.full_name} (${effectivePartner.referral_code})`
                          : 'Your original referrer',
                      },
                      {
                        label: 'Delegation Level',
                        value: hasOverride
                          ? 'Listing Override (Level 1)'
                          : profileDefaultPartner
                          ? 'Profile Default (Level 2)'
                          : 'Original Attribution (Level 3)',
                      },
                      {
                        label: 'Status',
                        value: listing.status,
                      },
                    ]}
                    actions={
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {hasOverride ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenListingModal(listing.id, listing.title)}
                            >
                              <Search size={16} />
                              Change Override
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleClearListingDelegation(listing.id)}
                            >
                              <X size={16} />
                              Clear Override
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenListingModal(listing.id, listing.title)}
                          >
                            <UserCheck size={16} />
                            Set Override
                          </Button>
                        )}
                      </div>
                    }
                  />
                </div>
              );
            })}

          </>
        )}
      </div>

      {/* Pagination - Always show for consistent spacing */}
      <div className={styles.paginationContainer}>
        <HubPagination
          currentPage={1}
          totalItems={Math.max(listings.length, 1)}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Delegation Search Modal */}
      <DelegationSearchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={modalMode === 'profile' ? handleConfirmProfileDelegation : handleConfirmListingDelegation}
        mode={modalMode}
        listingTitle={selectedListingTitle}
      />
    </>
  );
}
