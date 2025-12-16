/**
 * Filename: DelegationSettingsPanel.tsx
 * Purpose: Commission delegation settings UI for tutors/service providers
 * Created: 2025-12-16
 * Patent Reference: Section 7 (Commission Delegation Mechanism) - CORE NOVELTY
 * Migration: Original schema from v4.3, supports listings.delegate_commission_to_profile_id
 *
 * Features:
 * - List all active listings with delegation status
 * - Configure per-listing commission delegation
 * - Search/select partner agents by referral code
 * - Validate partner exists before saving
 * - Clear delegation to revert to normal commission flow
 * - Real-time preview of commission split impact
 *
 * Business Logic:
 * - When delegate_commission_to_profile_id IS NULL: Normal flow (agent earns £10)
 * - When delegate_commission_to_profile_id IS SET: Partner earns £10, agent earns £0
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
  Info,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './DelegationSettingsPanel.module.css';

interface Listing {
  id: string;
  title: string;
  type: 'listing' | 'product' | 'service';
  status: 'active' | 'inactive';
  delegate_commission_to_profile_id: string | null;
  delegated_partner?: {
    id: string;
    full_name: string;
    referral_code: string;
  } | null;
}

interface DelegationSettingsPanelProps {
  tutorId: string;
  className?: string;
}

export default function DelegationSettingsPanel({
  tutorId,
  className = '',
}: DelegationSettingsPanelProps) {
  const supabase = createClient();

  // State
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; code: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch tutor's listings
  useEffect(() => {
    async function fetchListings() {
      setLoading(true);

      const { data, error } = await supabase
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
            referral_code
          )
        `
        )
        .eq('profile_id', tutorId)
        .in('status', ['active', 'inactive']);

      if (!error && data) {
        setListings(
          data.map((listing: any) => ({
            id: listing.id,
            title: listing.title,
            type: listing.type,
            status: listing.status,
            delegate_commission_to_profile_id: listing.delegate_commission_to_profile_id,
            delegated_partner: listing.delegated_partner
              ? {
                  id: listing.delegated_partner.id,
                  full_name: listing.delegated_partner.full_name,
                  referral_code: listing.delegated_partner.referral_code,
                }
              : null,
          }))
        );
      }

      setLoading(false);
    }

    fetchListings();
  }, [tutorId, supabase]);

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
      .select('id, full_name, referral_code')
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

    setSearchResult({
      id: data.id,
      name: data.full_name || 'Unknown User',
      code: data.referral_code,
    });
  };

  // Set delegation for a listing
  const handleSetDelegation = async (listingId: string) => {
    if (!searchResult) return;

    setSaving(true);

    const { error } = await supabase
      .from('listings')
      .update({ delegate_commission_to_profile_id: searchResult.id })
      .eq('id', listingId);

    if (!error) {
      // Update local state
      setListings((prev) =>
        prev.map((listing) =>
          listing.id === listingId
            ? {
                ...listing,
                delegate_commission_to_profile_id: searchResult.id,
                delegated_partner: {
                  id: searchResult.id,
                  full_name: searchResult.name,
                  referral_code: searchResult.code,
                },
              }
            : listing
        )
      );
      setEditingListingId(null);
      setSearchCode('');
      setSearchResult(null);
    }

    setSaving(false);
  };

  // Clear delegation for a listing
  const handleClearDelegation = async (listingId: string) => {
    setSaving(true);

    const { error } = await supabase
      .from('listings')
      .update({ delegate_commission_to_profile_id: null })
      .eq('id', listingId);

    if (!error) {
      // Update local state
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
    return (
      <div className={`${styles.panel} ${className}`}>
        <div className={styles.loading}>Loading delegation settings...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Building2 size={24} />
          Commission Delegation Settings
        </h2>
        <div className={styles.subtitle}>
          Redirect referral commissions from specific listings to your partners
        </div>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <Info size={20} />
        <div className={styles.infoContent}>
          <strong>How Commission Delegation Works (Patent Section 7):</strong>
          <ul>
            <li>
              <strong>Normal Flow:</strong> When someone books your listing via a referral, the referring agent
              earns £10 commission.
            </li>
            <li>
              <strong>Delegated Flow:</strong> When delegation is enabled for a listing, your chosen partner earns
              the £10 commission instead of the original referring agent.
            </li>
            <li>
              <strong>Use Case:</strong> Partner with marketing agencies, affiliate networks, or business partners
              who promote your services.
            </li>
          </ul>
        </div>
      </div>

      {/* Listings */}
      {listings.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={48} />
          <p>You don&apos;t have any listings yet.</p>
          <p className={styles.emptySubtext}>Create a listing to enable commission delegation.</p>
        </div>
      ) : (
        <div className={styles.listingsList}>
          {listings.map((listing) => (
            <div key={listing.id} className={styles.listingCard}>
              {/* Listing Header */}
              <div className={styles.listingHeader}>
                <div className={styles.listingInfo}>
                  <div className={styles.listingTitle}>{listing.title}</div>
                  <div className={styles.listingMeta}>
                    {listing.type} • {listing.status}
                  </div>
                </div>
                <div className={styles.listingStatus}>
                  {listing.delegate_commission_to_profile_id ? (
                    <div className={styles.delegatedBadge}>
                      <UserCheck size={16} />
                      Delegated
                    </div>
                  ) : (
                    <div className={styles.normalBadge}>Normal Flow</div>
                  )}
                </div>
              </div>

              {/* Current Delegation */}
              {listing.delegated_partner && (
                <div className={styles.currentDelegation}>
                  <div className={styles.partnerInfo}>
                    <UserCheck size={18} />
                    <div>
                      <div className={styles.partnerName}>{listing.delegated_partner.full_name}</div>
                      <div className={styles.partnerCode}>
                        Code: {listing.delegated_partner.referral_code}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClearDelegation(listing.id)}
                    className={styles.clearButton}
                    disabled={saving}
                  >
                    <X size={16} />
                    Clear
                  </button>
                </div>
              )}

              {/* Edit Mode */}
              {editingListingId === listing.id ? (
                <div className={styles.editSection}>
                  {/* Search Box */}
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

                  {/* Search Error */}
                  {searchError && (
                    <div className={styles.errorMessage}>
                      <AlertCircle size={16} />
                      {searchError}
                    </div>
                  )}

                  {/* Search Result */}
                  {searchResult && (
                    <div className={styles.searchResult}>
                      <div className={styles.resultInfo}>
                        <Check size={18} className={styles.checkIcon} />
                        <div>
                          <div className={styles.resultName}>{searchResult.name}</div>
                          <div className={styles.resultCode}>Code: {searchResult.code}</div>
                        </div>
                      </div>
                      <div className={styles.resultActions}>
                        <button
                          onClick={() => handleSetDelegation(listing.id)}
                          className={styles.confirmButton}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Confirm Delegation'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingListingId(null);
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

                  {/* Commission Impact Preview */}
                  {searchResult && (
                    <div className={styles.impactPreview}>
                      <DollarSign size={18} />
                      <div className={styles.impactContent}>
                        <strong>Commission Impact:</strong>
                        <div className={styles.impactComparison}>
                          <div className={styles.impactBefore}>
                            <TrendingDown size={16} />
                            Original Agent: <span className={styles.strikethrough}>£10</span> → £0
                          </div>
                          <div className={styles.impactAfter}>
                            <UserCheck size={16} />
                            {searchResult.name}: £0 → <span className={styles.highlight}>£10</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Edit Button
                !listing.delegated_partner && (
                  <button
                    onClick={() => setEditingListingId(listing.id)}
                    className={styles.editButton}
                  >
                    <UserCheck size={16} />
                    Enable Delegation
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
