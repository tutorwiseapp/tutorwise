/*
 * Filename: src/app/agents/[agentId]/page.tsx
 * Purpose: Displays the public profile for a Vinite agent, fetching live data from the backend.
 * Change History:
 * C006 - 2025-08-08 : 18:00 - Restructured JSX to create the definitive two-column layout.
 * C005 - 2025-08-08 : 17:00 - Definitive fix to restore correct layout and use Clerk's `useUser` hook.
 * C004 - 2025-07-22 : 16:30 - Refactored to fetch live data from the new API endpoint.
 * Last Modified: 2025-08-08 : 18:00
 * Requirement ID: VIN-C-03.3
 * Change Summary: The JSX has been restructured to use a standard `<aside>` and `<main>` element structure. This allows the CSS grid to correctly position the profile card on the left and the action cards on the right, creating the desired two-column layout that matches the private profile page.
 * Impact Analysis: This change fixes the UI layout, creating a consistent and professional look for the public profile page.
 * Dependencies: "react", "next/navigation", "next/link", "@clerk/nextjs", "@/types", and various VDL UI components.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Profile } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import getProfileImageUrl from '@/lib/utils/image';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

// This is a self-contained presentational component and does not need to change.
const PublicProfileCard = ({ agent, isOwnProfile }: { agent: Profile, isOwnProfile: boolean }) => {
  return (
    <Card className={styles.profileCard}>
      <div className={styles.coverPhoto} style={{ backgroundImage: agent.cover_photo_url ? `url(${agent.cover_photo_url})` : 'none' }} />
      <Image
        src={getProfileImageUrl(agent)}
        alt={`${agent.display_name}'s profile picture`}
        width={150} height={150}
        className={styles.profileAvatar}
      />
      <div className={styles.profileBody}>
        <h2 className={styles.profileName}>{agent.display_name}</h2>
        <p className={styles.profileId}>{agent.agent_id}</p>
        {isOwnProfile && <Link href="/profile" className={styles.editProfileLink}>Edit Profile</Link>}
        
        <hr className={styles.detailsDivider} />
        <div className={`${styles.detailsSection} ${styles.noPaddingTop}`}>
          <h3>About</h3>
          <p className={styles.profileBio}>{agent.bio || 'No bio provided.'}</p>
        </div>
        
        <hr className={styles.detailsDivider} />
        <div className={styles.detailsSection}>
          <h3>Specialties</h3>
          <div className={styles.tagContainer}>
            {agent.categories && agent.categories.length > 0 ? agent.categories.split(',').map(cat => (
              <span key={cat.trim()} className={styles.tag}>{cat.trim()}</span>
            )) : <p className={styles.noDataText}>Not specified.</p>}
          </div>
        </div>

        <hr className={styles.detailsDivider} />
        <div className={styles.detailsSection}>
          <h3>Achievements</h3>
          <p className={styles.achievementsList}>{agent.achievements || 'No achievements listed.'}</p>
        </div>
      </div>
    </Card>
  );
};

const AgentProfilePage = () => {
  const [agent, setAgent] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const agentId = params.agentId as string;
  const { user: loggedInUser } = useUser();

  useEffect(() => {
    if (!agentId) {
        setIsLoading(false);
        return;
    };

    const fetchAgentProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (!response.ok) {
          throw new Error('Agent profile not found.');
        }
        const data: Profile = await response.json();
        setAgent(data);
      } catch (error) {
        console.error("Failed to fetch agent profile:", error);
        setAgent(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgentProfile();
  }, [agentId]);

  const handleShare = (platform: 'whatsapp' | 'linkedin') => {
    if (!agent) return;
    const text = `Check out ${agent.display_name}'s Vinite referral profile: ${window.location.href}`;
    let url = '';
    if (platform === 'whatsapp') {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    }
    window.open(url, '_blank');
  };

  if (isLoading) {
    return <Container><p className={styles.message}>Loading Agent Profile...</p></Container>;
  }
  
  if (!agent) {
    return (
      <Container>
        <div className={styles.message}>
          <h1>Agent Not Found</h1>
          <p>The agent with ID <strong>{agentId}</strong> could not be found.</p>
        </div>
      </Container>
    );
  }

  const isOwnProfile = loggedInUser?.publicMetadata?.agent_id === agent.agent_id;

  return (
    <Container>
      {/* --- THIS IS THE FIX: Applying the grid and structuring with aside/main --- */}
      <div className={styles.profileGrid}>
        <aside>
          <PublicProfileCard agent={agent} isOwnProfile={isOwnProfile} />
        </aside>
        
        <main>
          <Card className={styles.contentCard}>
            <h3>Actions</h3>
            <div className={styles.actionsGrid}>
              <Button variant="primary">Refer Me</Button>
              <Button variant="primary">Reward Me</Button>
            </div>
          </Card>
          <Card className={styles.contentCard}>
            <h3>Shares</h3>
            <div className={styles.sharesGrid}>
              <Button variant="secondary" onClick={() => handleShare('whatsapp')}>Share on WhatsApp</Button>
              <Button variant="secondary" onClick={() => handleShare('linkedin')}>Share on LinkedIn</Button>
              <Button variant="secondary">Contact Me</Button>
            </div>
          </Card>
          <Card className={styles.contentCard}>
            <h3>Statistics</h3>
            <div className={styles.statsList}>
              <div className={styles.statItem}>
                <span>Member Since</span>
                <span className={styles.value}>
                  {agent.created_at ? new Date(agent.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' }) : 'N/A'}
                </span>
              </div>
              <div className={styles.statItem}>
                <span>Total Referrals</span>
                <span className={styles.value}>128</span>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </Container>
  );
};

export default AgentProfilePage;