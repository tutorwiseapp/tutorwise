/**
 * Filename: WalletLedgerModal.tsx
 * Purpose: Admin modal for viewing all ledger entries for an EduPay wallet
 * Created: 2026-02-12
 * Pattern: Follows HubComplexModal pattern with paginated list
 */

'use client';

import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { FileText, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import styles from './WalletLedgerModal.module.css';

interface WalletWithUser {
  id: string;
  user_id: string;
  total_ep: number;
  available_ep: number;
  pending_ep: number;
  converted_ep: number;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface WalletLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletWithUser | null;
}

interface LedgerEntry {
  id: string;
  user_id: string;
  type: 'earn' | 'convert' | 'pending_add' | 'pending_clear' | 'refund';
  ep_amount: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  status: 'pending' | 'cleared' | 'reversed';
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

export default function WalletLedgerModal({
  isOpen,
  onClose,
  wallet,
}: WalletLedgerModalProps) {
  const supabase = createClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'earn' | 'convert'>('all');

  // Fetch ledger entries for this wallet
  const { data: ledgerData, isLoading, error } = useQuery<{ entries: LedgerEntry[]; total: number }>({
    queryKey: ['wallet-ledger', wallet?.user_id, page, filter],
    queryFn: async () => {
      if (!wallet) return { entries: [], total: 0 };

      // Build query
      let query = supabase
        .from('edupay_ledger')
        .select('*', { count: 'exact' })
        .eq('user_id', wallet.user_id);

      // Apply filter
      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      // Get total count
      const { count } = await query;

      // Get paginated data
      const { data, error } = await supabase
        .from('edupay_ledger')
        .select('*')
        .eq('user_id', wallet.user_id)
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (error) {
        throw new Error(`Failed to fetch ledger: ${error.message}`);
      }

      return {
        entries: data as LedgerEntry[],
        total: count || 0,
      };
    },
    enabled: isOpen && !!wallet,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const entries = ledgerData?.entries || [];
  const totalPages = Math.ceil((ledgerData?.total || 0) / ITEMS_PER_PAGE);

  // Format EP with commas
  const formatEP = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  // Format date/time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get type icon and color
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'earn':
        return { Icon: TrendingUp, color: '#10b981', label: 'Earn' };
      case 'convert':
        return { Icon: TrendingDown, color: '#3b82f6', label: 'Convert' };
      case 'pending_add':
        return { Icon: Clock, color: '#f59e0b', label: 'Pending' };
      case 'pending_clear':
        return { Icon: CheckCircle2, color: '#10b981', label: 'Cleared' };
      case 'refund':
        return { Icon: XCircle, color: '#ef4444', label: 'Refund' };
      default:
        return { Icon: FileText, color: '#6b7280', label: type };
    }
  };

  // Get status badge class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'cleared':
        return styles.statusCleared;
      case 'pending':
        return styles.statusPending;
      case 'reversed':
        return styles.statusReversed;
      default:
        return '';
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (!entries || entries.length === 0) return;

    const headers = ['ID', 'Type', 'EP Amount', 'Description', 'Status', 'Reference', 'Created'];
    const rows = entries.map((entry) => [
      entry.id,
      entry.type,
      entry.ep_amount,
      entry.description || '',
      entry.status,
      entry.reference_id ? `${entry.reference_type}:${formatIdForDisplay(entry.reference_id)}` : '',
      formatDateTime(entry.created_at),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-ledger-${formatIdForDisplay(wallet?.id || '')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!wallet) return null;

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={onClose}
      title="Wallet Ledger"
      subtitle={`${wallet.profiles?.full_name || 'Unknown User'} - ${ledgerData?.total || 0} entries`}
      size="lg"
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" onClick={handleExport} disabled={entries.length === 0}>
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        {/* Filters */}
        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${filter === 'all' ? styles.filterActive : ''}`}
            onClick={() => { setFilter('all'); setPage(1); }}
          >
            All
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'earn' ? styles.filterActive : ''}`}
            onClick={() => { setFilter('earn'); setPage(1); }}
          >
            <TrendingUp size={14} />
            Earnings
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'convert' ? styles.filterActive : ''}`}
            onClick={() => { setFilter('convert'); setPage(1); }}
          >
            <TrendingDown size={14} />
            Conversions
          </button>
        </div>

        {/* Ledger List */}
        <div className={styles.ledgerSection}>
          {isLoading ? (
            <div className={styles.loading}>Loading ledger entries...</div>
          ) : error ? (
            <div className={styles.error}>Failed to load ledger entries</div>
          ) : entries.length === 0 ? (
            <div className={styles.emptyLedger}>
              <FileText size={32} />
              <p>No ledger entries found</p>
              <span>EP transactions will appear here</span>
            </div>
          ) : (
            <div className={styles.ledgerList}>
              {entries.map((entry) => {
                const { Icon, color, label } = getTypeInfo(entry.type);
                return (
                  <div key={entry.id} className={styles.ledgerItem}>
                    <div className={styles.ledgerIcon} style={{ backgroundColor: `${color}15`, color }}>
                      <Icon size={16} />
                    </div>

                    <div className={styles.ledgerContent}>
                      <div className={styles.ledgerHeader}>
                        <span className={styles.ledgerType}>{label}</span>
                        <span className={`${styles.ledgerStatus} ${getStatusClass(entry.status)}`}>
                          {entry.status}
                        </span>
                      </div>
                      <span className={styles.ledgerDescription}>
                        {entry.description || 'No description'}
                      </span>
                      <div className={styles.ledgerMeta}>
                        <span className={styles.ledgerId}>{formatIdForDisplay(entry.id)}</span>
                        <span className={styles.ledgerDate}>{formatDateTime(entry.created_at)}</span>
                      </div>
                      {entry.reference_id && (
                        <span className={styles.ledgerReference}>
                          Ref: {entry.reference_type} • {formatIdForDisplay(entry.reference_id)}
                        </span>
                      )}
                    </div>

                    <div className={styles.ledgerAmount}>
                      <span className={entry.type === 'earn' || entry.type === 'refund' ? styles.amountPositive : styles.amountNegative}>
                        {entry.type === 'earn' || entry.type === 'refund' ? '+' : '-'}{formatEP(entry.ep_amount)}
                      </span>
                      <span className={styles.amountUnit}>EP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className={styles.paginationInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              className={styles.paginationButton}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </HubComplexModal>
  );
}
