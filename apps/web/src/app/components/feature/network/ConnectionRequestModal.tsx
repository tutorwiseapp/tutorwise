/**
 * Filename: apps/web/src/app/components/feature/network/ConnectionRequestModal.tsx
 * Purpose: Modal for sending connection requests or email invitations
 * Created: 2025-11-07
 * Updated: 2025-01-21 - Added accessibility improvements and type safety
 * Specification: SDD v4.5, Section 4.3
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './ConnectionRequestModal.module.css';

interface SearchResult {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface ConnectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConnectionRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: ConnectionRequestModalProps) {
  const [mode, setMode] = useState<'search' | 'email'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `/api/profiles/search?q=${encodeURIComponent(searchQuery)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.profiles || []);
      } else {
        toast.error('Search failed');
      }
    } catch (error) {
      toast.error('Search error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleSendRequests = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/network/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_ids: Array.from(selectedUsers),
          message: message.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Sent ${data.count} connection request(s)`);
        onSuccess();
        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send requests');
      }
    } catch (error) {
      toast.error('Failed to send requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvites = async () => {
    const emails = emailInput
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e);

    if (emails.length === 0) {
      toast.error('Please enter at least one email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email(s): ${invalidEmails.join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/network/invite-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Invitations sent');
        onSuccess();
        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send invitations');
      }
    } catch (error) {
      toast.error('Failed to send invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setEmailInput('');
    setMessage('');
    setSearchResults([]);
    setSelectedUsers(new Set());
    setHasSearched(false);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Connect with Others</h2>
          <button onClick={handleClose} className={styles.closeButton} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className={styles.tabs}>
          <button
            onClick={() => setMode('search')}
            className={`${styles.tab} ${mode === 'search' ? styles.tabActive : ''}`}
          >
            Search Users
          </button>
          <button
            onClick={() => setMode('email')}
            className={`${styles.tab} ${mode === 'email' ? styles.tabActive : ''}`}
          >
            Invite by Email
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {mode === 'search' && (
            <>
              {/* Search Input */}
              <div className={styles.searchBox}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name or email..."
                  className={styles.input}
                />
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className={styles.searchButton}
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className={styles.results}>
                  {searchResults.map((user) => (
                    <label key={user.id} className={styles.userItem}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className={styles.checkbox}
                      />
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{user.full_name}</span>
                        <span className={styles.userEmail}>{user.email}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {hasSearched && searchResults.length === 0 && !isLoading && (
                <div className={styles.emptyState}>
                  <p className={styles.emptyStateText}>
                    No users found matching "{searchQuery}"
                  </p>
                  <p className={styles.emptyStateHint}>
                    Try searching by name or email address
                  </p>
                </div>
              )}

              {/* Message */}
              <div className={styles.messageBox}>
                <label className={styles.label}>
                  Add a message (optional):
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="I'd like to connect..."
                  maxLength={500}
                  rows={3}
                  className={styles.textarea}
                />
                <span className={styles.charCount}>{message.length}/500</span>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendRequests}
                disabled={isLoading || selectedUsers.size === 0}
                className={styles.sendButton}
              >
                {isLoading
                  ? 'Sending...'
                  : `Send Request${selectedUsers.size !== 1 ? 's' : ''} (${selectedUsers.size})`}
              </button>
            </>
          )}

          {mode === 'email' && (
            <>
              {/* Email Input */}
              <div className={styles.emailBox}>
                <label className={styles.label}>
                  Enter email addresses (comma or newline separated):
                </label>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="friend@example.com, colleague@example.com"
                  rows={5}
                  className={styles.textarea}
                />
                <p className={styles.hint}>
                  Existing users will receive connection requests.
                  New users will receive invitation emails with your referral link.
                </p>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendInvites}
                disabled={isLoading}
                className={styles.sendButton}
              >
                {isLoading ? 'Sending...' : 'Send Invitations'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
