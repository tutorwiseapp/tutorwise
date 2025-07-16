'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { Referral, ColumnDef } from '@/types';
import { useAuth } from '@/app/components/auth/AuthProvider';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import { DataTable } from '@/app/components/ui/table/DataTable';
import Tabs from '@/app/components/ui/Tabs';
import StatusBadge from '@/app/components/ui/StatusBadge';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

// --- THIS IS THE FIX ---
// 1. Define the shape of the data coming from our API
type ClickLogEntry = {
  id: number;
  created_at: string;
  agent_id: string;
  destination_url: string;
  channel_origin: string | null;
};

// Sample data for guiding new users
const sampleReferrals: Referral[] = [
    { id: 1, date: new Date().toISOString(), seeker: '-', agent: 'YourAgentID', provider: 'Example.com', type: 'Link', channel: 'Web', amount: 0, status: 'Open' },
];

interface TabOption { id: string; label: string; }

const ReferralActivityPage = () => {
  const [activeTab, setActiveTab] = useState('generates');
  const [activity, setActivity] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchActivity = async () => {
      if (!user) {
          setIsLoading(false);
          return;
      }
      
      setIsLoading(true);
      try {
        const response = await fetch('/api/activity');
        if (!response.ok) { throw new Error('Failed to fetch activity data.'); }

        // 2. Tell TypeScript to expect an array of our new type
        const data: ClickLogEntry[] = await response.json();
        
        // 3. The `log` parameter is now strongly typed, not 'any'
        const formattedData: Referral[] = data.map((log) => ({
            id: log.id,
            date: log.created_at,
            seeker: 'Guest',
            agent: log.agent_id,
            provider: new URL(log.destination_url).hostname,
            type: 'Link',
            channel: log.channel_origin || 'Web',
            amount: 0,
            status: 'Open'
        }));

        setActivity(formattedData);
      } catch (error) {
        console.error(error);
        setActivity([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [user]);

  // Your column definition remains perfect.
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

  const displayedData = useMemo(() => {
    // This logic is now cleaner. If there's real activity, use it.
    // If not, and the user isn't loading, show the sample data.
    if (activity.length > 0) {
      // Filter the real data
      switch (activeTab) {
        case 'generates': return activity.filter(r => ['Open'].includes(r.status));
        default: return activity; 
      }
    } else {
      // Filter the sample data
       switch (activeTab) {
        case 'generates': return sampleReferrals.filter(r => ['Open'].includes(r.status));
        default: return []; // Show nothing on other tabs if no real data
      }
    }
  }, [activeTab, activity]);

  return (
    <Container>
      <PageHeader title="My Activity" subtitle="Track the lifecycle of your referral links." />
      <div className={styles.activityCard}>
        <Tabs tabs={tabOptions} activeTab={activeTab} onTabChange={setActiveTab} />
        {isLoading ? (
          <p style={{ textAlign: 'center', padding: '4rem' }}>Loading activity...</p>
        ) : (
          <DataTable columns={columns} data={displayedData} />
        )}
      </div>
    </Container>
  );
};

export default ReferralActivityPage;