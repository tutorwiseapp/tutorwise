'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Card from '@/app/components/ui/Card';
import FormGroup from '@/app/components/ui/form/FormGroup';
import Input from '@/app/components/ui/form/Input';
import Button from '@/app/components/ui/Button';
import Message from '@/app/components/ui/Message';
import styles from './page.module.css'; // Now importing

interface FoundReward { id: number; destination_url: string; created_at: string; }

const ClaimRewardsPage = () => {
  const [agentId, setAgentId] = useState('');
  const [foundRewards, setFoundRewards] = useState<FoundReward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchAttempted, setSearchAttempted] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSearchAttempted(true);
    setFoundRewards([]);

    const { data, error: dbError } = await supabase.from('ClickLog').select('id, destination_url, created_at').eq('agent_id', agentId.trim());
    setIsLoading(false);

    if (dbError) { setError('An error occurred.'); } 
    else if (data) { setFoundRewards(data); }
  };

  return (
    <Container>
      <PageHeader title="Claim Your Rewards" subtitle="Enter your temporary Agent ID to find pending rewards." />
      <Card className={styles.card}>
        <form onSubmit={handleSearch}>
          <FormGroup label="Temporary Agent ID" htmlFor="agentId"><Input id="agentId" type="text" value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="e.g., T1-GU123456" required /></FormGroup>
          <Button type="submit" variant="primary" fullWidth disabled={isLoading}>{isLoading ? 'Searching...' : 'Find My Rewards'}</Button>
        </form>
      </Card>
      {searchAttempted && !isLoading && (
        <div className={styles.resultsContainer}>
          {foundRewards.length > 0 ? (
            <Card>
              <h3 className={styles.resultsHeader}>We Found {foundRewards.length} Reward(s) for {agentId}:</h3>
              <ul className={styles.rewardList}>{foundRewards.map(reward => (<li key={reward.id} className={styles.rewardItem}><p><strong>Reward For:</strong> {reward.destination_url}</p><p><strong>Date:</strong> {new Date(reward.created_at).toLocaleString()}</p></li>))}</ul>
              <div className={styles.claimAction}><p>Please sign up to claim these rewards.</p><Link href={`/signup?claimId=${agentId}`}><Button variant='primary'>Sign Up to Claim</Button></Link></div>
            </Card>
          ) : ( <Message type="warning"><strong>No rewards found for {agentId}.</strong></Message> )}
        </div>
      )}
      {error && <Message type="error">{error}</Message>}
    </Container>
  );
};
export default ClaimRewardsPage;