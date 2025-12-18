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
  AlertCircle,
  Search,
  X,
  Check,
  Users,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import type { DetailField } from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import HubPagination from '@/app/components/hub/layout/HubPagination';
import Button from '@/app/components/ui/actions/Button';
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
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<PartnerProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<'profile' | string | null>(null); // 'profile' or listing ID
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Search for partner by referral code
  const handleSearchCode = async () => {
    if (!searchCode.trim()) {
      setSearchError('Please enter a referral code');
      return;
    }

    setSearchError(null);
    setSearchResult(null);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, referral_code, profile_picture_url')
      .eq('referral_code', searchCode.toUpperCase())
      .single();

    if (error || !data) {
      setSearchError('Referral code not found. Please check and try again.');
      return;
    }

    if (data.id === tutorId) {
      setSearchError('You cannot delegate commissions to yourself.');
      return;
    }

    setSearchResult(data as PartnerProfile);
  };

  // Set profile-level default delegation
  const handleSetProfileDefault = async () => {
    if (!searchResult) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ default_commission_delegate_id: searchResult.id })
      .eq('id', tutorId);

    if (!error) {
      setProfileDefaultPartner(searchResult);
      setEditingTarget(null);
      setSearchCode('');
      setSearchResult(null);
    }

    setSaving(false);
  };

  // Clear profile-level default delegation
  const handleClearProfileDefault = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ default_commission_delegate_id: null })
      .eq('id', tutorId);

    if (!error) {
      setProfileDefaultPartner(null);
    }

    setSaving(false);
  };

  // Set delegation for a specific listing
  const handleSetListingDelegation = async (listingId: string) => {
    if (!searchResult) return;

    setSaving(true);

    const { error } = await supabase
      .from('listings')
      .update({ delegate_commission_to_profile_id: searchResult.id })
      .eq('id', listingId);

    if (!error) {
      setListings((prev) =>
        prev.map((listing) =>
          listing.id === listingId
            ? {
                ...listing,
                delegate_commission_to_profile_id: searchResult.id,
                delegated_partner: searchResult,
              }
            : listing
        )
      );
      setEditingTarget(null);
      setSearchCode('');
      setSearchResult(null);
    }

    setSaving(false);
  };

  // Clear delegation for a specific listing
  const handleClearListingDelegation = async (listingId: string) => {
    setSaving(true);

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

    setSaving(false);
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
                  onClick={() => setEditingTarget('profile')}
                  disabled={saving || editingTarget === 'profile'}
                >
                  <Search size={16} />
                  Change Partner
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleClearProfileDefault}
                  disabled={saving}
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
                onClick={() => setEditingTarget('profile')}
                disabled={saving || editingTarget === 'profile'}
              >
                <Users size={16} />
                Set Default Partner
              </Button>
            }
          />
        )}

        {/* Profile-Level Edit Mode */}
        {editingTarget === 'profile' && (
          <div className={styles.editSection} style={{ marginTop: '12px' }}>
            <div className={styles.searchBox}>
              <div className={styles.searchInput}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Enter partner's referral code (e.g., ABC123)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchCode()}
                />
              </div>
              <button onClick={handleSearchCode} className={styles.searchButton}>
                Search
              </button>
            </div>

            {searchError && (
              <div className={styles.errorMessage}>
                <AlertCircle size={16} />
                {searchError}
              </div>
            )}

            {searchResult && (
              <div className={styles.searchResult}>
                <div className={styles.resultInfo}>
                  <Check size={18} className={styles.checkIcon} />
                  <div>
                    <div className={styles.resultName}>{searchResult.full_name}</div>
                    <div className={styles.resultCode}>Code: {searchResult.referral_code}</div>
                  </div>
                </div>
                <div className={styles.resultActions}>
                  <button
                    onClick={handleSetProfileDefault}
                    className={styles.confirmButton}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Set as Default'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingTarget(null);
                      setSearchCode('');
                      setSearchResult(null);
                      setSearchError(null);
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
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
                              onClick={() => setEditingTarget(listing.id)}
                              disabled={saving || editingTarget === listing.id}
                            >
                              <Search size={16} />
                              Change Override
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleClearListingDelegation(listing.id)}
                              disabled={saving}
                            >
                              <X size={16} />
                              Clear Override
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingTarget(listing.id)}
                            disabled={saving || editingTarget === listing.id}
                          >
                            <UserCheck size={16} />
                            Set Override
                          </Button>
                        )}
                      </div>
                    }
                  />

                  {/* Listing-Level Edit Mode */}
                  {editingTarget === listing.id && (
                    <div className={styles.editSection} style={{ marginTop: '12px' }}>
                      <div className={styles.searchBox}>
                        <div className={styles.searchInput}>
                          <Search size={18} />
                          <input
                            type="text"
                            placeholder="Enter partner's referral code (e.g., ABC123)"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchCode()}
                          />
                        </div>
                        <button onClick={handleSearchCode} className={styles.searchButton}>
                          Search
                        </button>
                      </div>

                      {searchError && (
                        <div className={styles.errorMessage}>
                          <AlertCircle size={16} />
                          {searchError}
                        </div>
                      )}

                      {searchResult && (
                        <div className={styles.searchResult}>
                          <div className={styles.resultInfo}>
                            <Check size={18} className={styles.checkIcon} />
                            <div>
                              <div className={styles.resultName}>{searchResult.full_name}</div>
                              <div className={styles.resultCode}>Code: {searchResult.referral_code}</div>
                            </div>
                          </div>
                          <div className={styles.resultActions}>
                            <button
                              onClick={() => handleSetListingDelegation(listing.id)}
                              className={styles.confirmButton}
                              disabled={saving}
                            >
                              {saving ? 'Saving...' : 'Set Override'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingTarget(null);
                                setSearchCode('');
                                setSearchResult(null);
                                setSearchError(null);
                              }}
                              className={styles.cancelButton}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
    </>
  );
}
