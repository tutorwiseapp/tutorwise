/**
 * Filename: PayoutExportCard.tsx
 * Purpose: Export payout data for commission tracking and accounting
 * Created: 2025-12-31
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Download, FileSpreadsheet, Calendar, Filter, CheckCircle2 } from 'lucide-react';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './PayoutExportCard.module.css';

interface PayoutExportCardProps {
  organisationId: string;
  memberId?: string; // If provided, shows member-specific export
  isOwner?: boolean;
}

type ExportFormat = 'csv' | 'json';
type DateRange = 'all' | 'this-month' | 'last-month' | 'this-year' | 'custom';
type PayoutStatus = 'all' | 'pending' | 'paid';

export function PayoutExportCard({
  organisationId,
  memberId,
  isOwner = false
}: PayoutExportCardProps) {
  const supabase = createClient();

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);

    try {
      // Build query filters
      let query = supabase
        .from('referrals')
        .select(`
          id,
          created_at,
          converted_at,
          status,
          commission_amount,
          organisation_commission,
          member_commission,
          commission_paid,
          commission_paid_at,
          referrer_member_id,
          referred_profile_id,
          booking_id,
          profile:referred_profile_id (
            full_name,
            email
          ),
          referrer:referrer_member_id (
            full_name,
            email
          )
        `)
        .eq('organisation_id', organisationId)
        .not('converted_at', 'is', null);

      // Filter by member if specified
      if (memberId) {
        query = query.eq('referrer_member_id', memberId);
      }

      // Filter by payout status
      if (payoutStatus === 'pending') {
        query = query.eq('commission_paid', false);
      } else if (payoutStatus === 'paid') {
        query = query.eq('commission_paid', true);
      }

      // Filter by date range
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      switch (dateRange) {
        case 'this-month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'last-month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'this-year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        case 'custom':
          if (customStartDate) startDate = new Date(customStartDate);
          if (customEndDate) endDate = new Date(customEndDate);
          break;
      }

      if (startDate) {
        query = query.gte('converted_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('converted_at', endDate.toISOString());
      }

      // Execute query
      const { data, error } = await query.order('converted_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setMessage('No payout data found for the selected filters');
        return;
      }

      // Export data
      if (format === 'csv') {
        exportToCSV(data);
      } else {
        exportToJSON(data);
      }

      setMessage(`Successfully exported ${data.length} payout records`);
    } catch (error: any) {
      console.error('Error exporting payout data:', error);
      setMessage(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = (data: any[]) => {
    // CSV headers
    const headers = memberId
      ? [
          'Referral ID',
          'Referred Client',
          'Client Email',
          'Conversion Date',
          'Status',
          'My Commission',
          'Paid',
          'Paid Date'
        ]
      : [
          'Referral ID',
          'Referrer Name',
          'Referrer Email',
          'Referred Client',
          'Client Email',
          'Conversion Date',
          'Status',
          'Total Commission',
          'Org Commission',
          'Member Commission',
          'Paid',
          'Paid Date'
        ];

    // CSV rows
    const rows = data.map(ref => {
      const convertedDate = ref.converted_at
        ? new Date(ref.converted_at).toLocaleDateString('en-GB')
        : '';
      const paidDate = ref.commission_paid_at
        ? new Date(ref.commission_paid_at).toLocaleDateString('en-GB')
        : '';

      if (memberId) {
        return [
          ref.id,
          ref.profile?.full_name || 'N/A',
          ref.profile?.email || 'N/A',
          convertedDate,
          ref.status,
          `£${ref.member_commission?.toFixed(2) || '0.00'}`,
          ref.commission_paid ? 'Yes' : 'No',
          paidDate
        ];
      } else {
        return [
          ref.id,
          ref.referrer?.full_name || 'N/A',
          ref.referrer?.email || 'N/A',
          ref.profile?.full_name || 'N/A',
          ref.profile?.email || 'N/A',
          convertedDate,
          ref.status,
          `£${ref.commission_amount?.toFixed(2) || '0.00'}`,
          `£${ref.organisation_commission?.toFixed(2) || '0.00'}`,
          `£${ref.member_commission?.toFixed(2) || '0.00'}`,
          ref.commission_paid ? 'Yes' : 'No',
          paidDate
        ];
      }
    });

    // Build CSV string
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    downloadFile(csv, 'text/csv', 'payout-export.csv');
  };

  const exportToJSON = (data: any[]) => {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'application/json', 'payout-export.json');
  };

  const downloadFile = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <FileSpreadsheet className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Export Payout Data</h2>
          <p className={styles.subtitle}>
            Download commission records for accounting and tax purposes
          </p>
        </div>
      </div>

      {message && (
        <div className={styles.message}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className={styles.form}>
        {/* Date Range Filter */}
        <div className={styles.formRow}>
          <label className={styles.label}>
            <Calendar size={18} />
            Date Range
          </label>
          <UnifiedSelect
            value={dateRange}
            onChange={(value) => setDateRange(value as DateRange)}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'this-month', label: 'This Month' },
              { value: 'last-month', label: 'Last Month' },
              { value: 'this-year', label: 'This Year' },
              { value: 'custom', label: 'Custom Range' }
            ]}
            placeholder="Select date range"
          />
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className={styles.dateRange}>
            <div className={styles.formRow}>
              <label className={styles.label}>Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>
        )}

        {/* Payout Status Filter */}
        <div className={styles.formRow}>
          <label className={styles.label}>
            <Filter size={18} />
            Payout Status
          </label>
          <UnifiedSelect
            value={payoutStatus}
            onChange={(value) => setPayoutStatus(value as PayoutStatus)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending Only' },
              { value: 'paid', label: 'Paid Only' }
            ]}
            placeholder="Select status"
          />
        </div>

        {/* Export Format */}
        <div className={styles.formRow}>
          <label className={styles.label}>Export Format</label>
          <div className={styles.formatToggle}>
            <button
              className={`${styles.formatButton} ${format === 'csv' ? styles.active : ''}`}
              onClick={() => setFormat('csv')}
            >
              CSV
            </button>
            <button
              className={`${styles.formatButton} ${format === 'json' ? styles.active : ''}`}
              onClick={() => setFormat('json')}
            >
              JSON
            </button>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className={styles.exportButton}
        >
          {exporting ? (
            <>Exporting...</>
          ) : (
            <>
              <Download size={20} />
              Export Data
            </>
          )}
        </button>
      </div>

      {/* Info Section */}
      <div className={styles.info}>
        <p className={styles.infoText}>
          {memberId
            ? 'Export includes your personal commission earnings and referral history.'
            : 'Export includes all team member referrals and commission breakdowns.'}
        </p>
        <p className={styles.infoText}>
          Use this data for tax reporting, accounting reconciliation, or performance analysis.
        </p>
      </div>
    </div>
  );
}
