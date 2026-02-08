/*
 * Filename: DisputesManagement.tsx
 * Purpose: Admin interface for managing payment disputes
 * Created: 2026-02-07
 * Specification: Admin Financials Enhancement - Dispute tracking
 */
'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle, ExternalLink, FileText } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './DisputesManagement.module.css';

interface Dispute {
  id: string;
  booking_id: string;
  amount: number;
  status: 'pending' | 'won' | 'lost' | 'under_review';
  reason: string;
  created_at: string;
  booking_reference: string;
  client_name: string;
  tutor_name: string;
}

export default function DisputesManagement() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const response = await fetch('/api/admin/financials/disputes');

      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }

      const data = await response.json();
      setDisputes(data.disputes || []);
    } catch (error) {
      console.error('Disputes fetch error:', error);
      toast.error('Failed to load disputes');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDisputes = disputes.filter((dispute) =>
    filterStatus === 'all' ? true : dispute.status === filterStatus
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won':
        return <CheckCircle size={18} className={styles.iconSuccess} />;
      case 'lost':
        return <XCircle size={18} className={styles.iconError} />;
      case 'under_review':
        return <Clock size={18} className={styles.iconPending} />;
      default:
        return <AlertTriangle size={18} className={styles.iconWarning} />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'won':
        return styles.statusWon;
      case 'lost':
        return styles.statusLost;
      case 'under_review':
        return styles.statusReview;
      default:
        return styles.statusPending;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Clock className={styles.loadingSpinner} size={32} />
        <p>Loading disputes...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Dispute Management</h2>
          <p className={styles.subtitle}>
            {disputes.length} total dispute{disputes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchDisputes}>
          Refresh
        </Button>
      </div>

      {/* Status Filter */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${filterStatus === 'all' ? styles.filterActive : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({disputes.length})
        </button>
        <button
          className={`${styles.filterButton} ${filterStatus === 'pending' ? styles.filterActive : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          Pending ({disputes.filter((d) => d.status === 'pending').length})
        </button>
        <button
          className={`${styles.filterButton} ${filterStatus === 'under_review' ? styles.filterActive : ''}`}
          onClick={() => setFilterStatus('under_review')}
        >
          Under Review ({disputes.filter((d) => d.status === 'under_review').length})
        </button>
        <button
          className={`${styles.filterButton} ${filterStatus === 'won' ? styles.filterActive : ''}`}
          onClick={() => setFilterStatus('won')}
        >
          Won ({disputes.filter((d) => d.status === 'won').length})
        </button>
        <button
          className={`${styles.filterButton} ${filterStatus === 'lost' ? styles.filterActive : ''}`}
          onClick={() => setFilterStatus('lost')}
        >
          Lost ({disputes.filter((d) => d.status === 'lost').length})
        </button>
      </div>

      {/* Disputes List */}
      {filteredDisputes.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={48} className={styles.emptyIcon} />
          <h3>No disputes found</h3>
          <p>
            {filterStatus === 'all'
              ? 'No payment disputes have been filed.'
              : `No disputes with status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className={styles.disputesList}>
          {filteredDisputes.map((dispute) => (
            <div key={dispute.id} className={styles.disputeCard}>
              <div className={styles.disputeHeader}>
                <div className={styles.disputeInfo}>
                  <h3 className={styles.disputeTitle}>
                    Booking #{dispute.booking_reference}
                  </h3>
                  <p className={styles.disputeAmount}>
                    £{dispute.amount.toFixed(2)}
                  </p>
                </div>
                <div className={`${styles.statusBadge} ${getStatusClass(dispute.status)}`}>
                  {getStatusIcon(dispute.status)}
                  <span>{dispute.status.replace('_', ' ')}</span>
                </div>
              </div>

              <div className={styles.disputeDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Reason:</span>
                  <span className={styles.detailValue}>{dispute.reason}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Client:</span>
                  <span className={styles.detailValue}>{dispute.client_name}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Tutor:</span>
                  <span className={styles.detailValue}>{dispute.tutor_name}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Filed:</span>
                  <span className={styles.detailValue}>
                    {new Date(dispute.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div className={styles.disputeActions}>
                <a
                  href={`/admin/bookings/${dispute.booking_id}`}
                  className={styles.actionLink}
                >
                  View Booking
                  <ExternalLink size={14} />
                </a>
                <a
                  href={`https://dashboard.stripe.com/disputes/${dispute.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.actionLink}
                >
                  View in Stripe
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className={styles.infoBox}>
        <h4>Managing Disputes</h4>
        <ul>
          <li>Disputes are automatically synced from Stripe webhooks</li>
          <li>Respond to disputes directly in the Stripe Dashboard</li>
          <li>Upload evidence (session recordings, messages) to support your case</li>
          <li>Disputed funds are held until resolution</li>
        </ul>
      </div>
    </div>
  );
}
