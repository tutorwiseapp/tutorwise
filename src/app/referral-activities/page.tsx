/*
 * Filename: src/app/referral-activities/page.tsx
 * Purpose: Displays a user's referral activity, filterable by status.
 *
 * Change History:
 * C002 - 2025-07-20 : 15:15 - Aligned mock data and columns with the canonical Referral interface.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-20 : 15:15
 * Requirement ID (optional): VIN-A-003
 *
 * Change Summary:
 * Updated the `mockReferrals` data and the `DataTable` column definitions to strictly conform to the
 * canonical `Referral` interface from `src/types/index.ts`. Property names were changed to snake_case
 * (e.g., `date` -> `created_at`). This resolves the TypeScript build error and ensures data consistency.
 *
 * Impact Analysis:
 * This change fixes a critical deployment blocker. It brings this page into alignment with the
 * application's official data contract, making it more robust.
 *
 * Dependencies: "react", "next/link", "@/types", and various UI components.
 */
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

// Mock data now perfectly matches the `Referral` interface from `src/types/index.ts`
const mockReferrals: Referral[] = [
    { id: 1, created_at: '2025-05-20', seeker_email: '-', agent_id: 'A1-JS123456', provider_id: 'Tutorly', channel_origin: 'Web', amount: 50.00, status: 'Open', destination_url: 'https://tutorly.example.com' },
    { id: 2, created_at: '2025-05-21', seeker_email: 'john.d@example.com', agent_id: 'A1-JS123456', provider_id: 'SaaSify', channel_origin: 'Email', amount: 29.99, status: 'Shared', destination_url: 'https://saasify.example.com' },
    { id: 3, created_at: '2025-05-22', seeker_email: 'a.long.email@example.com', agent_id: 'A1-JS123456', provider_id: 'DesignCo', channel_origin: 'QR Code', amount: 150.00, status: 'Visited', destination_url: 'https://designco.example.com' },
    { id: 4, created_at: '2025-05-23', seeker_email: 'jane.s@example.com', agent_id: 'A1-JS123456', provider_id: 'LearnHub', channel_origin: 'Web', amount: 99.00, status: 'Signed Up', destination_url: 'https://learnhub.example.com' },
    { id: 5, created_at: '2025-05-24', seeker_email: 'mike.r@example.com', agent_id: 'A1-JS123456', provider_id: 'Cleanly', channel_origin: 'WhatsApp', amount: 75.00, status: 'Booked', destination_url: 'https://cleanly.example.com' },
    { id: 6, created_at: '2025-05-25', seeker_email: 'sara.k@example.com', agent_id: 'A1-JS123456', provider_id: 'SaaSify', channel_origin: 'Web', amount: 29.99, status: 'Accepted', destination_url: 'https://saasify.example.com' },
    { id: 7, created_at: '2025-05-26', seeker_email: 'tim.b@example.com', agent_id: 'A1-JS123456', provider_id: 'DesignCo', channel_origin: 'QR Code', amount: 150.00, status: 'Declined', destination_url: 'https://designco.example.com' },
    { id: 8, created_at: '2025-05-25', seeker_email: 'sara.k@example.com', agent_id: 'A1-JS123456', provider_id: 'SaaSify', channel_origin: 'Web', amount: 3.00, status: 'Paid', destination_url: 'https://saasify.example.com' },
    { id: 9, created_at: '2025-05-27', seeker_email: 'olivia.p@example.com', agent_id: 'A1-JS123456', provider_id: 'LearnHub', channel_origin: 'Web', amount: 9.90, status: 'Pending', destination_url: 'https://learnhub.example.com' },
    { id: 10, created_at: '2025-05-28', seeker_email: 'liam.h@example.com', agent_id: 'A1-JS123456', provider_id: 'Tutorly', channel_origin: 'Email', amount: 5.00, status: 'Failed', destination_url: 'https://tutorly.example.com' },
    { id: 11, created_at: '2025-06-01', seeker_email: 'chloe.m@example.com', agent_id: 'A1-JS123456', provider_id: 'Artisan Goods', channel_origin: 'Web', amount: 12.50, status: 'Paid', destination_url: 'https://artisangoods.example.com' },
];

interface TabOption {
  id: string;
  label: string;
}

const ReferralActivityPage = () => {
  const [activeTab, setActiveTab] = useState('generates');

  // Column definitions now use the correct `accessorKey` properties from the Referral type
  const columns: ColumnDef<Referral>[] = [
    { header: 'Date', accessorKey: 'created_at', responsiveClass: 'mobile', cell: (value) => new Date(value as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
    { header: 'Seeker', accessorKey: 'seeker_email', responsiveClass: 'mobile' },
    { header: 'Agent', accessorKey: 'agent_id', responsiveClass: 'desktop', cell: (value) => <Link href={`/agents/${value}`}>{value as string}</Link> },
    { header: 'Provider ID', accessorKey: 'provider_id', responsiveClass: 'tablet' },
    { header: 'Channel', accessorKey: 'channel_origin', responsiveClass: 'desktop' },
    { header: 'Amount', accessorKey: 'amount', responsiveClass: 'mobile', cell: (value) => `£${Number(value).toFixed(2)}` },
    { header: 'Status', accessorKey: 'status', responsiveClass: 'mobile', cell: (value) => <StatusBadge status={value as string} /> },
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
    const myReferrals = mockReferrals.filter(r => r.agent_id === agentId);  
    
    switch (activeTab) {
      case 'generates': return myReferrals.filter(r => ['Open'].includes(r.status));
      case 'shares': return myReferrals.filter(r => ['Shared', 'Visited'].includes(r.status));
      case 'converts': return myReferrals.filter(r => ['Signed Up', 'Booked', 'Accepted'].includes(r.status));
      case 'rewards': return myReferrals.filter(r => ['Pending', 'Paid', 'Failed', 'Declined'].includes(r.status));
      default: return [];
    }
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