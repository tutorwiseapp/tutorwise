/**
 * Filename: src/app/(admin)/admin/edupay/components/WalletsTable.tsx
 * Purpose: Admin table for viewing and managing user EP wallets
 * Created: 2026-02-12
 * Updated: 2026-02-12 - Refactored to use HubDataTable and VerticalDotsMenu
 * Pattern: Follows UsersTable pattern with HubDataTable
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import WalletDetailsModal from './WalletDetailsModal';
import WalletLedgerModal from './WalletLedgerModal';
import styles from './WalletsTable.module.css';

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

// Status badge component
function BalanceStatusBadge({ available, pending }: { available: number; pending: number }) {
  if (pending > 0) {
    return <span className={`${styles.badge} ${styles.badgePending}`}>Pending</span>;
  }
  if (available > 0) {
    return <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>;
  }
  return <span className={`${styles.badge} ${styles.badgeZero}`}>Zero</span>;
}

export default function WalletsTable() {
  const supabase = createClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletWithUser | null>(null);

  // Fetch wallets with user profiles
  const { data: walletsData, isLoading, refetch, error } = useQuery<{ wallets: WalletWithUser[]; total: number }>({
    queryKey: ['admin-edupay-wallets-table', page, limit],
    queryFn: async () => {
      // Get total count
      const { count } = await supabase
        .from('edupay_wallets')
        .select('*', { count: 'exact', head: true });

      // Get paginated data
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
        .order('total_ep', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        throw new Error(`Failed to fetch wallets: ${error.message}`);
      }

      return {
        wallets: data as unknown as WalletWithUser[],
        total: count || 0,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const wallets = walletsData?.wallets || [];

  // Format EP with commas
  const formatEP = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Get user initials for avatar
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Action handlers
  const handleViewDetails = (wallet: WalletWithUser) => {
    setSelectedWallet(wallet);
    setIsDetailsModalOpen(true);
  };

  const handleViewLedger = (wallet: WalletWithUser) => {
    setSelectedWallet(wallet);
    setIsLedgerModalOpen(true);
  };

  const handleContactUser = (wallet: WalletWithUser) => {
    // TODO: Open contact modal
    if (wallet.profiles?.email) {
      window.location.href = `mailto:${wallet.profiles.email}`;
    }
  };

  // Define columns following universal column order: ID → Created → Name → Domain Fields → Actions
  const columns: Column<WalletWithUser>[] = [
    {
      key: 'id',
      label: 'ID',
      width: '100px',
      render: (wallet) => (
        <span className={styles.idCell}>{formatIdForDisplay(wallet.id)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '120px',
      sortable: true,
      hideOnMobile: true,
      render: (wallet) => (
        <span className={styles.dateCell}>{formatDate(wallet.created_at)}</span>
      ),
    },
    {
      key: 'user',
      label: 'User',
      width: '200px',
      render: (wallet) => (
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
      ),
    },
    {
      key: 'total_ep',
      label: 'Total EP',
      width: '100px',
      sortable: true,
      render: (wallet) => (
        <span className={styles.epValue}>{formatEP(wallet.total_ep)}</span>
      ),
    },
    {
      key: 'available_ep',
      label: 'Available',
      width: '100px',
      hideOnMobile: true,
      render: (wallet) => (
        <span className={wallet.available_ep > 0 ? styles.epValueSuccess : ''}>
          {formatEP(wallet.available_ep)}
        </span>
      ),
    },
    {
      key: 'pending_ep',
      label: 'Pending',
      width: '100px',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (wallet) => (
        <span className={wallet.pending_ep > 0 ? styles.epValueWarning : ''}>
          {formatEP(wallet.pending_ep)}
        </span>
      ),
    },
    {
      key: 'converted_ep',
      label: 'Converted',
      width: '100px',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (wallet) => formatEP(wallet.converted_ep),
    },
    {
      key: 'status',
      label: 'Status',
      width: '90px',
      hideOnMobile: true,
      render: (wallet) => (
        <BalanceStatusBadge available={wallet.available_ep} pending={wallet.pending_ep} />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (wallet) => (
        <VerticalDotsMenu
          actions={[
            { label: 'View Details', onClick: () => handleViewDetails(wallet) },
            { label: 'View Ledger', onClick: () => handleViewLedger(wallet) },
            { label: 'Contact User', onClick: () => handleContactUser(wallet) },
          ]}
        />
      ),
    },
  ];

  // Define filters
  const filters: Filter[] = [
    {
      key: 'status',
      label: 'All Status',
      options: [
        { label: 'Active (EP > 0)', value: 'active' },
        { label: 'Zero Balance', value: 'zero' },
        { label: 'Has Pending', value: 'pending' },
      ],
    },
  ];

  // Pagination config
  const paginationConfig: PaginationConfig = {
    page,
    limit,
    total: walletsData?.total || 0,
    onPageChange: setPage,
    onLimitChange: (newLimit) => {
      setLimit(newLimit);
      setPage(1);
    },
    pageSizeOptions: [10, 20, 50, 100],
  };

  // Handle export to CSV
  const handleExport = () => {
    if (!wallets || wallets.length === 0) return;

    const headers = ['ID', 'User', 'Email', 'Total EP', 'Available', 'Pending', 'Converted', 'Created'];
    const rows = wallets.map((wallet) => [
      wallet.id,
      wallet.profiles?.full_name || 'Unknown',
      wallet.profiles?.email || 'N/A',
      wallet.total_ep,
      wallet.available_ep,
      wallet.pending_ep,
      wallet.converted_ep,
      formatDate(wallet.created_at),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edupay-wallets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Wallet Details Modal */}
      <WalletDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        wallet={selectedWallet}
        onViewLedger={(wallet) => {
          setIsDetailsModalOpen(false);
          handleViewLedger(wallet);
        }}
      />

      {/* Wallet Ledger Modal */}
      <WalletLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        wallet={selectedWallet}
      />

      <HubDataTable
        columns={columns}
        data={wallets}
        loading={isLoading}
        onRefresh={() => refetch()}
        onExport={handleExport}
        filters={filters}
        pagination={paginationConfig}
        emptyMessage={error ? `Error loading wallets: ${error.message}` : 'No EduPay wallets found.'}
        searchPlaceholder="Search by name or email..."
        autoRefreshInterval={30000}
        enableSavedViews={true}
        savedViewsKey="admin_edupay_wallets_savedViews"
      />
    </>
  );
}
