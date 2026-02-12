/**
 * Filename: src/app/(admin)/admin/edupay/components/WalletsTable.tsx
 * Purpose: Admin table for viewing and managing user EP wallets
 * Created: 2026-02-12
 * Pattern: Follows Admin Financials TransactionsTable pattern
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { Search, RefreshCw, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../page.module.css';

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

const ITEMS_PER_PAGE = 20;

export default function WalletsTable() {
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'zero'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'total_ep' | 'created_at'>('total_ep');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch wallets with user profiles
  const { data: wallets, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin-edupay-wallets', sortBy, sortOrder],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edupay_wallets')
        .select(`
          id,
          user_id,
          total_ep,
          available_ep,
          pending_ep,
          converted_ep,
          created_at,
          updated_at,
          profiles!edupay_wallets_user_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) {
        throw new Error(`Failed to fetch wallets: ${error.message}`);
      }

      return data as unknown as WalletWithUser[];
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Filter and search
  const filteredWallets = useMemo(() => {
    if (!wallets) return [];

    let result = [...wallets];

    // Filter by status
    if (filterStatus === 'active') {
      result = result.filter(w => w.total_ep > 0);
    } else if (filterStatus === 'zero') {
      result = result.filter(w => w.total_ep === 0);
    }

    // Search by name or email
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w =>
        w.profiles?.full_name?.toLowerCase().includes(query) ||
        w.profiles?.email?.toLowerCase().includes(query) ||
        w.user_id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [wallets, filterStatus, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredWallets.length / ITEMS_PER_PAGE);
  const paginatedWallets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredWallets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWallets, currentPage]);

  // Format EP with commas
  const formatEP = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  // Get user initials for avatar
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Handle sort toggle
  const handleSort = (column: 'total_ep' | 'created_at') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (error) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyStateTitle}>Error loading wallets</p>
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
          User Wallets
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
              setFilterStatus(e.target.value as 'all' | 'active' | 'zero');
              setCurrentPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="all">All Wallets</option>
            <option value="active">Active (EP &gt; 0)</option>
            <option value="zero">Zero Balance</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>User</th>
              <th>Total EP</th>
              <th>Available</th>
              <th>Pending</th>
              <th>Converted</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div className={styles.skeletonRow} style={{ width: j === 0 ? '200px' : '80px' }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : paginatedWallets.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>No wallets found</p>
          <p className={styles.emptyStateDescription}>
            {searchQuery ? 'Try adjusting your search criteria' : 'No EduPay wallets have been created yet'}
          </p>
        </div>
      ) : (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>User</th>
              <th
                onClick={() => handleSort('total_ep')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Total EP {sortBy === 'total_ep' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Available</th>
              <th>Pending</th>
              <th>Converted</th>
              <th
                onClick={() => handleSort('created_at')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Created {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedWallets.map((wallet) => (
              <tr key={wallet.id}>
                <td>
                  <div className={styles.userCell}>
                    <div className={styles.userAvatar}>
                      {getInitials(wallet.profiles?.full_name)}
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>
                        {wallet.profiles?.full_name || 'Unknown User'}
                      </span>
                      <span className={styles.userEmail}>
                        {wallet.profiles?.email || formatIdForDisplay(wallet.user_id)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={styles.cellBold}>{formatEP(wallet.total_ep)}</td>
                <td className={wallet.available_ep > 0 ? styles.cellSuccess : undefined}>
                  {formatEP(wallet.available_ep)}
                </td>
                <td className={wallet.pending_ep > 0 ? styles.cellWarning : undefined}>
                  {formatEP(wallet.pending_ep)}
                </td>
                <td>{formatEP(wallet.converted_ep)}</td>
                <td className={styles.cellMono}>
                  {new Date(wallet.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td>
                  <button
                    className={styles.actionButton}
                    onClick={() => {
                      // TODO: Open wallet detail modal
                      console.log('View wallet:', wallet.id);
                    }}
                    title="View wallet details"
                  >
                    <Eye size={14} />
                  </button>
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
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredWallets.length)} of {filteredWallets.length} wallets
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
