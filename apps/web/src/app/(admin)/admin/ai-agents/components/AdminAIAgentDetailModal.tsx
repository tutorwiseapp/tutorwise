/**
 * Filename: AdminAIAgentDetailModal.tsx
 * Purpose: Detail modal for viewing/editing AI tutor information in admin panel
 * Created: 2026-02-24
 */

'use client';

import React from 'react';
import Modal from '@/app/components/ui/feedback/Modal';
import Button from '@/app/components/ui/actions/Button';
import styles from './AdminAIAgentDetailModal.module.css';

interface AITutor {
  id: string;
  name: string;
  display_name: string;
  subject: string;
  description: string;
  status: string;
  subscription_status: string;
  price_per_hour: number;
  total_sessions: number;
  total_revenue: number;
  avg_rating: number | null;
  total_reviews: number;
  created_at: string;
  published_at: string | null;
  is_platform_owned?: boolean;
  owner?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface AdminAIAgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiTutor: AITutor | null;
  onAIAgentUpdated: () => void;
}

export default function AdminAIAgentDetailModal({
  isOpen,
  onClose,
  aiTutor,
  onAIAgentUpdated,
}: AdminAIAgentDetailModalProps) {
  if (!aiTutor) return null;

  const handleViewAIAgent = () => {
    window.open(`/ai-agents/${aiTutor.id}`, '_blank');
  };

  const handleEditAIAgent = () => {
    window.open(`/ai-agents/${aiTutor.id}/edit`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={aiTutor.display_name}
    >
      <div className={styles.modalContent}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2>{aiTutor.display_name}</h2>
            {aiTutor.is_platform_owned && (
              <span className={styles.platformBadge}>⭐ Platform AI Tutor</span>
            )}
            <p className={styles.slug}>/{aiTutor.name}</p>
          </div>
          <div className={styles.statusSection}>
            <span className={`${styles.statusBadge} ${styles[aiTutor.status]}`}>
              {aiTutor.status}
            </span>
            <span className={`${styles.subBadge} ${styles[aiTutor.subscription_status]}`}>
              {aiTutor.subscription_status}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>ID</label>
            <span>{aiTutor.id}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Owner</label>
            <span>
              {aiTutor.is_platform_owned
                ? 'Platform'
                : aiTutor.owner?.full_name || aiTutor.owner?.email || 'Unknown'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <label>Subject</label>
            <span className={styles.subjectTag}>{aiTutor.subject}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Price</label>
            <span>£{aiTutor.price_per_hour}/hour</span>
          </div>
          <div className={styles.infoItem}>
            <label>Total Sessions</label>
            <span>{aiTutor.total_sessions || 0}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Total Revenue</label>
            <span>£{(aiTutor.total_revenue || 0).toFixed(2)}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Avg Rating</label>
            <span>
              {aiTutor.avg_rating ? `${aiTutor.avg_rating.toFixed(1)}/5` : 'N/A'}
              {aiTutor.total_reviews > 0 && ` (${aiTutor.total_reviews} reviews)`}
            </span>
          </div>
          <div className={styles.infoItem}>
            <label>Created</label>
            <span>
              {new Date(aiTutor.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          {aiTutor.published_at && (
            <div className={styles.infoItem}>
              <label>Published</label>
              <span>
                {new Date(aiTutor.published_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {aiTutor.description && (
          <div className={styles.descriptionSection}>
            <label>Description</label>
            <p>{aiTutor.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleViewAIAgent}>
            View AI Tutor
          </Button>
          <Button variant="secondary" onClick={handleEditAIAgent}>
            Edit AI Tutor
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
