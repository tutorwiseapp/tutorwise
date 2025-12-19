/**
 * Filename: DelegationSearchModal.tsx
 * Purpose: Modal for searching and setting commission delegation partners
 * Created: 2025-12-18
 */

'use client';

import React, { useState } from 'react';
import { Search, AlertCircle, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './DelegationSearchModal.module.css';

interface PartnerProfile {
  id: string;
  full_name: string;
  referral_code: string;
  avatar_url?: string | null;
}

interface DelegationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (partner: PartnerProfile) => Promise<void>;
  mode: 'profile' | 'listing';
  listingTitle?: string;
}

export default function DelegationSearchModal({
  isOpen,
  onClose,
  onConfirm,
  mode,
  listingTitle,
}: DelegationSearchModalProps) {
  const [searchCode, setSearchCode] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<PartnerProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchCode.trim()) {
      setSearchError('Please enter a referral code');
      return;
    }

    setSearchError(null);
    setSearchResult(null);
    setIsSearching(true);

    try {
      const response = await fetch(`/api/profiles/search-by-referral-code?code=${encodeURIComponent(searchCode.trim())}`);

      if (!response.ok) {
        const errorData = await response.json();
        setSearchError(errorData.error || 'Failed to search for referral code');
        return;
      }

      const { profile } = await response.json();

      if (!profile) {
        setSearchError('Referral code not found');
        return;
      }

      setSearchResult(profile as PartnerProfile);
    } catch (err) {
      console.error('[DelegationSearchModal] Exception during search:', err);
      setSearchError(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = async () => {
    if (!searchResult) return;

    setIsSaving(true);
    try {
      await onConfirm(searchResult);
      handleClose();
    } catch (error) {
      toast.error('Failed to set delegation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSearchCode('');
    setSearchError(null);
    setSearchResult(null);
    onClose();
  };

  const modalTitle = mode === 'profile'
    ? 'Set Default Delegation Partner'
    : `Set Delegation for "${listingTitle}"`;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{modalTitle}</h2>
          <button onClick={handleClose} className={styles.closeButton} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p className={styles.description}>
            {mode === 'profile'
              ? 'Search for a partner by their referral code to delegate commissions from all your listings.'
              : 'Search for a partner by their referral code to delegate commissions for this specific listing.'}
          </p>

          {/* Search Box */}
          <div className={styles.searchBox}>
            <div className={styles.searchInput}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Enter partner's referral code (e.g., ABC123)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={styles.input}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchCode.trim() || isSearching}
              className={styles.searchButton}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Error Message */}
          {searchError && (
            <div className={styles.errorMessage}>
              <AlertCircle size={18} />
              <span>{searchError}</span>
            </div>
          )}

          {/* Search Result */}
          {searchResult && (
            <div className={styles.searchResult}>
              <div className={styles.resultInfo}>
                <Check size={20} className={styles.checkIcon} />
                <div className={styles.resultDetails}>
                  <div className={styles.resultName}>{searchResult.full_name}</div>
                  <div className={styles.resultCode}>Referral Code: {searchResult.referral_code}</div>
                </div>
              </div>

              <div className={styles.resultActions}>
                <button
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className={styles.confirmButton}
                >
                  {isSaving ? 'Setting...' : mode === 'profile' ? 'Set as Default Partner' : 'Set Listing Override'}
                </button>
                <button onClick={() => setSearchResult(null)} className={styles.cancelButton}>
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
