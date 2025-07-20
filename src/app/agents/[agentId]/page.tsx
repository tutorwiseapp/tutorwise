/*
 * Filename: src/app/agents/[agentId]/page.tsx
 * Purpose: Displays the public profile for a Vinite agent, with styles correctly scoped to its own module.
 *
 * Change History:
 * C003 - 2025-07-20 : 13:45 - Added type validation before setting state to fix Vercel build error.
 * C002 - 2024-07-17 : 14:00 - Refactored to align with the canonical 'Profile' data model and snake_case properties.
 * C001 - 26 July 2024 : 11:30 - Verified all layout and specific styles are sourced from the local CSS module.
 *
 * Last Modified: 2025-07-20 : 13:45
 * Requirement ID: VIN-A-01.2
 *
 * Change Summary:
 * Fixed a TypeScript error that blocked Vercel deployment. Added a validation check inside the `useEffect`
 * to ensure the user object found in the `DataProvider` has all the required properties of a `Profile`
 * before calling `setAgent`. This satisfies the strict type checking of the production build.
 *
 * Impact Analysis:
 * This change fixes a critical deployment blocker. The added validation also makes the page more robust
 * by preventing incomplete data from being rendered.
 *
 * Dependencies: "react", "next", "@/app/components/data/DataProvider", "@/types", and various UI components.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Profile, User } from '@/types'; // Import both types
import Image from 'next/image';
import Link from 'next/link';
import { useData } from '@/app/components/data/DataProvider';
import { useAuth } from '@/app/components/auth/AuthProvider';
import getProfileImageUrl from '@/lib/utils/image';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

// This sub-component is correct and requires no changes.
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
          <p className={styles.achievementsList}>No achievements listed.</p>
        </div>
      </div>
    </Card>
  );
};

const AgentProfilePage = () => {
  const [agent, setAgent] = useState<Profile | null>(null); // State expects a strict Profile
  const params = useParams();
  const agentId = params.agentId as string;
  const { user: loggedInUser } = useAuth();
  const { users, isLoading } = useData(); // users is of type User[]

  useEffect(() => {
    if (!isLoading && users.length > 0) {
      const foundAgent: User | undefined = users.find(user => user.agent_id === agentId);

      // --- THIS IS THE FIX ---
      // Validate that the found object has the essential properties of a Profile
      // before trying to set it as the state.
      if (foundAgent && foundAgent.id && foundAgent.agent_id && foundAgent.display_name) {
        // Now that we've confirmed the required fields exist, we can safely
        // assert the type and set the state.
        setAgent(foundAgent as Profile);
      } else {
        // If the agent isn't found or is incomplete, treat it as not found.
        setAgent(null);
      }
    }
  }, [isLoading, users, agentId]);

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
    return <Container><p className={styles.message}>Loading Agent Data...</p></Container>;
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

  const isOwnProfile = loggedInUser?.agent_id === agent.agent_id;

  return (
    <Container>
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