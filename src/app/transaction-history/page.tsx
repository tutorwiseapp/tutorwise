'use client';

// CORRECTED: Unnecessary hooks are removed from the import statement.
import type { ColumnDef } from '@/types'; 

// Import our components
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import { DataTable } from '@/app/components/ui/table/DataTable';
import StatusBadge from '@/app/components/ui/StatusBadge';
import styles from './page.module.css';

// Define the shape of a single transaction
interface Transaction {
  id: number;
  date: string;
  description: string;
  type: 'Reward' | 'Payout' | 'Fee';
  amount: number;
  status: 'Paid' | 'Pending' | 'Failed';
}

// Mock data for demonstration
const mockTransactions: Transaction[] = [
  { id: 1, date: '2025-06-15', description: 'Commission: LearnHub Course', type: 'Reward', amount: 9.90, status: 'Paid' },
  { id: 2, date: '2025-06-12', description: 'Commission: SaaSify Subscription', type: 'Reward', amount: 3.00, status: 'Paid' },
  { id: 3, date: '2025-06-10', description: 'Payout to Bank Account', type: 'Payout', amount: -12.90, status: 'Paid' },
  { id: 4, date: '2025-06-05', description: 'Commission: Cleanly Service', type: 'Reward', amount: 7.50, status: 'Pending' },
  { id: 5, date: '2025-05-28', description: 'Commission: Tutorly Referral', type: 'Reward', amount: 5.00, status: 'Failed' },
  { id: 6, date: '2025-05-20', description: 'Platform Service Fee', type: 'Fee', amount: -1.50, status: 'Paid' },
];

const TransactionHistoryPage = () => {
  // This page is currently display-only, so no user/auth check is needed yet.
  
  const columns: ColumnDef<Transaction>[] = [
    { 
      header: 'Date', 
      accessorKey: 'date',
      cell: (value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    },
    { 
      header: 'Description', 
      accessorKey: 'description',
    },
    { 
      header: 'Type', 
      accessorKey: 'type',
    },
    { 
      header: 'Amount', 
      accessorKey: 'amount',
      cell: (value) => (
        <span className={value > 0 ? styles.amountPositive : styles.amountNegative}>
          {value > 0 ? `+£${value.toFixed(2)}` : `-£${Math.abs(value).toFixed(2)}`}
        </span>
      )
    },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (value) => <StatusBadge status={value} />
    },
  ];

  return (
    <Container>
      <PageHeader title="Transaction History" />
      <div className={styles.card}>
        <DataTable columns={columns} data={mockTransactions} />
      </div>
    </Container>
  );
};

export default TransactionHistoryPage;