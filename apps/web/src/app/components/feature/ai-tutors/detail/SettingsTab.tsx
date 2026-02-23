/**
 * Filename: SettingsTab.tsx
 * Purpose: AI Tutor Settings - Edit details, manage subscription, delete
 * Created: 2026-02-23
 * Version: v1.0
 */

'use client';

import { useState } from 'react';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './SettingsTab.module.css';

interface SettingsTabProps {
  aiTutor: any;
  subscription: any;
  onDelete: () => void;
  onUpdate: () => void;
}

export default function SettingsTab({
  aiTutor,
  subscription,
  onDelete,
  onUpdate,
}: SettingsTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: aiTutor.display_name || '',
    description: aiTutor.description || '',
    price_per_hour: aiTutor.price_per_hour || 15,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/ai-tutors/${aiTutor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      toast.success('AI tutor updated');
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? Your AI tutor will be unpublished.')) return;

    try {
      const res = await fetch(`/api/ai-tutors/${aiTutor.id}/subscription`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to cancel subscription');
      toast.success('Subscription canceled');
      onUpdate();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className={styles.container}>
      {/* Edit Details */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>AI Tutor Details</h2>
          {!isEditing && (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Display Name</label>
              <input
                type="text"
                className={styles.input}
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Price per Hour (£)</label>
              <input
                type="number"
                className={styles.input}
                value={formData.price_per_hour}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_hour: parseFloat(e.target.value) || 0 }))}
                min={5}
                max={100}
                step={0.5}
              />
            </div>

            <div className={styles.formActions}>
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Display Name</span>
              <span className={styles.infoValue}>{aiTutor.display_name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Subject</span>
              <span className={styles.infoValue}>{aiTutor.subject}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Price</span>
              <span className={styles.infoValue}>£{aiTutor.price_per_hour}/hr</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>{aiTutor.status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Management */}
      {subscription && subscription.status === 'active' && (
        <div className={styles.section}>
          <h2>Subscription</h2>
          <div className={styles.subscriptionInfo}>
            <p>
              Your AI tutor subscription is <strong>active</strong> at £10/month.
            </p>
            <p className={styles.muted}>
              Current period: {new Date(subscription.current_period_start).toLocaleDateString()} - {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
            {subscription.cancel_at && (
              <p className={styles.warning}>
                Subscription will cancel on {new Date(subscription.cancel_at).toLocaleDateString()}
              </p>
            )}
          </div>
          {!subscription.cancel_at && (
            <Button variant="danger" size="sm" onClick={handleCancelSubscription}>
              Cancel Subscription
            </Button>
          )}
        </div>
      )}

      {/* Storage Usage */}
      <div className={styles.section}>
        <h2>Storage</h2>
        <div className={styles.storageBar}>
          <div className={styles.storageTrack}>
            <div
              className={styles.storageFill}
              style={{
                width: `${Math.min(((aiTutor.storage_used_mb || 0) / (aiTutor.storage_limit_mb || 1024)) * 100, 100)}%`,
              }}
            />
          </div>
          <span className={styles.storageText}>
            {aiTutor.storage_used_mb || 0} MB / {aiTutor.storage_limit_mb || 1024} MB used
          </span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className={`${styles.section} ${styles.dangerZone}`}>
        <h2>Danger Zone</h2>
        <p className={styles.dangerText}>
          Permanently delete this AI tutor and all associated materials, sessions, and data.
          This action cannot be undone.
        </p>
        <Button variant="danger" size="sm" onClick={onDelete}>
          Delete AI Tutor
        </Button>
      </div>
    </div>
  );
}
