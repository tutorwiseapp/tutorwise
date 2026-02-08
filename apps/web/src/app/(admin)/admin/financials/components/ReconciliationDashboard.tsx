/*
 * Filename: ReconciliationDashboard.tsx
 * Purpose: Financial reconciliation dashboard comparing Stripe vs Supabase balances
 * Created: 2026-02-07
 * Specification: Admin Financials Enhancement - Reconciliation monitoring
 */
'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './ReconciliationDashboard.module.css';

interface BalanceComparison {
  supabaseBalance: number;
  stripeBalance: number;
  discrepancy: number;
  lastSynced: string;
}

export default function ReconciliationDashboard() {
  const [balanceData, setBalanceData] = useState<BalanceComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReconciliationData = async () => {
    try {
      const response = await fetch('/api/admin/financials/reconciliation');

      if (!response.ok) {
        throw new Error('Failed to fetch reconciliation data');
      }

      const data = await response.json();
      setBalanceData(data);
    } catch (error) {
      console.error('Reconciliation fetch error:', error);
      toast.error('Failed to load reconciliation data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReconciliationData();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <RefreshCw className={styles.loadingSpinner} size={32} />
        <p>Loading reconciliation data...</p>
      </div>
    );
  }

  if (!balanceData) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={32} />
        <p>Failed to load reconciliation data</p>
        <Button variant="primary" size="sm" onClick={handleRefresh}>
          Retry
        </Button>
      </div>
    );
  }

  const hasDiscrepancy = Math.abs(balanceData.discrepancy) > 0.01; // Allow 1p tolerance for rounding
  const discrepancyPercent = balanceData.stripeBalance > 0
    ? (Math.abs(balanceData.discrepancy) / balanceData.stripeBalance) * 100
    : 0;

  return (
    <div className={styles.dashboard}>
      {/* Header with Refresh */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Financial Reconciliation</h2>
          <p className={styles.subtitle}>
            Last synced: {new Date(balanceData.lastSynced).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <RefreshCw className={styles.spinIcon} size={16} />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Discrepancy Alert */}
      {hasDiscrepancy && (
        <div className={styles.discrepancyAlert}>
          <AlertTriangle size={20} />
          <div className={styles.alertContent}>
            <h4 className={styles.alertTitle}>Balance Discrepancy Detected</h4>
            <p className={styles.alertText}>
              There is a £{Math.abs(balanceData.discrepancy).toFixed(2)} ({discrepancyPercent.toFixed(2)}%) difference between Stripe and Supabase balances.
            </p>
          </div>
        </div>
      )}

      {/* Success Status */}
      {!hasDiscrepancy && (
        <div className={styles.successAlert}>
          <CheckCircle size={20} />
          <div className={styles.alertContent}>
            <h4 className={styles.alertTitle}>Balances Reconciled</h4>
            <p className={styles.alertText}>
              Stripe and Supabase balances match. All transactions are accounted for.
            </p>
          </div>
        </div>
      )}

      {/* Balance Comparison Cards */}
      <div className={styles.balanceGrid}>
        <div className={styles.balanceCard}>
          <div className={styles.cardIcon} style={{ backgroundColor: '#eff6ff' }}>
            <DollarSign size={24} style={{ color: '#3b82f6' }} />
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.cardLabel}>Stripe Balance</h3>
            <p className={styles.cardValue}>£{balanceData.stripeBalance.toFixed(2)}</p>
            <p className={styles.cardMeta}>Source: Stripe API</p>
          </div>
        </div>

        <div className={styles.balanceCard}>
          <div className={styles.cardIcon} style={{ backgroundColor: '#f0fdf4' }}>
            <TrendingUp size={24} style={{ color: '#10b981' }} />
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.cardLabel}>Supabase Balance</h3>
            <p className={styles.cardValue}>£{balanceData.supabaseBalance.toFixed(2)}</p>
            <p className={styles.cardMeta}>Source: Transactions Table</p>
          </div>
        </div>

        <div className={styles.balanceCard}>
          <div
            className={styles.cardIcon}
            style={{ backgroundColor: hasDiscrepancy ? '#fef2f2' : '#f0fdf4' }}
          >
            {hasDiscrepancy ? (
              <AlertCircle size={24} style={{ color: '#dc2626' }} />
            ) : (
              <CheckCircle size={24} style={{ color: '#10b981' }} />
            )}
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.cardLabel}>Discrepancy</h3>
            <p
              className={styles.cardValue}
              style={{ color: hasDiscrepancy ? '#dc2626' : '#10b981' }}
            >
              £{Math.abs(balanceData.discrepancy).toFixed(2)}
            </p>
            <p className={styles.cardMeta}>
              {hasDiscrepancy ? 'Action Required' : 'No Issues'}
            </p>
          </div>
        </div>
      </div>

      {/* Reconciliation Help */}
      <div className={styles.helpSection}>
        <h3 className={styles.helpTitle}>Understanding Reconciliation</h3>
        <div className={styles.helpGrid}>
          <div className={styles.helpItem}>
            <h4>What is reconciliation?</h4>
            <p>
              Reconciliation ensures that the balance tracked in our database (Supabase) matches the actual balance in Stripe. Discrepancies can indicate missing transactions or sync issues.
            </p>
          </div>
          <div className={styles.helpItem}>
            <h4>What causes discrepancies?</h4>
            <ul>
              <li>Webhook failures (Stripe → Supabase)</li>
              <li>Manual Stripe operations not reflected in DB</li>
              <li>Rounding differences (usually &lt; £0.01)</li>
              <li>Pending transactions not yet settled</li>
            </ul>
          </div>
          <div className={styles.helpItem}>
            <h4>How to resolve discrepancies?</h4>
            <ol>
              <li>Check Stripe Dashboard for recent transactions</li>
              <li>Review webhook logs for failures</li>
              <li>Compare transaction counts between platforms</li>
              <li>Contact engineering if issue persists</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
