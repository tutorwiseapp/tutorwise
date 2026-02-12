/*
 * Filename: src/app/(admin)/admin/edupay/compliance/page.tsx
 * Purpose: Admin page for EduPay compliance reporting and tax exports
 * Created: 2026-02-12
 * Phase: 2 - Platform Management (Priority 3)
 * Pattern: Follows Admin Dashboard Gold Standard
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { FileText, Download, Calendar, PoundSterling, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

interface ComplianceStats {
  totalPlatformFees: number;
  totalEpAwarded: number;
  totalEpConverted: number;
  totalConversionsCount: number;
  periodStart: string;
  periodEnd: string;
}

interface AuditEntry {
  id: string;
  event_type: string;
  user_id: string;
  ep_amount: number;
  gbp_value_pence: number;
  platform_fee_pence: number;
  created_at: string;
}

export default function AdminEduPayCompliancePage() {
  const router = useRouter();
  const supabase = createClient();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [isExporting, setIsExporting] = useState(false);

  // Calculate date range based on selected period
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    switch (selectedPeriod) {
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  // Fetch compliance stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin-edupay-compliance-stats', selectedPeriod],
    queryFn: async () => {
      const { start, end } = getDateRange();

      // Fetch conversions for the period
      const { data: conversions, error: convError } = await supabase
        .from('edupay_conversions')
        .select('ep_amount, gbp_amount_pence, platform_fee_pence, status')
        .gte('created_at', start)
        .lte('created_at', end)
        .eq('status', 'completed');

      if (convError) {
        throw new Error(`Failed to fetch conversions: ${convError.message}`);
      }

      // Fetch ledger entries for EP awarded
      const { data: ledger, error: ledgerError } = await supabase
        .from('edupay_ledger')
        .select('ep_amount, type')
        .gte('created_at', start)
        .lte('created_at', end)
        .eq('type', 'earn')
        .eq('status', 'cleared');

      if (ledgerError) {
        throw new Error(`Failed to fetch ledger: ${ledgerError.message}`);
      }

      const totalPlatformFees = conversions?.reduce((sum, c) => sum + (c.platform_fee_pence || 0), 0) || 0;
      const totalEpConverted = conversions?.reduce((sum, c) => sum + (c.ep_amount || 0), 0) || 0;
      const totalEpAwarded = ledger?.reduce((sum, l) => sum + (l.ep_amount || 0), 0) || 0;

      return {
        totalPlatformFees,
        totalEpAwarded,
        totalEpConverted,
        totalConversionsCount: conversions?.length || 0,
        periodStart: start,
        periodEnd: end,
      } as ComplianceStats;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  // Handle CSV export
  const handleExport = async (reportType: 'fees' | 'conversions' | 'ledger') => {
    setIsExporting(true);
    const { start, end } = getDateRange();

    try {
      let data: unknown[] = [];
      let filename = '';

      switch (reportType) {
        case 'fees':
          const { data: feeData } = await supabase
            .from('edupay_conversions')
            .select('id, user_id, ep_amount, gbp_amount_pence, platform_fee_pence, net_amount_pence, destination, status, created_at, completed_at')
            .gte('created_at', start)
            .lte('created_at', end)
            .eq('status', 'completed');
          data = feeData || [];
          filename = `edupay-platform-fees-${selectedPeriod}.csv`;
          break;

        case 'conversions':
          const { data: convData } = await supabase
            .from('edupay_conversions')
            .select('*')
            .gte('created_at', start)
            .lte('created_at', end);
          data = convData || [];
          filename = `edupay-conversions-${selectedPeriod}.csv`;
          break;

        case 'ledger':
          const { data: ledgerData } = await supabase
            .from('edupay_ledger')
            .select('*')
            .gte('created_at', start)
            .lte('created_at', end);
          data = ledgerData || [];
          filename = `edupay-ledger-${selectedPeriod}.csv`;
          break;
      }

      // Convert to CSV
      if (data.length > 0) {
        const headers = Object.keys(data[0] as object).join(',');
        const rows = data.map(row =>
          Object.values(row as object).map(v =>
            typeof v === 'string' && v.includes(',') ? `"${v}"` : v
          ).join(',')
        );
        const csv = [headers, ...rows].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

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

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="EduPay Management"
          subtitle="Compliance reporting and tax exports"
          className={styles.complianceHeader}
          actions={
            <div className={styles.periodSelector}>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as typeof selectedPeriod)}
                className={styles.periodSelect}
              >
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: false },
            { id: 'rules', label: 'Earning Rules', active: false },
            { id: 'providers', label: 'Providers', active: false },
            { id: 'compliance', label: 'Compliance', active: true },
          ]}
          onTabChange={(tabId) => {
            if (tabId === 'overview') router.push('/admin/edupay');
            else if (tabId === 'rules') router.push('/admin/edupay/rules');
            else if (tabId === 'providers') router.push('/admin/edupay/providers');
            else if (tabId === 'compliance') router.push('/admin/edupay/compliance');
          }}
          className={styles.complianceTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Period Summary"
            stats={[
              { label: 'Platform Fees', value: formatCurrency(stats?.totalPlatformFees || 0) },
              { label: 'EP Awarded', value: formatEP(stats?.totalEpAwarded || 0) },
              { label: 'EP Converted', value: formatEP(stats?.totalEpConverted || 0) },
              { label: 'Conversions', value: stats?.totalConversionsCount || 0 },
            ]}
          />
          <AdminHelpWidget
            title="Compliance Help"
            items={[
              { question: 'Platform fees?', answer: '10% of all EP conversions. This is Tutorwise revenue and must be reported for tax purposes.' },
              { question: 'Audit trail?', answer: 'All EP transactions are recorded in an immutable ledger. No deletions are possible.' },
              { question: 'Data retention?', answer: 'Transaction data is retained for 7 years per UK financial regulations.' },
            ]}
          />
          <AdminTipWidget
            title="Reporting Tips"
            tips={[
              'Export monthly reports for accounting',
              'Reconcile platform fees with Stripe payouts',
              'Keep copies of all exports securely',
              'Review quarterly for tax preparation',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Compliance Status Cards */}
      <div className={styles.statusCards}>
        <div className={styles.statusCard}>
          <div className={styles.statusIcon}>
            <Shield size={24} />
          </div>
          <div className={styles.statusContent}>
            <h3>FCA Exemption Status</h3>
            <p className={styles.statusGood}>
              <CheckCircle2 size={16} />
              Compliant - Payment Initiation Only
            </p>
            <span className={styles.statusNote}>
              Tutorwise does not hold user funds. All payments flow directly to user-designated accounts via TrueLayer.
            </span>
          </div>
        </div>

        <div className={styles.statusCard}>
          <div className={styles.statusIcon}>
            <FileText size={24} />
          </div>
          <div className={styles.statusContent}>
            <h3>Audit Trail</h3>
            <p className={styles.statusGood}>
              <CheckCircle2 size={16} />
              Immutable Ledger Active
            </p>
            <span className={styles.statusNote}>
              All transactions recorded with full audit trail. No deletions permitted.
            </span>
          </div>
        </div>
      </div>

      {/* Period Summary */}
      <div className={styles.summarySection}>
        <div className={styles.summaryHeader}>
          <Calendar size={20} />
          <h2>Period: {stats ? `${formatDate(stats.periodStart)} - ${formatDate(stats.periodEnd)}` : 'Loading...'}</h2>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <PoundSterling size={32} className={styles.summaryIcon} />
            <div className={styles.summaryValue}>
              {isLoadingStats ? '...' : formatCurrency(stats?.totalPlatformFees || 0)}
            </div>
            <div className={styles.summaryLabel}>Platform Fees Collected</div>
            <div className={styles.summaryNote}>Taxable revenue (10% of conversions)</div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {isLoadingStats ? '...' : formatEP(stats?.totalEpAwarded || 0)}
            </div>
            <div className={styles.summaryLabel}>EP Awarded</div>
            <div className={styles.summaryNote}>Total EP earned by users</div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {isLoadingStats ? '...' : formatEP(stats?.totalEpConverted || 0)}
            </div>
            <div className={styles.summaryLabel}>EP Converted</div>
            <div className={styles.summaryNote}>EP redeemed for payments</div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>
              {isLoadingStats ? '...' : stats?.totalConversionsCount || 0}
            </div>
            <div className={styles.summaryLabel}>Completed Conversions</div>
            <div className={styles.summaryNote}>Successful payment transfers</div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className={styles.exportSection}>
        <h2>Export Reports</h2>
        <div className={styles.exportGrid}>
          <div className={styles.exportCard}>
            <FileText size={24} />
            <h3>Platform Fees Report</h3>
            <p>Export all completed conversions with platform fee breakdown for tax reporting.</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExport('fees')}
              disabled={isExporting}
            >
              <Download size={16} style={{ marginRight: '0.5rem' }} />
              Export CSV
            </Button>
          </div>

          <div className={styles.exportCard}>
            <FileText size={24} />
            <h3>All Conversions</h3>
            <p>Full export of all EP conversions including pending and failed.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('conversions')}
              disabled={isExporting}
            >
              <Download size={16} style={{ marginRight: '0.5rem' }} />
              Export CSV
            </Button>
          </div>

          <div className={styles.exportCard}>
            <FileText size={24} />
            <h3>Ledger Export</h3>
            <p>Complete transaction ledger for audit and reconciliation purposes.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('ledger')}
              disabled={isExporting}
            >
              <Download size={16} style={{ marginRight: '0.5rem' }} />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Warning Notice */}
      <div className={styles.warningNotice}>
        <AlertTriangle size={16} />
        <span>
          These reports are for internal use only. Consult with your accountant for official tax filings.
          Platform fee revenue should be reconciled with Stripe dashboard payouts.
        </span>
      </div>
    </HubPageLayout>
  );
}
