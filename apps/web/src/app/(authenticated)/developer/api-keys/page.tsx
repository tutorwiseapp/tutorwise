/**
 * Filename: apps/web/src/app/(authenticated)/developer/api-keys/page.tsx
 * Purpose: API Keys management page for Platform API access
 * Created: 2025-12-16
 *
 * Features:
 * - List all API keys
 * - Generate new API keys
 * - Revoke existing keys
 * - View usage statistics
 * - Copy keys to clipboard
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import DeveloperStatsWidget from '@/app/components/feature/developer/DeveloperStatsWidget';
import DeveloperHelpWidget from '@/app/components/feature/developer/DeveloperHelpWidget';
import DeveloperTipWidget from '@/app/components/feature/developer/DeveloperTipWidget';
import DeveloperVideoWidget from '@/app/components/feature/developer/DeveloperVideoWidget';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

type FilterType = 'all' | 'active' | 'revoked' | 'expired';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  description: string | null;
  scopes: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  total_requests: number;
  created_at: string;
  revoked_at: string | null;
}

export default function ApiKeysPage() {
  const { profile } = useUserProfile();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{
    api_key?: string;
    key_prefix?: string;
    scopes?: string[];
  } | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  // Load API keys
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/developer/api-keys');
      if (!response.ok) throw new Error('Failed to load API keys');

      const data = await response.json();
      setApiKeys(data.api_keys || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      alert('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = () => {
    setShowCreateModal(true);
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke "${keyName}"?\n\nThis action cannot be undone. Any applications using this key will immediately lose access.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/developer/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revoke API key');
      }

      alert('API key revoked successfully');
      loadApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      alert('Failed to revoke API key');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getKeyStatus = (key: ApiKey): string => {
    if (key.revoked_at) return 'Revoked';
    if (key.expires_at && new Date(key.expires_at) < new Date())
      return 'Expired';
    if (!key.is_active) return 'Inactive';
    return 'Active';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Active':
        return styles.statusActive;
      case 'Revoked':
        return styles.statusRevoked;
      case 'Expired':
        return styles.statusExpired;
      default:
        return styles.statusInactive;
    }
  };

  // Filter keys based on tab selection
  const filteredKeys = useMemo(() => {
    return apiKeys.filter(key => {
      const status = getKeyStatus(key);
      if (filter === 'all') return true;
      if (filter === 'active') return status === 'Active';
      if (filter === 'revoked') return status === 'Revoked';
      if (filter === 'expired') return status === 'Expired';
      return true;
    });
  }, [apiKeys, filter]);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    return {
      all: apiKeys.length,
      active: apiKeys.filter(k => getKeyStatus(k) === 'Active').length,
      revoked: apiKeys.filter(k => getKeyStatus(k) === 'Revoked').length,
      expired: apiKeys.filter(k => getKeyStatus(k) === 'Expired').length,
    };
  }, [apiKeys]);

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Developer"
          actions={
            <Button onClick={handleCreateKey} variant="primary" size="sm">
              Generate New Key
            </Button>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Keys', count: tabCounts.all, active: filter === 'all' },
            { id: 'active', label: 'Active', count: tabCounts.active, active: filter === 'active' },
            { id: 'revoked', label: 'Revoked', count: tabCounts.revoked, active: filter === 'revoked' },
            { id: 'expired', label: 'Expired', count: tabCounts.expired, active: filter === 'expired' },
          ]}
          onTabChange={(tabId) => setFilter(tabId as FilterType)}
        />
      }
      sidebar={
        <HubSidebar>
          <DeveloperStatsWidget apiKeys={apiKeys} isLoading={isLoading} />
          <DeveloperHelpWidget />
          <DeveloperTipWidget />
          <DeveloperVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {/* API Keys List */}
        <div className={styles.keysSection}>
          {isLoading ? (
            <div className={styles.loading}>Loading API keys...</div>
          ) : filteredKeys.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No API keys yet</h3>
              <p>Generate your first API key to start using the Platform API</p>
              <Button onClick={handleCreateKey} variant="primary" size="md">
                Generate API Key
              </Button>
            </div>
          ) : (
            <div className={styles.keysList}>
              {filteredKeys.map((key) => {
                const status = getKeyStatus(key);
                return (
                  <div key={key.id} className={styles.keyCard}>
                    <div className={styles.keyHeader}>
                      <div className={styles.keyInfo}>
                        <h3>{key.name}</h3>
                        {key.description && (
                          <p className={styles.keyDescription}>{key.description}</p>
                        )}
                      </div>
                      <div className={styles.keyActions}>
                        <span className={`${styles.statusBadge} ${getStatusColor(status)}`}>
                          {status}
                        </span>
                        {status === 'Active' && (
                          <Button
                            onClick={() => handleRevokeKey(key.id, key.name)}
                            variant="danger"
                            size="sm"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className={styles.keyDetails}>
                      <div className={styles.keyMeta}>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Key Prefix:</span>
                          <code className={styles.keyPrefix}>{key.key_prefix}...</code>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Created:</span>
                          <span>{formatDate(key.created_at)}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Last Used:</span>
                          <span>{formatDateTime(key.last_used_at)}</span>
                        </div>
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Requests:</span>
                          <span>{key.total_requests.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className={styles.scopesSection}>
                        <span className={styles.metaLabel}>Scopes:</span>
                        <div className={styles.scopesList}>
                          {key.scopes.map((scope) => (
                            <span key={scope} className={styles.scopeBadge}>
                              {scope}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Key Modal */}
        {showCreateModal && (
          <CreateKeyModal
            onClose={() => {
              setShowCreateModal(false);
              setNewKeyData(null);
            }}
            onSuccess={(data) => {
              setNewKeyData(data);
              loadApiKeys();
            }}
            newKeyData={newKeyData}
          />
        )}
      </div>
    </HubPageLayout>
  );
}

// Create Key Modal Component
interface CreateKeyModalProps {
  onClose: () => void;
  onSuccess: (data: { api_key: string; key_prefix: string; scopes: string[] }) => void;
  newKeyData: { api_key?: string; key_prefix?: string; scopes?: string[] } | null;
}

function CreateKeyModal({ onClose, onSuccess, newKeyData }: CreateKeyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scopes: [
      'referrals:read',
      'referrals:write',
      'tutors:search',
      'caas:read',
      'profiles:read',
      'bookings:read',
    ],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const availableScopes = [
    { id: 'referrals:read', label: 'Read referral statistics', category: 'Referrals' },
    { id: 'referrals:write', label: 'Create referrals', category: 'Referrals' },
    { id: 'tutors:search', label: 'Search tutors with referral attribution', category: 'Referrals' },
    { id: 'caas:read', label: 'Read CaaS scores and breakdowns', category: 'Platform Data' },
    { id: 'profiles:read', label: 'Read public profile data', category: 'Platform Data' },
    { id: 'bookings:read', label: 'Read user bookings', category: 'Platform Data' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a name for your API key');
      return;
    }

    if (formData.scopes.length === 0) {
      alert('Please select at least one scope');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/developer/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const data = await response.json();
      onSuccess(data);
    } catch (error) {
      console.error('Failed to create API key:', error);
      alert('Failed to create API key');
      setIsSubmitting(false);
    }
  };

  const toggleScope = (scopeId: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter((s) => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  };

  const copyToClipboard = async () => {
    if (!newKeyData?.api_key) return;

    try {
      await navigator.clipboard.writeText(newKeyData.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {newKeyData ? (
          // Success state - show the generated key
          <div className={styles.modalContent}>
            <h2>✅ API Key Generated</h2>
            <div className={styles.successMessage}>
              <p className={styles.warningText}>
                ⚠️ <strong>Copy your API key now!</strong> For security reasons, it won&apos;t be shown again.
              </p>

              <div className={styles.keyDisplay}>
                <code className={styles.generatedKey}>{newKeyData.api_key}</code>
                <Button onClick={copyToClipboard} variant="secondary" size="sm">
                  {copiedKey ? '✓ Copied!' : 'Copy'}
                </Button>
              </div>

              <div className={styles.keyMetadata}>
                <p>
                  <strong>Key Prefix:</strong> <code>{newKeyData.key_prefix}...</code>
                </p>
                <p>
                  <strong>Scopes:</strong> {newKeyData.scopes?.join(', ')}
                </p>
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button onClick={onClose} variant="primary" size="md">
                Done
              </Button>
              <a href="/developer/docs" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="md">
                  View API Docs
                </Button>
              </a>
            </div>
          </div>
        ) : (
          // Form state - create new key
          <form onSubmit={handleSubmit} className={styles.modalContent}>
            <h2>Generate New API Key</h2>

            <div className={styles.formGroup}>
              <label htmlFor="name">
                Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., ChatGPT Integration, Production Server"
                required
                className={styles.input}
              />
              <p className={styles.helpText}>
                A descriptive name to help you identify this key
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description (optional)</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="What will this key be used for?"
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                Scopes <span className={styles.required}>*</span>
              </label>
              <p className={styles.helpText}>
                Select the permissions this API key should have
              </p>

              <div className={styles.scopesGrid}>
                {availableScopes.map((scope) => (
                  <label key={scope.id} className={styles.scopeCheckbox}>
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                    />
                    <div className={styles.scopeInfo}>
                      <code className={styles.scopeId}>{scope.id}</code>
                      <span className={styles.scopeLabel}>{scope.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                size="md"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Generating...' : 'Generate API Key'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
