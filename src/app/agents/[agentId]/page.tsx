/**
 * Filename: src/app/agents/[agentId]/page.tsx
 * Purpose: Displays the public profile for a Vinite agent, with styles correctly scoped to its own module.
 *
 * Change History:
 * C002 - 2024-07-17 : 14:00 - Refactored to align with the canonical 'Profile' data model and snake_case properties.
 * C001 - 26 July 2024 : 11:30 - Verified all layout and specific styles are sourced from the local CSS module.
 *
 * Last Modified: 2024-07-17
 * Requirement ID: VIN-A-01.2
 * Change Summary: This version has been updated to use the 'Profile' interface as the single source of truth for user data. All property access now uses snake_case (e.g., agent.display_name) to align with the database schema and our data contract (VIN-001).
 * Impact Analysis: This brings the component into full compliance with our architecture, ensuring it will work seamlessly with both the mock DataProvider and the future live backend.
 * Dependencies: "react", "next", "@/app/components/auth/DataProvider", various UI components.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Profile } from '@/types'; // --- FIX: Import Profile, not User
import Image from 'next/image';
import Link from 'next/link';
import { useData } from '@/app/components/data/DataProvider'; // --- FIX: Corrected import path
import { useAuth } from '@/app/components/auth/AuthProvider';
import getProfileImageUrl from '@/lib/utils/image';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

// Self-contained sub-component for the left panel, now using the Profile interface
const PublicProfileCard = ({ agent, isOwnProfile }: { agent: Profile, isOwnProfile: boolean }) => { // --- FIX: Prop type is Profile
  return (
    <Card className={styles.profileCard}>
      {/* --- FIX: Use snake_case properties --- */}
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
          {/* 'achievements' is not a field in our final Profile model, so it's removed for now. It can be added back if needed. */}
          <p className={styles.achievementsList}>No achievements listed.</p>
        </div>
      </div>
    </Card>
  );
};

const AgentProfilePage = () => {
  const [agent, setAgent] = useState<Profile | null>(null); // --- FIX: State is Profile
  const params = useParams();
  const agentId = params.agentId as string;
  const { user: loggedInUser } = useAuth();
  const { users, isLoading } = useData();

  useEffect(() => {
    if (!isLoading && users.length > 0) {
      // --- FIX: Find user by agent_id (snake_case) ---
      const foundAgent = users.find(user => user.agent_id === agentId);
      setAgent(foundAgent || null);
    }
  }, [isLoading, users, agentId]);

  const handleShare = (platform: 'whatsapp' | 'linkedin') => {
    if (!agent) return;
    // --- FIX: Use snake_case property ---
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

  // --- FIX: Use snake_case property for comparison ---
  const isOwnProfile = loggedInUser?.agent_id === agent.agent_id;

  // Mock data for right-panel cards
  const activities = [
    { desc: "Generated a new link for", provider: "LearnHub", context: "" },
    { desc: "A referral for", provider: "SaaSify", context: "resulted in a new client!" },
  ];

  return (
    <Container>
      <div className={styles.profileGrid}>
        <aside>
          <PublicProfileCard agent={agent} isOwnProfile={isOwnProfile} />
        </aside>
        
        <main>
          {/* ... Your new UI cards remain here ... */}
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
              <Button variant="secondary">Contact Me</Button> {/* This would need a mailto: link */}
            </div>
          </Card>
          
          <Card className={styles.contentCard}>
            <h3>Recent Activity</h3>
            {/* ... */}
          </Card>

          <Card className={styles.contentCard}>
            <h3>Statistics</h3>
            <div className={styles.statsList}>
              <div className={styles.statItem}>
                <span>Member Since</span>
                <span className={styles.value}>
                  {/* --- FIX: Use snake_case property --- */}
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