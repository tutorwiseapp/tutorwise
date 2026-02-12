/**
 * Filename: src/app/(admin)/admin/edupay/components/ConversionsTable.tsx
 * Purpose: Admin table for viewing and managing EP conversions
 * Created: 2026-02-12
 * Pattern: Follows Admin Financials TransactionsTable pattern
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { Search, RefreshCw, RotateCcw, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import styles from '../page.module.css';

interface ConversionWithUser {
  id: string;
  user_id: string;
  ep_amount: number;
  gbp_amount_pence: number;
  platform_fee_pence: number;
  net_amount_pence: number;
  destination: 'student_loan' | 'isa' | 'savings';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  failure_reason: string | null;
  truelayer_payment_id: string | null;
  created_at: string;
  completed_at: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const ITEMS_PER_PAGE = 20;

export default function ConversionsTable() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [filterDestination, setFilterDestination] = useState<'all' | 'student_loan' | 'isa' | 'savings'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch conversions with user profiles
  const { data: conversions, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin-edupay-conversions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edupay_conversions')
        .select(`
          id,
          user_id,
          ep_amount,
          gbp_amount_pence,
          platform_fee_pence,
          net_amount_pence,
          destination,
          status,
          failure_reason,
          truelayer_payment_id,
          created_at,
          completed_at,
          profiles!edupay_conversions_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch conversions: ${error.message}`);
      }

      return data as unknown as ConversionWithUser[];
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Retry failed conversion mutation
  const retryMutation = useMutation({
    mutationFn: async (conversionId: string) => {
      // This would trigger a retry of the TrueLayer payment
      // For now, just update the status back to pending
      const { error } = await supabase
        .from('edupay_conversions')
        .update({ status: 'pending', failure_reason: null })
        .eq('id', conversionId);

      if (error) {
        throw new Error(`Failed to retry conversion: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-edupay-conversions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-edupay-metrics'] });
    },
  });

  // Filter and search
  const filteredConversions = useMemo(() => {
    if (!conversions) return [];

    let result = [...conversions];

    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        result = result.filter(c => c.status === 'pending' || c.status === 'processing');
      } else {
        result = result.filter(c => c.status === filterStatus);
      }
    }

    // Filter by destination
    if (filterDestination !== 'all') {
      result = result.filter(c => c.destination === filterDestination);
    }

    // Search by name, email, or ID
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.profiles?.full_name?.toLowerCase().includes(query) ||
        c.profiles?.email?.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.truelayer_payment_id?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [conversions, filterStatus, filterDestination, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredConversions.length / ITEMS_PER_PAGE);
  const paginatedConversions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredConversions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredConversions, currentPage]);

  // Format currency
  const formatCurrency = (pence: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(pence / 100);
  };

  // Format EP
  const formatEP = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  // Get status badge class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return styles.statusCompleted;
      case 'pending':
      case 'processing':
        return styles.statusPending;
      case 'failed':
        return styles.statusFailed;
      default:
        return '';
    }
  };

  // Get destination label
  const getDestinationLabel = (destination: string) => {
    switch (destination) {
      case 'student_loan':
        return 'Student Loan';
      case 'isa':
        return 'ISA';
      case 'savings':
        return 'Savings';
      default:
        return destination;
    }
  };

  if (error) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyStateTitle}>Error loading conversions</p>
        <p className={styles.emptyStateDescription}>{error.message}</p>
        <button className={styles.actionButton} onClick={() => refetch()}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      {/* Table Header */}
      <div className={styles.tableHeader}>
        <h3 className={styles.tableTitle}>
          EP Conversions
          {isFetching && !isLoading && (
            <span className={styles.refreshIndicator}>
              <RefreshCw size={14} />
            </span>
          )}
        </h3>
        <div className={styles.searchContainer}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="search"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as typeof filterStatus);
              setCurrentPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filterDestination}
            onChange={(e) => {
              setFilterDestination(e.target.value as typeof filterDestination);
              setCurrentPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="all">All Destinations</option>
            <option value="student_loan">Student Loan</option>
            <option value="isa">ISA</option>
            <option value="savings">Savings</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>EP Amount</th>
              <th>GBP Value</th>
              <th>Platform Fee</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j}><div className={styles.skeletonRow} style={{ width: j === 1 ? '150px' : '80px' }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : paginatedConversions.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>No conversions found</p>
          <p className={styles.emptyStateDescription}>
            {searchQuery || filterStatus !== 'all' || filterDestination !== 'all'
              ? 'Try adjusting your filters'
              : 'No EP conversions have been made yet'}
          </p>
        </div>
      ) : (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>EP Amount</th>
              <th>GBP Value</th>
              <th>Platform Fee</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedConversions.map((conversion) => (
              <tr key={conversion.id}>
                <td className={styles.cellMono}>
                  {formatIdForDisplay(conversion.id)}
                </td>
                <td>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>
                      {conversion.profiles?.full_name || 'Unknown User'}
                    </span>
                    <span className={styles.userEmail}>
                      {conversion.profiles?.email || formatIdForDisplay(conversion.user_id)}
                    </span>
                  </div>
                </td>
                <td className={styles.cellBold}>{formatEP(conversion.ep_amount)}</td>
                <td className={styles.cellSuccess}>{formatCurrency(conversion.gbp_amount_pence)}</td>
                <td>{formatCurrency(conversion.platform_fee_pence)}</td>
                <td>{getDestinationLabel(conversion.destination)}</td>
                <td>
                  <span className={`${styles.statusBadge} ${getStatusClass(conversion.status)}`}>
                    {conversion.status}
                  </span>
                  {conversion.failure_reason && (
                    <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '2px' }}>
                      {conversion.failure_reason}
                    </div>
                  )}
                </td>
                <td className={styles.cellMono}>
                  {new Date(conversion.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={styles.actionButton}
                      onClick={() => {
                        // TODO: Open conversion detail modal
                        console.log('View conversion:', conversion.id);
                      }}
                      title="View details"
                    >
                      <Eye size={14} />
                    </button>
                    {conversion.status === 'failed' && (
                      <button
                        className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                        onClick={() => retryMutation.mutate(conversion.id)}
                        disabled={retryMutation.isPending}
                        title="Retry conversion"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredConversions.length)} of {filteredConversions.length} conversions
          </span>
          <div className={styles.paginationButtons}>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
