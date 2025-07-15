'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Referral, ColumnDef } from '@/types';

// Import our full suite of reusable components
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import { DataTable } from '@/app/components/ui/table/DataTable';
import Tabs from '@/app/components/ui/Tabs';
import StatusBadge from '@/app/components/ui/StatusBadge';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

const mockReferrals: Referral[] = [
    { id: 1, date: '2025-05-20', seeker: '-', agent: 'A1-JS123456', provider: 'Tutorly', type: 'Course', channel: 'Web', amount: 50.00, status: 'Open' },
    { id: 2, date: '2025-05-21', seeker: 'john.d@example.com', agent: 'A1-JS123456', provider: 'SaaSify', type: 'Subscription', channel: 'Email', amount: 29.99, status: 'Shared' },
    { id: 3, date: '2025-05-22', seeker: 'a.long.email@example.com', agent: 'A1-JS123456', provider: 'DesignCo', type: 'Service', channel: 'QR Code', amount: 150.00, status: 'Visited' },
    { id: 4, date: '2025-05-23', seeker: 'jane.s@example.com', agent: 'A1-JS123456', provider: 'LearnHub', type: 'Course', channel: 'Web', amount: 99.00, status: 'Signed Up' },
    { id: 5, date: '2025-05-24', seeker: 'mike.r@example.com', agent: 'A1-JS123456', provider: 'Cleanly', type: 'Service', channel: 'WhatsApp', amount: 75.00, status: 'Booked' },
    { id: 6, date: '2025-05-25', seeker: 'sara.k@example.com', agent: 'A1-JS123456', provider: 'SaaSify', type: 'Subscription', channel: 'Web', amount: 29.99, status: 'Accepted' },
    { id: 7, date: '2025-05-26', seeker: 'tim.b@example.com', agent: 'A1-JS123456', provider: 'DesignCo', type: 'Service', channel: 'QR Code', amount: 150.00, status: 'Declined' },
    { id: 8, date: '2025-05-25', seeker: 'sara.k@example.com', agent: 'A1-JS123456', provider: 'SaaSify', type: 'Subscription', channel: 'Web', amount: 3.00, status: 'Paid' },
    { id: 9, date: '2025-05-27', seeker: 'olivia.p@example.com', agent: 'A1-JS123456', provider: 'LearnHub', type: 'Course', channel: 'Web', amount: 9.90, status: 'Pending' },
    { id: 10, date: '2025-05-28', seeker: 'liam.h@example.com', agent: 'A1-JS123456', provider: 'Tutorly', type: 'Course', channel: 'Email', amount: 5.00, status: 'Failed' },
    { id: 11, date: '2025-06-01', seeker: 'chloe.m@example.com', agent: 'A1-JS123456', provider: 'Artisan Goods', type: 'Product', channel: 'Web', amount: 12.50, status: 'Paid' },
];

interface TabOption {
  id: string;
  label: string;
}

const ReferralActivityPage = () => {
  const [activeTab, setActiveTab] = useState('generates');

  const columns: ColumnDef<Referral>[] = [
    { header: 'Date', accessorKey: 'date', responsiveClass: 'mobile', cell: (value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
    { header: 'Seeker', accessorKey: 'seeker', responsiveClass: 'mobile' },
    { header: 'Agent', accessorKey: 'agent', responsiveClass: 'desktop', cell: (value) => <Link href={`/agents/${value}`}>{value}</Link> },
    { header: 'Provider', accessorKey: 'provider', responsiveClass: 'tablet' },
    { header: 'Link', accessorKey: 'id', responsiveClass: 'desktop', cell: () => <a href="#">View</a> },
    { header: 'Channel', accessorKey: 'channel', responsiveClass: 'desktop' },
    { header: 'Type', accessorKey: 'type', responsiveClass: 'desktop' },
    { header: 'Amount', accessorKey: 'amount', responsiveClass: 'mobile', cell: (value) => `£${Number(value).toFixed(2)}` },
    { header: 'Status', accessorKey: 'status', responsiveClass: 'mobile', cell: (value) => <StatusBadge status={value} /> },
    { header: 'Action', accessorKey: 'id', responsiveClass: 'desktop', cell: () => <Button variant="secondary" fullWidth={false} style={{height: '32px', fontSize: '12px', padding: '0 16px'}}>Details</Button> },
  ];

  const tabOptions: TabOption[] = [
    { id: 'generates', label: 'Generates' },
    { id: 'shares', label: 'Shares' },
    { id: 'converts', label: 'Converts' },
    { id: 'rewards', label: 'Rewards' },
  ];

  const filteredData = useMemo(() => {
    const agentId = 'A1-JS123456';
    const myReferrals = mockReferrals.filter(r => r.agent === agentId);  
    
    switch (activeTab) {
      case 'generates': return myReferrals.filter(r => ['Open'].includes(r.status));
      case 'shares': return myReferrals.filter(r => ['Shared', 'Visited'].includes(r.status));
      case 'converts': return myReferrals.filter(r => ['Signed Up', 'Booked', 'Accepted'].includes(r.status));
      case 'rewards': return myReferrals.filter(r => ['Pending', 'Paid', 'Failed', 'Declined'].includes(r.status));
      default: return [];
    }
    // CORRECTED: Added mockReferrals to satisfy the linter and ensure future robustness
  }, [activeTab]);

  return (
    <Container>
      <PageHeader title="Referral Activity" />
      <div className={styles.activityCard}>
        <Tabs tabs={tabOptions} activeTab={activeTab} onTabChange={setActiveTab} />
        <DataTable columns={columns} data={filteredData} />
      </div>
    </Container>
  );
};

export default ReferralActivityPage;